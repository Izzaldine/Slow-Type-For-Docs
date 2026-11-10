import { TypingEngine } from './engine.js';

const isDoc = url => /^https:\/\/docs\.google\.com\/document\/(?:u\/\d+\/)?d\/[^/]+\/edit(?:[?#]|$)/.test(url || '');
let attachedTab = null;
let panelTab = null;
let lastPublish = 0;
let lastState = '';
async function rememberPanel(tabId) {
  panelTab=tabId;
  await chrome.storage.session.set({panelTab:tabId});
}
// Check the editor itself, never a title, search field, comment, or toolbar.
const focusExpression = `(() => {
  const a = document.activeElement;
  if (!a) return false;
  if (a.matches('iframe.docs-texteventtarget-iframe')) {
    try { const b = a.contentDocument.activeElement;
      return !!(b && b.isContentEditable); } catch { return false; }
  }
  return !!(a.isContentEditable && a.closest('.kix-appview-editor'));
})()`;

const engine = new TypingEngine({
  async attach(job) {
    const tab = await chrome.tabs.get(job.tabId);
    if (!isDoc(tab.url)) throw Error('Open an editable Google Docs document first.');
    if (!tab.active) throw Error('Keep the document tab selected.');
    job.url = tab.url; job.windowId = tab.windowId;
    job.interactionEpoch = 0;
    await chrome.debugger.attach({tabId: job.tabId}, '1.3');
    attachedTab = job.tabId;
    await chrome.debugger.sendCommand({tabId:job.tabId}, 'Emulation.setFocusEmulationEnabled', {enabled:true});
    await chrome.scripting.executeScript({target:{tabId:job.tabId},files:['panel.js']});
    await rememberPanel(job.tabId);
  },
  async detach(job) {
    if (attachedTab !== job.tabId) return;
    attachedTab = null;
    try { await chrome.debugger.sendCommand({tabId:job.tabId}, 'Emulation.setFocusEmulationEnabled', {enabled:false}); } catch { /* Target closed. */ }
    try { await chrome.debugger.detach({tabId: job.tabId}); } catch { /* Already detached. */ }
  },
  async ready(job) {
    const tab = await chrome.tabs.get(job.tabId);
    if (!tab.active || tab.windowId !== job.windowId || tab.url !== job.url || !isDoc(tab.url)) return false;
    const result = await chrome.debugger.sendCommand({tabId: job.tabId}, 'Runtime.evaluate',
      {expression: focusExpression, returnByValue: true});
    return result.result?.value === true;
  },
  async insert(job, character) {
    const target = {tabId: job.tabId};
    if (character === '\n') {
      await chrome.debugger.sendCommand(target, 'Input.dispatchKeyEvent',
        {type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r'});
      await chrome.debugger.sendCommand(target, 'Input.dispatchKeyEvent',
        {type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13});
    } else if (/^[\x20-\x7e]$/.test(character)) {
      // Keyboard text events also reach editors that listen for keypress.
      const key = {key: character};
      if (/^[a-z0-9 ]$/i.test(character)) key.windowsVirtualKeyCode = character.toUpperCase().charCodeAt(0);
      await chrome.debugger.sendCommand(target, 'Input.dispatchKeyEvent',
        {type: 'keyDown', ...key, text: character, unmodifiedText: character});
      await chrome.debugger.sendCommand(target, 'Input.dispatchKeyEvent', {type: 'keyUp', ...key});
    } else {
      await chrome.debugger.sendCommand(target, 'Input.insertText', {text: character});
    }
  },
  correctionAnchor(job) { return job.interactionEpoch; },
  async correctionSafe(job, anchor) {
    const ready=await this.ready(job);
    return ready && anchor === job.interactionEpoch;
  },
  async backspace(job) {
    const target={tabId:job.tabId};
    await chrome.debugger.sendCommand(target,'Input.dispatchKeyEvent',
      {type:'keyDown',key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8});
    await chrome.debugger.sendCommand(target,'Input.dispatchKeyEvent',
      {type:'keyUp',key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8});
  },
  changed(s) {
    const label = {typing:'TYPE', correcting:'FIX', word:'WAIT', paragraph:'WAIT', section:'NEXT', countdown:'WAIT', paused:'II', starting:'…', stopping:'', finishing:'…'}[s.state] || '';
    void chrome.action.setBadgeText({text: label});
    void chrome.action.setBadgeBackgroundColor({color: s.state === 'paused' ? '#a66812' : '#7355be'});
    if (panelTab && (Date.now()-lastPublish>200 || lastState !== s.state)) {
      lastPublish=Date.now();lastState=s.state;
      void chrome.tabs.sendMessage(panelTab,{type:'slow-type-state',state:s}).catch(()=>{});
    }
  }
});

// Preferences persist across browser restarts; text is never broadcast to the panel.
const initialized = Promise.all([
  chrome.storage.local.get(['options']),chrome.storage.session.get(['panelTab'])
]).then(([saved,session]) => {
  panelTab=Number.isInteger(session.panelTab)?session.panelTab:null;
  if(saved.options) { try {engine.configure(saved.options);} catch { /* Use defaults for invalid settings. */ } }
});
let preferenceWrite = Promise.resolve();
const publicState=()=>({...engine.snapshot(),panelAvailable:panelTab!==null});
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id) return;
  if (sender.tab && (sender.tab.id !== panelTab || sender.frameId !== 0 || !['status','pause','resume','stop','configure','editor-interaction'].includes(message.type))) return;
  (async () => {
    await initialized;
    if (message.type === 'status') return publicState();
    if (message.type === 'opened') return publicState();
    else if (message.type === 'editor-interaction') {
      if(engine.job)engine.job.interactionEpoch++;
    }
    else if (message.type === 'start') await engine.start(message.job);
    else if (message.type === 'pause') engine.pause();
    else if (message.type === 'resume') engine.resume();
    else if (message.type === 'stop') await engine.stop();
    else if (message.type === 'configure') {
      engine.configure(message.options);
      const options={...engine.options};
      preferenceWrite=preferenceWrite.catch(()=>{}).then(()=>chrome.storage.local.set({options}));
      await preferenceWrite;
    }
    else if (message.type === 'show-panel') {
      const tabId=engine.job?.tabId || panelTab;
      if(!tabId)throw Error('Start a typing session first.');
      try {
        const tab=await chrome.tabs.get(tabId);
        if(!isDoc(tab.url))throw Error('Document closed.');
        await chrome.tabs.sendMessage(tabId,{type:'slow-type-show'});
      } catch {
        await rememberPanel(null);
        throw Error('The old panel is no longer available. Start a session in Docs to create it again.');
      }
    }
    else throw Error('Unknown request.');
    return publicState();
  })().then(state => respond({ok:true, state}), error => respond({ok:false, error:error.message}));
  return true;
});
chrome.commands.onCommand.addListener(command => {
  if (command === 'stop') void engine.stop();
  else if (command === 'pause-resume') {
    if (['paused','section'].includes(engine.state)) engine.resume(); else engine.pause();
  }
});
chrome.tabs.onActivated.addListener(({tabId,windowId}) => {
  if (engine.job && windowId === engine.job.windowId && tabId !== engine.job.tabId)
    engine.pause('Paused because you switched away from Docs in its window.');
});
chrome.tabs.onUpdated.addListener((tabId, change) => {
  if(change.status==='loading')void initialized.then(()=>{if(panelTab===tabId)return rememberPanel(null);});
  if (engine.job?.tabId === tabId && (change.status === 'loading' || change.url))
    void engine.stop('Stopped because the document navigated or reloaded.');
});
chrome.tabs.onRemoved.addListener(tabId => {
  void initialized.then(()=>{if(panelTab===tabId)return rememberPanel(null);});
  if (engine.job?.tabId === tabId) void engine.stop('Document closed.');
});
chrome.debugger.onDetach.addListener(source => {
  if (source.tabId === attachedTab) {
    attachedTab = null;
    void engine.stop('Chrome disconnected typing. Open the extension to start again.');
  }
});
