import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
function load(file, mocks = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const localRequire = name => {
    if (name in mocks) return mocks[name];
    if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name) + '.ts', mocks);
    return require(name);
  };
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`)(localRequire, module, module.exports);
  return module.exports;
}
const { listingSchema, listingBaseSchema } = load('src/lib/validators.ts');
const photo = '/api/uploads/example.jpg';
const base = { type: 'ACCESSORY', game: 'pokemon', title: 'Protectores · 100 unidades', price: 9900, accessoryCategory: 'SLEEVES', imageUrls: [photo] };

test('accesorios y fotos: valida categorías, cantidad de fotos y URLs', () => {
  assert.equal(listingSchema.parse(base).accessoryCategory, 'SLEEVES');
  assert.equal(listingSchema.parse({...base,game:undefined}).game, 'generic');
  assert.equal(listingSchema.safeParse({...base,description:'a'.repeat(501)}).success,false);
  assert.equal(listingSchema.safeParse({ ...base, accessoryCategory: 'INVALID' }).success, false);
  assert.equal(listingSchema.safeParse({ ...base, imageUrls: Array(11).fill(photo) }).success, false);
  for (const invalid of [null, '', 'javascript:alert(1)', '/private/file']) {
    assert.equal(listingSchema.safeParse({ ...base, imageUrls: [invalid] }).success, false);
  }
  assert.equal(listingBaseSchema.partial().parse({status:'PAUSED'}).imageUrls, undefined);
});

test('las fotos reales de una carta de API conservan imagen y externalId', () => {
  const card = listingSchema.parse({ ...base, type: 'SINGLE', accessoryCategory: null, externalId: 'card-1', imageUrl: 'https://example.com/catalog.jpg' });
  assert.equal(card.imageUrl, 'https://example.com/catalog.jpg');
  assert.deepEqual(card.imageUrls, [photo]);
  assert.equal(card.externalId, 'card-1');
});

test('pulsar el tipo ya seleccionado conserva identidad de API y datos del producto', () => {
  for (const type of ['SINGLE', 'ACCESSORY']) {
    const states = [];
    let cursor = 0;
    const react = { ...require('react'), useState: initial => {
      const index = cursor++;
      states[index] = initial;
      return [initial, next => { states[index] = typeof next === 'function' ? next(states[index]) : next; }];
    }, useMemo: compute => compute() };
    const { ListingForm } = load('src/components/ListingForm.tsx', {
      react, 'next/image': () => null, 'next/navigation': {useRouter: () => ({})},
      './CardSearch': {CardSearch: () => null}, './ImageUploader': {ImageUploader: () => null}, './ListingPhotos': {ListingPhotos: () => null},
      '@/lib/games': load('src/lib/games.ts'), '@/lib/format': {clp: String},
    });
    const tree = ListingForm({initial:{type,externalId:'card-1',condition:type === 'SINGLE' ? 'NM' : 'NEW',setName:'Set A',isFoil:true},sellers:[],isAdmin:false,currentUserId:'seller'});
    function findActive(node) {
      if (!node || typeof node !== 'object') return null;
      if (node.type === 'button' && node.props['aria-pressed'] === true) return node;
      return require('react').Children.toArray(node.props?.children).map(findActive).find(Boolean);
    }
    const before = states[0];
    findActive(tree).props.onClick();
    assert.equal(states[0], before);
  }
});

test('crear, editar y pausar persiste accesorios y fotos sin borrar adjuntos existentes', async () => {
  let stored;
  const listing = {
    create: async ({data}) => { stored = {id:'listing-1', ...data}; return {id:stored.id, slug:stored.slug}; },
    findUnique: async () => stored,
    update: async ({data}) => { for (const [k,v] of Object.entries(data)) if (v !== undefined) stored[k] = v; return {id:stored.id,slug:stored.slug}; },
  };
  const prisma = { listing, $transaction: async cb => cb({listing}) };
  const mocks = {
    '@/lib/listing-kind':load('src/lib/listing-kind.ts'), 'next/cache': {revalidatePath:()=>{},revalidateTag:()=>{}}, '@/lib/db': {prisma}, '@/lib/auth': { requireUser: async () => ({id:'seller', role:'SELLER'}), AuthError: class extends Error {} },
    '@/lib/validators': {listingSchema, listingBaseSchema}, '@/lib/catalog': {uniqueSlug: async () => 'protectores'},
    '@/lib/external-id': {normalizeExternalId: (_game,id) => id},
  };
  const { POST } = load('src/app/api/listings/route.ts', mocks);
  const { PATCH } = load('src/app/api/listings/[id]/route.ts', mocks);
  const request = body => new Request('http://localhost/api/listings', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await POST(request(base))).status,201);
  assert.equal(stored.type,'ACCESSORY'); assert.equal(stored.game,'generic'); assert.equal(stored.language,null); assert.equal(stored.imageUrl,photo); assert.deepEqual(stored.imageUrls,[photo]);
  const params = {params:Promise.resolve({id:stored.id})};
  assert.equal((await PATCH(request({status:'PAUSED'}),params)).status,200);
  assert.deepEqual(stored.imageUrls,[photo]);
  assert.equal((await PATCH(request({imageUrls:[]}),params)).status,200);
  assert.deepEqual(stored.imageUrls,[]);
  assert.equal((await POST(request({type:'DECK',game:'myl',title:'Deck construido',price:13000,deckCards:[]}))).status,400);
  for (const type of ['DECK','SEALED']) {
    const deckCards=type==='DECK'?[{name:'Carta de mi mazo',quantity:3}]:[];
    const response=await POST(request({type,game:'myl',title:'Mazo Guerrero formato Imperio',price:13000,stock:2,imageUrls:[photo],deckCards}));
    assert.equal(response.status,201);
    assert.equal(stored.type,type);
    assert.equal(stored.stock,2);
    assert.equal(stored.status,'ACTIVE');
    assert.equal(stored.deckCards?.create.length??0,deckCards.length);
    if(type==='DECK') {
      stored._count={deckCards:deckCards.length};
      assert.equal((await PATCH(request({deckCards:[]}),params)).status,400);
    }
  }
  stored.sellerId = 'other';
  assert.equal((await PATCH(request({imageUrls:[photo]}),params)).status,403);
});
