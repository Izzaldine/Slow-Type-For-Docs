import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TypingEngine} from './slow-type/engine.js';
import {clock,tick} from './test-support.mjs';
const event=()=>({addListener(fn){this.fn=fn;}});
let instance,editorReady=true;const time=clock(),commands=[],storage={},sessionStorage={},delivered=[];
class TestEngine extends TypingEngine{constructor(io){super(io,time);instance=this;}}
const tab={id:1,active:true,url:'https://docs.google.com/document/d/test/edit',windowId:2};
const chrome={runtime:{id:'test',onMessage:event()},commands:{onCommand:event()},
 tabs:{get:async()=>tab,onActivated:event(),onUpdated:event(),onRemoved:event(),sendMessage:async(tabId,message)=>{delivered.push({tabId,message});}},
 windows:{get:async()=>({focused:false}),onFocusChanged:event()},
 scripting:{executeScript:async()=>{}},storage:{local:{get:async()=>storage,set:async v=>Object.assign(storage,v)},session:{get:async()=>sessionStorage,set:async v=>Object.assign(sessionStorage,v)}},
 debugger:{attach:async()=>{},detach:async()=>{},onDetach:event(),sendCommand:async(target,name,params)=>{
 commands.push({target,name,params});return {result:{value:editorReady}};}},
 action:{setBadgeText:async()=>{},setBadgeBackgroundColor:async()=>{}}};
const source=readFileSync(new URL('./slow-type/background.js',import.meta.url),'utf8').replace(/^import .*;\n/,'');
new Function('TypingEngine','chrome',source)(TestEngine,chrome);
const send=(type,extra={},sender={id:'test'})=>new Promise(resolve=>{
 const accepted=chrome.runtime.onMessage.fn({type,...extra},sender,resolve);if(!accepted)resolve(undefined);
});
const job=(text='ABC')=>({tabId:1,text,options:{wpm:60,paragraphPause:0,sectionMode:false,wordPacing:false}});
tab.url='https://evil.example/document/d/test/edit';assert.equal((await send('start',{job:job()})).ok,false);
tab.url='https://docs.google.com/document/d/test/edit';await send('start',{job:job('A\n🙂')});
assert.equal(commands.find(c=>c.name==='Emulation.setFocusEmulationEnabled').params.enabled,true);
await time.advance(6000);assert.equal(instance.state,'done');
assert.equal((await send('status')).state.panelAvailable,true);
assert.equal((await send('show-panel')).ok,true);
assert.ok(delivered.some(d=>d.tabId===1&&d.message.type==='slow-type-show'));
const input=commands.filter(c=>c.name.startsWith('Input.'));
assert.deepEqual(input.map(c=>[c.name,c.params.type,c.params.text]),[
 ['Input.dispatchKeyEvent','keyDown','A'],['Input.dispatchKeyEvent','keyUp',undefined],
 ['Input.dispatchKeyEvent','keyDown','\r'],['Input.dispatchKeyEvent','keyUp',undefined],['Input.insertText',undefined,'🙂']]);
assert.ok(input.every(c=>c.target.tabId===1));
assert.equal(commands.filter(c=>c.name==='Emulation.setFocusEmulationEnabled').at(-1).params.enabled,false);
await send('start',{job:job()});await time.advance(5000);assert.equal(instance.index,1);
chrome.tabs.onActivated.fn({tabId:7,windowId:9});await time.advance(200);assert.equal(instance.index,2);assert.equal(instance.state,'typing');
await send('opened');assert.equal(instance.state,'typing');
chrome.tabs.onActivated.fn({tabId:5,windowId:2});assert.equal(instance.state,'paused');
await time.advance(1000);assert.equal(instance.index,2);
chrome.commands.onCommand.fn('pause-resume');assert.equal(instance.state,'countdown');await time.advance(6000);assert.equal(instance.state,'done');
await send('start',{job:job()});editorReady=false;await time.advance(5000);assert.equal(instance.state,'paused');editorReady=true;
await send('configure',{options:{wpm:100,paragraphPause:3}});assert.equal(storage.options.wpm,100);
assert.equal((await send('configure',{options:{wpm:105}},{id:'test',tab:{id:1},frameId:0})).ok,true);
assert.equal(await send('configure',{options:{wpm:110}},{id:'test',tab:{id:9},frameId:0}),undefined);
assert.equal(await send('start',{job:job()},{id:'test',tab:{id:1},frameId:0}),undefined);
await send('stop');assert.equal(instance.state,'idle');
await send('start',{job:job()});tab.active=false;await time.advance(5000);assert.equal(instance.state,'paused');tab.active=true;
await send('stop');await tick();
console.log('PASS: integration — URL restrictions, input routing, focus emulation cleanup, background-window typing, same-window pause, popup live controls, editor checks, preference persistence, panel sender isolation.');
instance.random=()=>0;
await send('start',{job:{...job('Cat'),options:{...job().options,typoRate:5}}});
await time.advance(5600);assert.equal(instance.state,'done');
const backs=commands.filter(c=>c.name==='Input.dispatchKeyEvent'&&c.params.key==='Backspace');
assert.equal(backs.length,2);assert.equal(backs[0].params.type,'keyDown');assert.equal(backs[1].params.type,'keyUp');
assert.equal(backs[0].params.windowsVirtualKeyCode,8);assert.ok(backs.every(c=>c.target.tabId===1));
await send('start',{job:{...job('Cat'),options:{...job().options,typoRate:5}}});
await time.advance(5200);assert.equal(instance.state,'correcting');
await send('editor-interaction',{}, {id:'test',tab:{id:1},frameId:0});await time.advance(300);
assert.equal(instance.state,'idle');assert.match(instance.note,/Correction interrupted/);
assert.equal(commands.filter(c=>c.name==='Input.dispatchKeyEvent'&&c.params.key==='Backspace').length,2);
console.log('PASS: correction integration — Backspace targets only the selected document; cursor-interaction message cancels deletion.');
// A closed panel remains reopenable after the service worker goes idle and restarts.
assert.equal(sessionStorage.panelTab,1);
new Function('TypingEngine','chrome',source)(TestEngine,chrome);
assert.equal((await send('status')).state.panelAvailable,true);
assert.equal((await send('show-panel')).ok,true);
chrome.tabs.onRemoved.fn(1);await tick();assert.equal((await send('status')).state.panelAvailable,false);
assert.equal(sessionStorage.panelTab,null);
console.log('PASS: panel target survives service-worker restart and clears when the document closes.');
