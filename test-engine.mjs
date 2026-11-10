import assert from 'node:assert/strict';
import {TypingEngine,prepareText} from './slow-type/engine.js';
import {clock,tick} from './test-support.mjs';
function rig(overrides={}){
  const time=clock(),inserted=[];let detachments=0;
  const io={attach:async()=>{},detach:async()=>{detachments++;},ready:async()=>true,
    insert:async(_,c)=>inserted.push({c,at:time.now()}),changed:()=>{},...overrides};
  const e=new TypingEngine(io,time);
  return {e,time,io,inserted,get text(){return inserted.map(x=>x.c).join('');},get detachments(){return detachments;}};
}
const job=(text='ABC',options={})=>({tabId:1,text,options:{wpm:60,paragraphPause:0,sectionMode:false,wordPacing:false,...options}});
assert.deepEqual(prepareText('A\r\nB\rC\t👨‍👩‍👧‍👦é'),['A','\n','B','\n','C',' ',' ',' ',' ','👨‍👩‍👧‍👦','é']);
{
 const r=rig();await r.e.start(job('ABC'));await r.time.advance(4999);assert.equal(r.text,'');
 await r.time.advance(1);assert.equal(r.text,'A');await r.time.advance(400);assert.equal(r.text,'ABC');
 assert.equal(r.e.state,'done');assert.equal(r.detachments,1);assert.equal(r.e.snapshot().percent,100);assert.equal(r.e.job,null);
}
{
 const r=rig();await r.e.start(job('ABC'));await r.time.advance(5000);r.e.configure({wpm:120});
 await r.time.advance(99);assert.equal(r.text,'A');await r.time.advance(1);assert.equal(r.text,'AB');
 await r.time.advance(100);assert.equal(r.text,'ABC');
}
{
 const r=rig();await r.e.start(job('A\nB',{paragraphPause:2}));await r.time.advance(5200);
 assert.equal(r.e.state,'paragraph');assert.equal(r.text,'A\n');await r.time.advance(500);
 r.e.configure({paragraphPause:0.5});await r.time.advance(100);assert.equal(r.text,'A\nB');
}
{
 const r=rig();await r.e.start(job('A\n\nB\n\nC',{sectionMode:true}));await r.time.advance(10000);
 assert.equal(r.e.state,'section');assert.equal(r.text,'A\n\n');assert.equal(r.e.snapshot().sectionNumber,2);
 r.e.resume();await r.time.advance(10000);assert.equal(r.text,'A\n\nB\n\n');assert.equal(r.e.state,'section');
 r.e.resume();await r.time.advance(10000);assert.equal(r.text,'A\n\nB\n\nC');assert.equal(r.e.state,'done');
}
{
 const r=rig();await r.e.start(job('🙂\n  \nB',{sectionMode:true}));await r.time.advance(10000);
 assert.equal(r.e.state,'section');assert.equal(r.text,'🙂\n  \n');
}
{
 const r=rig();await r.e.start(job('A\nB',{paragraphPause:2}));
 assert.equal(r.e.snapshot().etaSeconds,8);await r.time.advance(5000);assert.equal(r.e.snapshot().etaSeconds,3);
 await r.time.advance(2200);assert.equal(r.e.snapshot().etaSeconds,0);
}
{
 const r=rig();await r.e.start(job());await r.time.advance(5000);r.e.pause();await r.time.advance(10000);
 assert.equal(r.text,'A');r.e.resume();await r.time.advance(5500);assert.equal(r.text,'ABC');
}
{
 const r=rig({ready:async()=>false});await r.e.start(job());await r.time.advance(6000);
 assert.equal(r.e.state,'paused');assert.equal(r.text,'');
}
{
 const r=rig();await r.e.start(job());await r.e.stop();await r.time.advance(10000);assert.equal(r.text,'');assert.equal(r.e.state,'idle');
}
{
 let release;const r=rig({insert:()=>new Promise(resolve=>release=resolve)});await r.e.start(job());await r.time.advance(5000);
 r.e.pause();release();await tick();assert.equal(r.e.index,1);assert.equal(r.e.state,'paused');
}
{
 let release;const r=rig({insert:()=>new Promise(resolve=>release=resolve)});await r.e.start(job());await r.time.advance(5000);
 const stop=r.e.stop();await assert.rejects(r.e.start(job()),/Stop the current/);release();await stop;assert.equal(r.e.index,0);
}
{
 let release;const r=rig({attach:()=>new Promise(resolve=>release=resolve)});const start=r.e.start(job());const stop=r.e.stop();
 release();await start;await stop;assert.equal(r.e.state,'idle');assert.equal(r.detachments,1);
}
{
 const r=rig({insert:async()=>{throw Error('disconnected');}});await r.e.start(job());await r.time.advance(5000);
 assert.equal(r.e.state,'idle');assert.match(r.e.note,/disconnected/);
}
{
 const r=rig();await assert.rejects(r.e.start(job(' ')),/Paste/);await assert.rejects(r.e.start(job('A',{wpm:0})),/speed/);
 assert.throws(()=>r.e.configure({paragraphPause:31}),/paragraph/);await assert.rejects(r.e.start(job('A'.repeat(100001))),/100,000/);
}
console.log('PASS: engine — Unicode, timing, live speed, adjustable paragraph delay, sections, whitespace separators, ETA, pause/resume, focus loss, cancellation, disconnects, validation.');
