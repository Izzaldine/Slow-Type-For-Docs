import assert from 'node:assert/strict';
import {TypingEngine,settings} from './slow-type/engine.js';
import {clock,tick} from './test-support.mjs';
function rig({random=()=>0,typoRate=5,variability=0}={}){
 const time=clock(),events=[];let text='',epoch=0,focused=true;
 const io={attach:async()=>{},detach:async()=>{},changed:()=>{},ready:async()=>focused,
 insert:async(_,c)=>{text+=c;events.push({kind:'insert',c,at:time.now()});},
 correctionAnchor:()=>epoch,correctionSafe:async(_,anchor)=>focused&&anchor===epoch,
 backspace:async()=>{text=text.slice(0,-1);events.push({kind:'backspace',at:time.now()});}};
 const e=new TypingEngine(io,{...time,random});
 return {e,time,events,get text(){return text;},move(){epoch++;},blur(){focused=false;},focus(){focused=true;},
  start:(text='Cat')=>e.start({tabId:1,text,options:{wpm:60,paragraphPause:0,sectionMode:false,wordPacing:false,typoRate,variability}})};
}
{
 const r=rig();await r.start();await r.time.advance(5200);assert.equal(r.text,'Cs');assert.equal(r.e.state,'correcting');
 assert.equal(r.e.index,1);await r.time.advance(400);assert.equal(r.text,'Cat');assert.equal(r.e.state,'done');
 assert.equal(r.e.corrections,1);assert.equal(r.events.filter(e=>e.kind==='backspace').length,1);
}
{
 const r=rig({typoRate:0});await r.start('Cat');await r.time.advance(10000);assert.equal(r.text,'Cat');
 assert.equal(r.events.filter(e=>e.kind==='backspace').length,0);
}
{
 const r=rig();await r.start('A I 7 é é 🙂 \nXY');await r.time.advance(20000);
 assert.equal(r.text,'A I 7 é é 🙂 \nXY');assert.equal(r.e.corrections,0);
}
{
 const r=rig();await r.start();await r.time.advance(5200);r.e.pause();await r.time.advance(300);
 assert.equal(r.text,'Ca');assert.equal(r.e.state,'paused');assert.equal(r.e.index,2);
 r.e.resume();await r.time.advance(10000);assert.equal(r.text,'Cat');assert.equal(r.e.corrections,1);
}
{
 const r=rig();await r.start();await r.time.advance(5200);const stopped=r.e.stop();await r.time.advance(300);await stopped;
 assert.equal(r.text,'Ca');assert.equal(r.e.state,'idle');assert.equal(r.events.filter(e=>e.kind==='backspace').length,1);
}
{
 const r=rig();await r.start();await r.time.advance(5200);r.move();await r.time.advance(300);
 assert.equal(r.text,'Cs');assert.equal(r.e.state,'idle');assert.match(r.e.note,/Correction interrupted/);
 assert.equal(r.events.filter(e=>e.kind==='backspace').length,0);
}
{
 const r=rig();await r.start();await r.time.advance(5200);r.blur();r.e.pause();await r.time.advance(300);
 assert.equal(r.e.state,'idle');assert.match(r.e.note,/Correction interrupted/);assert.equal(r.text,'Cs');
}
{
 const r=rig();await r.start();await r.time.advance(5200);r.move();const stopped=r.e.stop();await r.time.advance(300);await stopped;
 assert.match(r.e.note,/Correction interrupted/);assert.equal(r.text,'Cs');
}
{
 const r=rig();await r.start('Caterpillar');await r.time.advance(5200);r.e.configure({typoRate:0});await r.time.advance(10000);
 assert.equal(r.text,'Caterpillar');assert.equal(r.e.corrections,1);
}
{
 const r=rig({typoRate:0,variability:80,random:()=>0});await r.start('ABCD');await r.time.advance(6000);
 assert.equal(r.text,'ABCD');assert.ok(Math.abs(r.events[1].at-r.events[0].at-40)<1e-8);
}
{
 const r=rig({typoRate:0,variability:80,random:()=>1});await r.start('ABCD');await r.time.advance(7000);
 assert.equal(r.text,'ABCD');assert.ok(Math.abs(r.events[1].at-r.events[0].at-360)<1e-8);
}
{
 const r=rig({typoRate:0,variability:80,random:()=>1});await r.start('ABC');await r.time.advance(5000);r.e.configure({variability:0});
 await r.time.advance(200);assert.equal(r.text,'AB');
}
{
 const old=settings({wpm:80,paragraphPause:1,sectionMode:false,wordPacing:false});assert.equal(old.typoRate,0);assert.equal(old.variability,0);
 assert.throws(()=>settings({typoRate:6}),/frequency/);assert.throws(()=>settings({variability:81}),/variation/);
}
await tick();console.log('PASS: variation — delay bounds/live updates; typo repair; original text; Unicode exclusion; pause/stop during correction; focus and cursor interruptions; disabling live; old preference migration.');
for(let seed=1;seed<=8;seed++){
 let n=seed;const random=()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};
 const r=rig({random,typoRate:5,variability:80});
 const source='Testing the typing variation and automatic corrections.\n\nMixed symbols: café, 🙂, 123, and CAPITAL letters.';
 await r.start(source);await r.time.advance(150000);assert.equal(r.e.state,'done');assert.equal(r.text,source);
}
console.log('PASS: eight seeded runs preserve the complete supplied text with mixed Unicode, punctuation and paragraph breaks.');
