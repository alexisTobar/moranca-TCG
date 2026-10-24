import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { Prisma } from '@prisma/client';
import { PGlite } from '@electric-sql/pglite';

function load(file, imports) {
  const mod={exports:{}};
  const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInThisContext(`(function(require,module,exports){${js}\n})`)(name=>{if (!(name in imports)) throw Error(name);return imports[name];},mod,mod.exports);
  return mod.exports;
}
test('catálogo SQL: agrupa por impresión, elige stock/precio real, filtra y pagina sin duplicados', async()=>{
  const db=new PGlite();
  try {
    await db.exec(`CREATE TYPE "ListingType" AS ENUM ('SINGLE','SEALED','DECK','ACCESSORY');
      CREATE TABLE "User"(id text primary key, active boolean, role text);
      CREATE TABLE "Listing"(id text primary key, game text, title text, "sellerId" text, stock int, "createdAt" timestamp default now(), price int, "offerPrice" int, "externalId" text, "setName" text, "cardNumber" text, type "ListingType", status text default 'ACTIVE', condition text default 'NM', language text default 'EN', description text, "accessoryCategory" text);
      CREATE TABLE "DeckCard"("listingId" text,name text);
      INSERT INTO "User" VALUES ('a',true,'SELLER'),('b',true,'SELLER'),('blocked',false,'SELLER'),('buyer',true,'BUYER');`);
    const insert=async(id,external,price,stock=1,seller='a',type='SINGLE',offer=null,set='Set A',title='Carta')=>db.query(`INSERT INTO "Listing"(id,game,title,"sellerId",stock,price,"offerPrice","externalId","setName","cardNumber",type) VALUES($1,'pokemon',$2,$3,$4,$5,$6,$7,$8,'01',$9::"ListingType")`,[id,title,seller,stock,price,offer,external,set,type]);
    await insert('a1','card-a',1000,2);
    await insert('b1','card-a',1500,3,'b','SINGLE',800);
    await insert('sold','card-a',10,0);
    await insert('blocked','card-a',1,5,'blocked');
    await insert('buyer','card-a',1,5,'buyer');
    await insert('other-set','card-b',900);
    await insert('box','card-a',200,'1','a','SEALED');
    await insert('deck','card-a',300,1,'a','DECK');
    await insert('sleeves',null,4500,1,'a','ACCESSORY');
    await insert('box2',null,6000,1,'b','ACCESSORY');
    await db.exec(`UPDATE "Listing" SET "accessoryCategory"='SLEEVES' WHERE id='sleeves'`);
    await insert('manual-a',null,700,1,'a');
    await insert('manual-b',null,600,2,'b');
    await insert('manual-other',null,500,1,'a','SINGLE',null,'Set B');
    const identity=load('src/lib/card-identity.ts',{'@prisma/client':{Prisma}});
    const prisma={
      $queryRaw:async q=>(await db.query(q.text,q.values)).rows,
      listing:{findMany:async({where})=> (await db.query('SELECT * FROM "Listing" WHERE id=ANY($1::text[])',[where.id.in])).rows}
    };
    const {catalogMarket}=load('src/lib/catalog-market.ts',{'server-only':{},'@prisma/client':{Prisma},'./db':{prisma},'./card-identity':identity,'./catalog':{LISTING_CARD_SELECT:{}}});
    const base={type:'SINGLE',sort:'precio-asc',page:1};
    const result=await catalogMarket(base);
    assert.equal(result.total,4);
    assert.deepEqual(result.listings.map(x=>x.id),['manual-other','manual-b','b1','other-set']);
    const group=result.listings.find(x=>x.id==='b1');
    assert.equal(group.market.stock,5);assert.equal(group.market.sellers,2);
    assert.equal(result.listings.find(x=>x.id==='manual-b').market.stock,3);
    assert.deepEqual((await catalogMarket({...base,type:'SEALED'})).listings.map(x=>x.id),['box']);
    assert.deepEqual((await catalogMarket({...base,type:'DECK'})).listings.map(x=>x.id),['deck']);
    assert.equal((await catalogMarket({...base,type:'ACCESSORY'})).total,2);
    assert.equal((await catalogMarket({...base,type:'ACCESSORY',game:'magic',language:'JP'})).total,2);
    assert.deepEqual((await catalogMarket({...base,type:'ACCESSORY',accessoryCategory:'SLEEVES'})).listings.map(x=>x.id),['sleeves']);
    assert.deepEqual((await catalogMarket({...base,min:750,max:850})).listings.map(x=>x.id),['b1']);
    assert.equal((await catalogMarket({...base,q:"'; DROP TABLE"})).total,0);
    assert.equal((await catalogMarket({...base,q:'%'})).total,0);
    assert.equal((await catalogMarket({...base,language:'ES'})).total,0);
    for(let i=0;i<26;i++) await insert('extra-'+i,'extra-'+i,2000+i);
    const page1=await catalogMarket(base),page2=await catalogMarket({...base,page:2});
    assert.equal(page1.total,30);assert.equal(page1.listings.length,24);assert.equal(page2.listings.length,6);
    assert.equal(new Set([...page1.listings,...page2.listings].map(x=>x.id)).size,30);
    assert.equal((await catalogMarket({...base,page:100000})).page,2);
  } finally {await db.close();}
});
