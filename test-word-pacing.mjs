import assert from 'node:assert/strict';
import {TypingEngine,settings} from './slow-type/engine.js';
import {clock} from './test-support.mjs';
function rig({options={},random=()=>0.5}={}){
 const time=clock(),events=[];
 const io={attach:async()=>{},detach:async()=>{},changed:()=>{},ready:async()=>true,
   insert:async(_,c)=>events.push({c,at:time.now()})};
 const e=new TypingEngine(io,{...time,random});
 return {e,time,events,get text(){return events.map(x=>x.c).join('');},
   start:text=>e.start({tabId:1,text,options:{wpm:60,paragraphPause:0,sectionMode:false,variability:0,typoRate:0,wordPacing:true,wordPause:0.4,...options}})};
}
{
 const r=rig();await r.start('cat dog');assert.equal(r.e.snapshot().etaSeconds,7);
 await r.time.advance(5375);assert.equal(r.text,'cat ');assert.equal(r.e.state,'word');
 await r.time.advance(524);assert.equal(r.text,'cat ');await r.time.advance(1);assert.equal(r.text,'cat d');
 await r.time.advance(250);assert.equal(r.text,'cat dog');assert.equal(r.e.state,'done');assert.equal(r.e.snapshot().etaSeconds,0);
 assert.deepEqual(r.events.map(x=>x.at),[5000,5125,5250,5375,5900,6025,6150]);
}
{
 const r=rig();await r.start('cat    dog');await r.time.advance(10000);
 assert.equal(r.text,'cat    dog');assert.equal(r.e.wordGaps.size,1);
 const d=r.events.find(x=>x.c==='d');assert.equal(d.at-r.events[6].at,525);
}
{
 const r=rig();await r.start('  satu dua\n  tiga\n\n🙂 empat');await r.time.advance(20000);
 assert.equal(r.text,'  satu dua\n  tiga\n\n🙂 empat');assert.equal(r.e.wordGaps.size,2);
}
{
 const r=rig({options:{wordPacing:false}});await r.start('cat dog');await r.time.advance(7000);
 assert.deepEqual(r.events.map(x=>x.at),[5000,5200,5400,5600,5800,6000,6200]);
}
{
 const r=rig();await r.start('a b');await r.time.advance(5125);r.e.configure({wordPause:1});
 await r.time.advance(1124);assert.equal(r.text,'a ');await r.time.advance(1);assert.equal(r.text,'a b');
}
{
 const r=rig();await r.start('a b');await r.time.advance(5125);r.e.configure({wordPacing:false});
 await r.time.advance(200);assert.equal(r.text,'a b');
}
{
 const r=rig();await r.start('a b');await r.time.advance(5125);r.e.pause();await r.time.advance(10000);
 assert.equal(r.text,'a ');r.e.resume();await r.time.advance(5600);assert.equal(r.text,'a b');
}
{
 const r=rig();await r.start('a b');await r.time.advance(5125);await r.e.stop();await r.time.advance(5000);
 assert.equal(r.text,'a ');assert.equal(r.e.state,'idle');
}
{
 const samples=[0.8,0.5,0.5,0.5,0.5,0.2,0.5,0.5];let n=0;
 const r=rig({options:{variability:80},random:()=>samples[n++]??0.5});await r.start('abcd ef');await r.time.advance(10000);
 const deltas=r.events.slice(1).map((x,i)=>x.at-r.events[i].at);
 assert.ok(deltas.slice(0,4).every(d=>Math.abs(d-170)<2),JSON.stringify(deltas));
 assert.ok(Math.abs(deltas[4]-525)<2);assert.ok(Math.abs(deltas[5]-80)<2);
}
{
 const r=rig({options:{paragraphPause:1,sectionMode:true}});await r.start('a b\n\nc d');await r.time.advance(10000);
 assert.equal(r.text,'a b\n\n');assert.equal(r.e.state,'section');r.e.resume();await r.time.advance(10000);assert.equal(r.text,'a b\n\nc d');
}
assert.equal(settings({wpm:75}).wordPacing,true);assert.equal(settings({wpm:75}).wordPause,0.4);
assert.throws(()=>settings({wordPause:4}),/word pause/);assert.throws(()=>settings({wordPacing:'on'}),/word pacing/);
console.log('PASS: word pacing — faster letters, one pause per word boundary, repeated spaces/Unicode/paragraphs, ETA, live adjustment, disable, pause/stop, word-level tempo, sections, and defaults.');
