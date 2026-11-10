import {saveDraft,deleteDraft} from './drafts.js';
const $=id=>document.getElementById(id);
let session, drafts=[], loaded=false, pollBusy=false, saveChain=Promise.resolve();
const formatTime=seconds=>seconds<60?`${seconds}s`:`${Math.floor(seconds/60)}m ${seconds%60}s`;
async function send(type,extra={}) {
  const r=await chrome.runtime.sendMessage({type,...extra});
  if(r.ok===false)throw Error(r.error);return r.state || r;
}
function notify(text) {$('message').textContent=text;}
async function act(fn){try{await fn();}catch(e){notify(e.message);}}
function counts(){ $('count').textContent=`${[...$('text').value].length.toLocaleString()} characters`; }
function saveCurrent(){
  const draft=$('text').value;
  saveChain=saveChain.catch(()=>{}).then(()=>chrome.storage.session.set({draft}));
  return saveChain;
}
function options(){return {wpm:Number($('speed').value),paragraphPause:Number($('paragraph').value),sectionMode:$('sections').checked,variability:Number($('variability').value),typoRate:Number($('typos').value),wordPacing:$('word-pacing').checked,wordPause:Number($('word-pause').value)};}
function labels(){ $('word-pause-label').textContent=$('word-pause').value+' s'; $('speed-label').textContent=$('speed').value+' WPM';$('paragraph-label').textContent=$('paragraph').value+' s';
  $('variability-label').textContent=Number($('variability').value)?'±'+$('variability').value+'% gaps':'Off';
  $('typos-label').textContent=Number($('typos').value)?$('typos').value+'%':'Off';
  $('variation-summary').textContent=Number($('variability').value)||Number($('typos').value)?'On':'Off';
}
function render(s){
  session=s; const active=!['idle','done'].includes(s.state), waiting=['paused','section'].includes(s.state);
  $('start').hidden=active;$('resume').hidden=!waiting;$('resume').textContent=s.state==='section'?'Continue':'Resume';
  $('pause').hidden=!['typing','word','paragraph','countdown','correcting'].includes(s.state);$('stop').hidden=!active;
  $('show-panel').hidden=!s.panelAvailable;
  for(const id of ['text','clear','load'])$(id).disabled=active;
  $('delete-draft').disabled=!$('drafts').value;
  const titles={idle:'Ready',done:'Finished',section:'Waiting for you',paused:'Paused',countdown:'Starting soon',typing:'Typing',word:'Between words',paragraph:'Paragraph pause',correcting:'Correcting a typo',starting:'Connecting',stopping:'Stopping',finishing:'Finishing'};
  $('status').textContent=s.state==='countdown'?`Starting in ${Math.max(0,Math.ceil((s.readyAt-Date.now())/1000))}s`:titles[s.state];
  $('detail').textContent=s.note;$('progress').max=s.total||1;$('progress').value=s.index;
  $('progress-label').textContent=`${s.percent}% · ${s.index.toLocaleString()} / ${s.total.toLocaleString()}`;
  $('eta').textContent=s.total?`~${formatTime(s.etaSeconds)} ${s.waiting?'typing left':'remaining'}`:'—';
  $('section-label').textContent=s.options.sectionMode&&s.total?`Section ${s.sectionNumber} of ${s.sectionTotal} · excludes time waiting for Continue`:'';
  if(document.activeElement!==$('speed'))$('speed').value=s.options.wpm;
  if(document.activeElement!==$('paragraph'))$('paragraph').value=s.options.paragraphPause;
  if(document.activeElement!==$('sections'))$('sections').checked=s.options.sectionMode;
  if(document.activeElement!==$('variability'))$('variability').value=s.options.variability;
  if(document.activeElement!==$('typos'))$('typos').value=s.options.typoRate;
  $('correction-label').textContent=s.corrections?`${s.corrections} temporary ${s.corrections===1?'typo':'typos'} corrected`:'';
  if(document.activeElement!==$('word-pacing'))$('word-pacing').checked=s.options.wordPacing;
  if(document.activeElement!==$('word-pause'))$('word-pause').value=s.options.wordPause;
  labels();
}
function renderDrafts(id=''){
  $('drafts').replaceChildren(new Option('New / unsaved draft',''));
  for(const d of drafts)$('drafts').add(new Option(d.name,d.id));
  $('drafts').value=id;$('delete-draft').disabled=!id;
}
$('text').oninput=()=>{counts();void act(saveCurrent);};
$('clear').onclick=()=>{ $('text').value='';counts();void act(saveCurrent); };
for(const id of ['speed','paragraph','sections','variability','typos','word-pacing','word-pause'])$(id).addEventListener('input',()=>{
  labels();void act(async()=>{await send('configure',{options:options()});});
});
$('drafts').onchange=()=>{$('draft-name').value=drafts.find(d=>d.id===$('drafts').value)?.name || ''; $('delete-draft').disabled=!$('drafts').value;};
$('load').onclick=()=>act(async()=>{
  const d=drafts.find(d=>d.id===$('drafts').value);if(!d)throw Error('Select a saved draft first.');
  $('text').value=d.text;$('draft-name').value=d.name;counts();await saveCurrent();notify('Draft loaded.');
});
$('save-draft').onclick=()=>act(async()=>{
  const result=saveDraft(drafts,{id:$('drafts').value,name:$('draft-name').value,text:$('text').value});
  await chrome.storage.local.set({drafts:result.drafts});drafts=result.drafts;renderDrafts(result.id);notify('Draft saved on this device.');
});
$('delete-draft').onclick=()=>act(async()=>{
  const next=deleteDraft(drafts,$('drafts').value);await chrome.storage.local.set({drafts:next});drafts=next;renderDrafts();$('draft-name').value='';notify('Saved draft deleted. Text in the box is unchanged.');
});
$('start').onclick=()=>act(async()=>{
  $('start').disabled=true;notify('');
  try {await saveCurrent();const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    await send('start',{job:{tabId:tab.id,text:$('text').value,options:options()}});window.close();
  }finally{$('start').disabled=false;}
});
$('pause').onclick=()=>act(async()=>render(await send('pause')));
$('resume').onclick=()=>act(async()=>{await send('resume');window.close();});
$('stop').onclick=()=>act(async()=>render(await send('stop')));
$('show-panel').onclick=()=>act(async()=>{await send('show-panel');notify('Floating controls shown in your Docs window.');});
void act(async()=>{
  const [saved,local]=await Promise.all([chrome.storage.session.get(['draft']),chrome.storage.local.get(['drafts'])]);
  drafts=local.drafts||[];renderDrafts();$('text').value=saved.draft||'';counts();render(await send('opened'));loaded=true;
});
setInterval(async()=>{
  if(!loaded||pollBusy)return;pollBusy=true;
  try{render(await send('status'));}catch(e){notify(e.message);}finally{pollBusy=false;}
},400);
