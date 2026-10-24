import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { Prisma } from '@prisma/client';
import { PGlite } from '@electric-sql/pglite';
const require = createRequire(import.meta.url);
function load(file, mocks = {}) {
  const module = {exports:{}};
  const source = ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`)(name => {
    if (name === 'server-only') return {};
    if (name in mocks) return mocks[name];
    if (name.startsWith('.')) return load(path.resolve(path.dirname(file),name)+'.ts',mocks);
    return require(name);
  }, module,module.exports);
  return module.exports;
}
const parsers = load('src/lib/news/page-parser.ts');
const feed = load('src/lib/news/feed-parser.ts');
const policy = load('src/lib/news/policy.ts');

test('agenda local solo importa TCG de Chile con fecha y enlace de inscripción', () => {
  const card = (country,product,title,date='25/10/2026') => `<article class="tournament-card" data-country="${country}" data-product="${product}" data-city="CL|Santiago"><h2>Torneo ${title}</h2><span>${date}</span><a href="/tournaments/test-${title}">Inscribirse</a></article>`;
  const result = parsers.parsePlayLatam(card('CL','TCG','local')+card('AR','TCG','otro')+card('CL','GO','digital')+card('CL','TCG','vencido','01/10/2026'),new Date('2026-10-24T12:00:00Z'));
  assert.equal(result.length,1);assert.equal(result[0].country,'CL');assert.equal(result[0].kind,'TOURNAMENT');assert.equal(result[0].link,'https://www.playlatam.net/tournaments/test-local');
});

test('páginas oficiales conservan la fecha, imagen y enlace propios del anuncio', () => {
  const pokemon = parsers.parsePokemonNews('<li class="example__Cards__item"><img src="/news/product.png" alt="Anuncio de prueba de JCC Pokémon"><p>23 de octubre de 2026</p><a href="https://www.pokemon.com/es/noticias/prueba">Más información</a></li>');
  assert.equal(pokemon.length,1);assert.equal(pokemon[0].imageUrl,'https://play.pokemon.com/news/product.png');assert.equal(pokemon[0].publishedAt.toISOString(),'2026-10-23T12:00:00.000Z');
  const onepiece = parsers.parseOnePieceNews('<li class="topicDetail row-4"><a href="/products/test.html"><img src="/images/test.webp"><span class="js_topicTit">New booster announced</span><dd class="topicDate">October 23, 2026</dd></a></li>');
  assert.equal(onepiece[0].link,'https://en.onepiece-cardgame.com/products/test.html');
  assert.equal(feed.parseFeed('<rss><item><title>Sin fecha</title><link>https://example.com/old</link></item></rss>').length,0);
  const rss = feed.parseFeed('<rss><item><title>Con imagen</title><link>https://example.com/article</link><pubDate>Fri, 23 Oct 2026 12:00:00 GMT</pubDate><media:thumbnail url="https://example.com/article.jpg"/></item></rss>');
  assert.equal(rss[0].imageUrl,'https://example.com/article.jpg');
  assert.equal(policy.newsImage('https://example.com/badge.png'),null);
});

test('traducción fallida o sin traducir no publica el texto inglés', async () => {
  const original = global.fetch;
  try {
    const {translateToSpanish} = load('src/lib/news/translate.ts');
    for (const [responseStatus,translatedText] of [[429,'QUOTA EXCEEDED'],[200,'New booster announced']]) {
      global.fetch = async () => Response.json({responseStatus,responseData:{translatedText}});
      assert.equal(await translateToSpanish('New booster announced'),null);
    }
    global.fetch = async () => Response.json({responseStatus:200,responseData:{translatedText:'Se anunció una nueva expansión'}});
    assert.equal(await translateToSpanish('New booster announced'),'Se anunció una nueva expansión');
  } finally {global.fetch=original;}
});

test('noticias SQL: Chile primero, luego Pokémon/One Piece; excluye eventos pasados y noticias sin verificar', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE TABLE "NewsItem"(id text,category text,title text,excerpt text,"imageUrl" text,"sourceName" text,"publishedAt" timestamptz,country text,kind text,"eventAt" timestamptz,"originalTitle" text);
      INSERT INTO "NewsItem" VALUES
      ('chile','GENERAL','Local','','','Organizador',now()-interval '3 days','CL','TOURNAMENT',now()+interval '3 days','Local'),
      ('op','ONEPIECE','Lanzamiento','','','Bandai',now()-interval '2 days',null,'RELEASE',null,'Release'),
      ('magic','MAGIC','Otro','','','Fuente',now()-interval '1 day',null,'NEWS',null,'Other'),
      ('old','POKEMON','Pasado','','','Fuente',now()-interval '1 day','CL','TOURNAMENT',now()-interval '1 day','Past'),
      ('legacy','MAGIC','Unverified English','','','Fuente',now()-interval '1 day',null,'NEWS',null,null);`);
    const {newsPage} = load('src/lib/news/query.ts',{'@prisma/client':{Prisma},'@/lib/db':{prisma:{$queryRaw:async query=>(await db.query(query.text,query.values)).rows}}});
    const result=await newsPage();assert.deepEqual(result.items.map(x=>x.id),['chile','op','magic']);assert.equal(result.total,3);
    assert.deepEqual((await newsPage({scope:'chile'})).items.map(x=>x.id),['chile']);
    assert.deepEqual((await newsPage({kind:'RELEASE'})).items.map(x=>x.id),['op']);
    assert.equal((await newsPage({category:"'; DROP TABLE"})).total,0);
  } finally {await db.close();}
});

test('enlaces antiguos no publican metadatos de noticias sin verificar, vencidas o con fecha futura', async () => {
  const {eligibleNewsWhere}=load('src/lib/news/query.ts',{'@/lib/db':{prisma:{}},'@prisma/client':{Prisma}});
  const now=new Date();
  const rows=[
    {id:'legacy',title:'Untranslated English',originalTitle:null,publishedAt:new Date(now-1000),eventAt:null},
    {id:'old',title:'Antigua',originalTitle:'Old',publishedAt:new Date(now-91*86400000),eventAt:null},
    {id:'expired',title:'Evento pasado',originalTitle:'Expired',publishedAt:new Date(now-1000),eventAt:new Date(now-1000)},
    {id:'future',title:'Fecha futura',originalTitle:'Future',publishedAt:new Date(+now+86400000),eventAt:null},
    {id:'verified',title:'Noticia en español',excerpt:'Resumen',originalTitle:'Verified',publishedAt:new Date(now-1000),eventAt:null},
  ];
  const prisma={newsItem:{findFirst:async({where})=>{
    assert.deepEqual(where.originalTitle,{not:null});assert.ok(where.publishedAt.gte);assert.ok(where.publishedAt.lte);assert.equal(where.OR[0].eventAt,null);
    return rows.find(row=>row.id===where.id&&row.originalTitle!==null&&row.publishedAt>=where.publishedAt.gte&&row.publishedAt<=where.publishedAt.lte&&(!row.eventAt||row.eventAt>=where.OR[1].eventAt.gte))??null;
  }}};
  const {generateMetadata}=load('src/app/(public)/noticias/[id]/page.tsx',{
    '@/lib/db':{prisma},'@/lib/news/query':{eligibleNewsWhere},'@/lib/catalog':{safeQuery:async(fn)=>fn()},
    '@/components/news/NewsImage':{NewsImage:()=>null},'@/lib/format':{timeAgo:()=>''},'@/lib/news/category':{newsCategoryLabel:String},
  });
  for(const row of rows) {
    const result=await generateMetadata({params:Promise.resolve({id:row.id})});
    assert.equal(result.title,row.id==='verified'?'Noticia en español':'Noticia no encontrada');
  }
});

test('cron autorizado respeta tres días y no duplica artículos al reintentar', async () => {
  const original=global.fetch;let fetches=0;const state={completedAt:null,leaseUntil:null,leaseToken:null};const items=new Map();
  const sync={upsert:async()=>state,updateMany:async({where,data})=>{
    if (where.leaseToken && where.leaseToken!==state.leaseToken) return {count:0};
    if (where.AND && ((state.completedAt && state.completedAt>where.AND[0].OR[1].completedAt.lte)||(state.leaseUntil && state.leaseUntil>new Date()))) return {count:0};
    Object.assign(state,data);return {count:1};
  }};
  const prisma={newsSyncState:sync,newsItem:{findUnique:async({where})=>items.get(where.sourceUrl),upsert:async({where,create,update})=>items.set(where.sourceUrl,items.has(where.sourceUrl)?{...items.get(where.sourceUrl),...update}:create),deleteMany:async()=>({count:0})}};
  const {POST}=load('src/app/api/cron/news/route.ts',{
    '@/lib/db':{prisma},'@/lib/news/feed-parser':feed,'@/lib/news/page-parser':parsers,'@/lib/news/policy':policy,
    '@/lib/news/translate':{translateToSpanish:async()=>{throw Error('Spanish source should not be translated');}},
    '@/lib/news/sources':{NEWS_SOURCES:[{name:'Prueba Chile',url:'https://example.com/rss',format:'rss',language:'es',country:'CL',category:'POKEMON',limit:4}]},
  });
  const previous=process.env.CRON_SECRET;process.env.CRON_SECRET='test-secret';
  try {
    global.fetch=async()=>{fetches++;return new Response(`<rss><item><title>Torneo Pokémon de prueba</title><link>https://example.com/event</link><pubDate>${new Date(Date.now()-3600000).toUTCString()}</pubDate><description>Inscripción en Chile</description></item></rss>`);};
    assert.equal((await POST(new Request('http://localhost'))).status,401);
    const request=()=>new Request('http://localhost',{headers:{authorization:'Bearer test-secret'}});
    assert.equal((await POST(request())).status,200);assert.equal(items.size,1);assert.equal(state.leaseToken,null);
    assert.equal((await (await POST(request())).json()).skipped,true);assert.equal(fetches,1);
    state.completedAt=new Date(state.completedAt.getTime()-policy.NEWS_INTERVAL_MS);
    assert.equal((await POST(request())).status,200);assert.equal(items.size,1);assert.equal(fetches,2);
  } finally {global.fetch=original;if(previous===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=previous;}
});
