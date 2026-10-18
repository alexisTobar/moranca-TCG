import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';
import fs from 'node:fs';
import vm from 'node:vm';
const mod = { exports: {} };
const source = ts.transpileModule(fs.readFileSync('src/lib/catalog-query.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInThisContext(`(function(exports){${source}\n})`)(mod.exports);
const {catalogPage,catalogPrice,paginationWindow} = mod.exports;
test('paginación rechaza fracciones, infinito, negativos y entradas malformadas', () => {
  for(const value of ['Infinity','1.5','NaN','-1','0','abc',undefined]) assert.equal(catalogPage(value),1);
  assert.equal(catalogPage('2'),2); assert.equal(catalogPage('999999999'),100000);
});
test('precio admite cero y rechaza valores fuera del entero de PostgreSQL', () => {
  assert.equal(catalogPrice('0'),0); assert.equal(catalogPrice('1000'),1000);
  for(const value of ['',undefined,'-1','1.5','Infinity','2147483648']) assert.equal(catalogPrice(value),undefined);
});
test('ventana paginada tiene tamaño acotado incluso con millones de páginas', () => {
  assert.deepEqual(paginationWindow(1,1),[1]);
  assert.deepEqual(paginationWindow(500000,1000000),[1,499998,499999,500000,500001,500002,1000000]);
  assert.deepEqual(paginationWindow(2,4),[1,2,3,4]);
});
