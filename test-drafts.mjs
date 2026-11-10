import assert from 'node:assert/strict';
import {saveDraft,deleteDraft} from './slow-type/drafts.js';
let result=saveDrafts([],{name:' First ',text:'Hello'},()=> 'one');
function saveDrafts(...args){return saveDraft(...args);}
assert.equal(result.drafts[0].name,'First');
result=saveDraft(result.drafts,{name:'Second',text:'World'},()=> 'two');assert.equal(result.drafts.length,2);
result=saveDraft(result.drafts,{id:'one',name:'Renamed',text:'Changed'});assert.equal(result.drafts.length,2);
assert.equal(result.drafts[0].id,'one');assert.equal(result.drafts[0].text,'Changed');
const stored=JSON.parse(JSON.stringify(result.drafts));assert.deepEqual(stored,result.drafts);
assert.equal(deleteDraft(stored,'two').length,1);assert.equal(stored.length,2);
assert.throws(()=>saveDraft([],{name:'',text:'A'}),/name/);
assert.throws(()=>saveDraft([],{name:'A',text:' '}),/text/);
assert.throws(()=>saveDraft(Array(30).fill({id:'old'}),{name:'A',text:'A'}),/30/);
console.log('PASS: named drafts — create, rename/update, persistence round-trip, delete, limits.');
