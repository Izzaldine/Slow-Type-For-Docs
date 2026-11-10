(() => {
  // Re-injection is idempotent. The closed shadow root isolates controls from Docs styles.
  if(globalThis.__slowTypePanel){globalThis.__slowTypePanel.show();return;}
  const host=document.createElement('div');
  host.id='slow-type-floating-controls';
  host.style.cssText='position:fixed;right:22px;bottom:22px;z-index:2147483647;width:286px;';
  const root=host.attachShadow({mode:'closed'});
  root.innerHTML=`<style>
    :host{all:initial;display:block;color-scheme:dark}:host([hidden]){display:none!important}*{box-sizing:border-box}section{font:12px/1.5 system-ui,sans-serif;color:#eeeaf5;background:#201a2b;border:1px solid #655077;border-radius:15px;box-shadow:0 12px 40px #0005;overflow:hidden}
    header{display:flex;align-items:center;gap:8px;padding:11px 13px;background:#30233e;cursor:grab;user-select:none;touch-action:none}header strong{flex:1;font-size:13px}button{font:600 11px system-ui;color:#eeeaf5;background:#3b2e49;border:1px solid #685479;border-radius:7px;padding:7px 10px;cursor:pointer}button:hover{background:#534064}button:focus-visible{outline:2px solid #cbb5ff;outline-offset:2px}button:disabled{opacity:.4;cursor:default}header button{padding:2px 7px;background:transparent}main{padding:13px}p{margin:5px 0;color:#c8b8d9;font-size:11px}.row{display:flex;align-items:center;justify-content:space-between;gap:5px;margin-top:11px}.row span{flex:1}.row output{width:52px;text-align:center;font-variant-numeric:tabular-nums}.row button{padding:4px 9px}.actions{display:flex;gap:6px;margin-top:13px}.primary{flex:1;background:#bda1f4;color:#21132f;border-color:#bda1f4}.primary:hover{background:#d1baff}progress{width:100%;height:6px;accent-color:#c4a9ff;margin:9px 0 0}.stats{display:flex;justify-content:space-between;color:#c8b8d9;font-size:10px}.foot{font-size:10px;line-height:1.5;border-top:1px solid #493951;padding-top:9px;margin-top:12px}.variation{margin-top:12px;border-top:1px solid #493951;padding-top:8px}.variation summary{cursor:pointer;color:#dcc6f4}main{max-height:70vh;overflow-y:auto}#notice{color:#ffccb9}#notice:empty{display:none}[hidden]{display:none!important}
  </style><section aria-label="Slow Type controls"><header id="drag"><strong>Slow Type <span id="mini"></span></strong><button id="collapse" aria-label="Collapse controls">−</button><button id="hide" aria-label="Hide controls" title="Hide panel (typing continues)">×</button></header><main id="body"><strong id="title">Ready</strong><p id="note">Connecting…</p><progress id="progress" value="0" max="1" aria-label="Typing progress"></progress><div class="stats"><span id="numbers">0%</span><span id="eta">—</span></div><p id="section"></p><div class="row"><span>Base speed</span><button id="slower" aria-label="Decrease speed">−</button><output id="speed">60 WPM</output><button id="faster" aria-label="Increase speed">+</button></div><div class="row"><span>Word pacing</span><button id="word-pacing" aria-pressed="true">On</button></div><div class="row"><span>Between words</span><button id="word-shorter" aria-label="Shorter word pause">−</button><output id="word-delay">0.4 s</output><button id="word-longer" aria-label="Longer word pause">+</button></div><div class="row"><span>Paragraph pause</span><button id="shorter" aria-label="Shorter paragraph pause">−</button><output id="delay">1 s</output><button id="longer" aria-label="Longer paragraph pause">+</button></div><div class="row"><span>One section at a time</span><button id="sections" aria-pressed="false">Off</button></div><details class="variation"><summary>Typing variation</summary><div class="row"><span>Gap variation</span><button id="steadier" aria-label="Less speed variation">−</button><output id="variation">Off</output><button id="varied" aria-label="More speed variation">+</button></div><div class="row"><span>Typo chance</span><button id="fewer" aria-label="Fewer temporary typos">−</button><output id="typo-rate">Off</output><button id="more" aria-label="More temporary typos">+</button></div><p id="corrected"></p><p>Typos are backspaced and corrected. Keep the document cursor in place.</p></details><div class="actions"><button id="toggle" class="primary">Pause</button><button id="stop">Stop</button></div><p id="notice" role="alert"></p><p class="foot">Other windows are okay. Keep Docs selected in this window.<br>Estimate excludes manual waiting. Blank lines separate sections.</p></main></section>`;
  document.documentElement.append(host);
  const $=id=>root.getElementById(id);
  let state, busy=false, ended=false;
  const show=()=>{
    host.hidden=false;host.style.setProperty('display','block','important');
    if(!host.isConnected)document.documentElement.append(host);
  };
  const hide=()=>{
    host.hidden=true;host.style.setProperty('display','none','important');
    host.remove();
  };
  for(const button of root.querySelectorAll('button'))button.type='button';
  globalThis.__slowTypePanel={show};
  const time=s=>s<60?`${s}s`:`${Math.floor(s/60)}m ${s%60}s`;
  function render(s){
    state=s;const active=!['idle','done'].includes(s.state),waiting=['paused','section'].includes(s.state);
    $('title').textContent=s.state==='countdown'?`Starting in ${Math.max(0,Math.ceil((s.readyAt-Date.now())/1000))}s`:({typing:'Typing',word:'Between words',paragraph:'Paragraph pause',correcting:'Correcting a typo',paused:'Paused',section:'Waiting for Continue',idle:'Stopped',done:'Finished',starting:'Connecting',finishing:'Finishing',stopping:'Stopping'})[s.state];
    $('mini').textContent=s.total?`· ${s.percent}%`:'';$('note').textContent=s.note;
    $('progress').max=s.total||1;$('progress').value=s.index;
    $('numbers').textContent=`${s.percent}% · ${s.index.toLocaleString()} / ${s.total.toLocaleString()}`;
    $('eta').textContent=s.total?`~${time(s.etaSeconds)} left`:'—';
    $('section').textContent=s.options.sectionMode&&s.total?`Section ${s.sectionNumber} of ${s.sectionTotal}`:'';
    $('speed').textContent=s.options.wpm+' WPM';$('delay').textContent=s.options.paragraphPause+' s';
    $('word-pacing').textContent=s.options.wordPacing?'On':'Off';$('word-pacing').setAttribute('aria-pressed',s.options.wordPacing);
    $('word-delay').textContent=s.options.wordPause+' s';
    $('variation').textContent=s.options.variability?'±'+s.options.variability+'%':'Off';
    $('typo-rate').textContent=s.options.typoRate?s.options.typoRate+'%':'Off';
    $('corrected').textContent=s.corrections?`${s.corrections} temporary typos corrected`:'';
    $('sections').textContent=s.options.sectionMode?'On':'Off';$('sections').setAttribute('aria-pressed',s.options.sectionMode);
    $('toggle').textContent=s.state==='section'?'Continue':waiting?'Resume':'Pause';
    $('toggle').disabled=!active||['starting','stopping','finishing'].includes(s.state);$('stop').disabled=!active;
    for(const id of ['slower','faster','shorter','longer','sections','word-pacing','word-shorter','word-longer','steadier','varied','fewer','more'])$(id).disabled=!active;
  }
  async function send(type,extra={}){
    try {const r=await chrome.runtime.sendMessage({type,...extra});if(!r)throw Error('Reopen the extension to reconnect controls.');
      if(r.ok===false)throw Error(r.error);render(r.state||r);
    }catch(e){$('notice').textContent=e.message;if(!chrome.runtime?.id){ended=true;clearInterval(poll);}}
  }
  // Pointer controls preserve the document caret. Keyboard users can focus controls;
  // after an activation, restore the editor element that was focused beforehand.
  let editor=document.activeElement;
  function captureEditor(){const a=document.activeElement;if(a&&a!==host)editor=a;}
  root.addEventListener('pointerdown',e=>{captureEditor();if(e.target.closest('button,summary'))e.preventDefault();});
  root.addEventListener('focusin',()=>{captureEditor();});
  for(const type of ['click','keydown','keyup','pointerdown','pointerup'])root.addEventListener(type,e=>e.stopPropagation());
  function restoreEditor(){if(document.activeElement===host && editor?.isConnected)editor.focus({preventScroll:true});}
  function click(id,fn){$(id).addEventListener('click',()=>{try{restoreEditor();}catch{/* A stale editor must not block panel controls. */}fn();});}
  for(const id of ['slower','faster','shorter','longer','sections','word-pacing','word-shorter','word-longer','steadier','varied','fewer','more','toggle','stop'])$(id).disabled=true;
  function configure(patch){if(state)void send('configure',{options:patch});}
  click('slower',()=>configure({wpm:Math.max(10,state.options.wpm-5)}));
  click('faster',()=>configure({wpm:Math.min(200,state.options.wpm+5)}));
  click('shorter',()=>configure({paragraphPause:Math.max(0,state.options.paragraphPause-0.5)}));
  click('longer',()=>configure({paragraphPause:Math.min(30,state.options.paragraphPause+0.5)}));
  click('word-pacing',()=>configure({wordPacing:!state.options.wordPacing}));
  click('word-shorter',()=>configure({wordPause:Math.max(0,Math.round((state.options.wordPause-0.1)*10)/10)}));
  click('word-longer',()=>configure({wordPause:Math.min(3,Math.round((state.options.wordPause+0.1)*10)/10)}));
  click('steadier',()=>configure({variability:Math.max(0,state.options.variability-10)}));
  click('varied',()=>configure({variability:Math.min(80,state.options.variability+10)}));
  click('fewer',()=>configure({typoRate:Math.max(0,state.options.typoRate-0.5)}));
  click('more',()=>configure({typoRate:Math.min(5,state.options.typoRate+0.5)}));
  click('sections',()=>configure({sectionMode:!state.options.sectionMode}));
  click('toggle',()=>send(['paused','section'].includes(state.state)?'resume':'pause'));
  click('stop',()=>send('stop'));
  click('hide',hide);
  click('collapse',()=>{$('body').hidden=!$('body').hidden;$('collapse').textContent=$('body').hidden?'+':'−';$('collapse').setAttribute('aria-label',$('body').hidden?'Expand controls':'Collapse controls');});
  // Changing the document caret during a correction invalidates its deletion guard.
  // Do not count floating-panel pointer controls as document edits.
  const reportInteraction=()=>{if(chrome.runtime?.id)void chrome.runtime.sendMessage({type:'editor-interaction'}).catch(()=>{});};
  const watchDocument=doc=>{
    doc.addEventListener('pointerdown',e=>{if(!e.composedPath().includes(host))reportInteraction();},true);
    doc.addEventListener('keydown',e=>{
      if(e.composedPath().includes(host))return;
      if((e.ctrlKey||e.metaKey)&&e.shiftKey&&['Space','Period'].includes(e.code))return;
      if(e.ctrlKey||e.metaKey||/^(Arrow|Home|End|Page|Delete|Escape)/.test(e.key))reportInteraction();
    },true);
  };
  watchDocument(document);
  for(const frame of document.querySelectorAll('iframe.docs-texteventtarget-iframe')){
    try{if(frame.contentDocument)watchDocument(frame.contentDocument);}catch{}
  }
  let drag;
  $('drag').addEventListener('pointerdown',e=>{
    if(e.target.closest('button'))return;e.preventDefault();captureEditor();
    const r=host.getBoundingClientRect();drag={x:e.clientX-r.left,y:e.clientY-r.top};$('drag').setPointerCapture(e.pointerId);
  });
  $('drag').addEventListener('pointermove',e=>{
    if(!drag)return;host.style.right='auto';host.style.bottom='auto';
    host.style.left=Math.max(0,Math.min(innerWidth-host.offsetWidth,e.clientX-drag.x))+'px';
    host.style.top=Math.max(0,Math.min(innerHeight-40,e.clientY-drag.y))+'px';
  });
  for(const type of ['pointerup','pointercancel'])$('drag').addEventListener(type,()=>{drag=null;});
  chrome.runtime.onMessage.addListener(message=>{
    if(message.type==='slow-type-state')render(message.state);
    if(message.type==='slow-type-show')show();
  });
  const poll=setInterval(async()=>{
    if(busy||ended||host.hidden||!host.isConnected)return;busy=true;
    try{await send('status');}finally{busy=false;}
  },600);
})();
