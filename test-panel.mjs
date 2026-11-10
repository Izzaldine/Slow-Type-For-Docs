// DOM-boundary regression tests. Browser layout is not simulated here.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {settings} from './slow-type/engine.js';
import {tick} from './test-support.mjs';
class Node {
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.handlers={};this.attributes={};this.isConnected=false;this.hidden=false;this.disabled=false;
  this.style={values:{},setProperty:(k,v,p)=>this.style.values[k]={v,p}};}
 addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);}
 emit(type){const e={target:this,preventDefault(){},stopPropagation(){},composedPath:()=>[this]};for(const fn of this.handlers[type]||[])fn(e);}
 setAttribute(k,v){this.attributes[k]=String(v);}
 closest(selector){return selector.split(',').includes(this.tagName.toLowerCase())?this:null;}
 attachShadow(){this.shadow=new Shadow();return this.shadow;}
 remove(){this.parent?.children.delete(this);this.isConnected=false;}
 getBoundingClientRect(){return {left:100,top:100};}
 focus(){}
}
class Shadow extends Node {
 constructor(){super();this.elements=new Map();}
 set innerHTML(html){this.html=html;for(const m of html.matchAll(/<([a-z]+)\b[^>]*\bid="([^"]+)"[^>]*>/g)){const n=new Node(m[1]);n.id=m[2];this.elements.set(n.id,n);}}
 getElementById(id){return this.elements.get(id);}
 querySelectorAll(tag){return [...this.elements.values()].filter(n=>n.tagName===tag.toUpperCase());}
}
const doc=new Node('document');doc.documentElement={children:new Set(),append(node){this.children.add(node);node.isConnected=true;node.parent=this;}};
doc.createElement=tag=>new Node(tag);
doc.querySelectorAll=()=>[];const editor=new Node('iframe');editor.isConnected=true;doc.activeElement=editor;
let current={state:'done',note:'Finished',index:12,total:12,percent:100,etaSeconds:0,readyAt:0,sectionNumber:1,sectionTotal:1,corrections:0,options:settings()};
const requests=[],listeners=[],intervals=[];
const chrome={runtime:{id:'test',onMessage:{addListener:fn=>listeners.push(fn)},sendMessage:async m=>{
 requests.push(m);if(m.type==='configure')current={...current,options:settings(m.options,current.options)};return {ok:true,state:current};}}};
const context=vm.createContext({document:doc,chrome,console,innerWidth:1200,innerHeight:900,
 setInterval:fn=>{intervals.push(fn);return intervals.length;},clearInterval(){}});
const source=readFileSync(new URL(process.env.SLOW_TYPE_PANEL_SOURCE||'./slow-type/panel.js',import.meta.url),'utf8');vm.runInContext(source,context);
const host=[...doc.documentElement.children][0],root=host.shadow,$=id=>root.getElementById(id);
listeners[0]({type:'slow-type-state',state:current});
assert.equal($('hide').disabled,false);assert.equal($('stop').disabled,true);
$('hide').emit('click');assert.equal(host.isConnected,false);assert.equal(host.hidden,true);
assert.equal(host.style.values.display.v,'none');assert.equal(requests.some(m=>m.type==='stop'),false);
listeners[0]({type:'slow-type-state',state:current});assert.equal(host.isConnected,false,'Status updates must not reopen the closed panel');
await intervals[0]();assert.equal(requests.length,0,'Closed panel must not poll');
listeners[0]({type:'slow-type-show'});assert.equal(host.isConnected,true);assert.equal(host.hidden,false);assert.equal(host.style.values.display.v,'block');
$('collapse').emit('click');assert.equal($('body').hidden,true);$('collapse').emit('click');assert.equal($('body').hidden,false);
// A stale editor's failed focus restoration must never prevent Close.
doc.activeElement=host;editor.focus=()=>{throw Error('stale editor');};$('hide').emit('click');assert.equal(host.isConnected,false);
vm.runInContext(source,context);assert.equal(host.isConnected,true);assert.equal(doc.documentElement.children.size,1);assert.equal(listeners.length,1);
current={...current,state:'typing',note:'Typing'};listeners[0]({type:'slow-type-state',state:current});
$('word-longer').emit('click');await tick();assert.equal(current.options.wordPause,0.5);
$('word-pacing').emit('click');await tick();assert.equal(current.options.wordPacing,false);
console.log('PASS: panel — Close detaches the panel after completion; progress cannot reopen it; no Stop sent; hidden polling stops; Show reattaches; collapse/expand; stale focus; no duplicate injection; word controls.');
