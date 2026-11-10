export const DEFAULTS = {wpm:60, paragraphPause:1, sectionMode:false, variability:0, typoRate:0, wordPacing:true, wordPause:0.4};
export function settings(value = {}, base = DEFAULTS) {
  const s = {...DEFAULTS, ...base, ...value};
  if (!Number.isFinite(s.wpm) || s.wpm < 10 || s.wpm > 200) throw Error('Choose a speed from 10 to 200 WPM.');
  if (!Number.isFinite(s.paragraphPause) || s.paragraphPause < 0 || s.paragraphPause > 30) throw Error('Choose a paragraph pause from 0 to 30 seconds.');
  if (typeof s.sectionMode !== 'boolean') throw Error('Invalid section setting.');
  if (!Number.isFinite(s.variability) || s.variability < 0 || s.variability > 80) throw Error('Choose speed variation from 0 to 80%.');
  if (!Number.isFinite(s.typoRate) || s.typoRate < 0 || s.typoRate > 5) throw Error('Choose typo frequency from 0 to 5%.');
  if (typeof s.wordPacing !== 'boolean') throw Error('Invalid word pacing setting.');
  if (!Number.isFinite(s.wordPause) || s.wordPause < 0 || s.wordPause > 3) throw Error('Choose a word pause from 0 to 3 seconds.');
  return {wpm:s.wpm, paragraphPause:s.paragraphPause, sectionMode:s.sectionMode, variability:s.variability, typoRate:s.typoRate, wordPacing:s.wordPacing, wordPause:s.wordPause};
}
export function prepareText(text) {
  const normalized = text.replace(/\r\n?/g, '\n').replace(/\t/g, '    ');
  return Array.from(new Intl.Segmenter(undefined, {granularity:'grapheme'}).segment(normalized), s => s.segment);
}
function boundaries(chars) {
  const paragraphs = new Set(), sections = new Set(), wordGaps = new Set();
  const offsets = new Map([[0,0]]); let offset = 0;
  let wordOnLine=false;
  chars.forEach((c,i) => {offset += c.length; offsets.set(offset,i+1);
    if (c === '\n' && chars[i+1] && chars[i+1] !== '\n') paragraphs.add(i+1);
    if(c==='\n')wordOnLine=false;
    else if(!/^\s+$/u.test(c))wordOnLine=true;
    else if(wordOnLine && chars[i+1] && !/^\s+$/u.test(chars[i+1]))wordGaps.add(i+1);
  });
  for (const match of chars.join('').matchAll(/\n[ \t]*\n(?:[ \t]*\n)*/g)) {
    const index = offsets.get(match.index + match[0].length);
    if (index < chars.length) sections.add(index);
  }
  return {paragraphs, sections, wordGaps};
}
export class TypingEngine {
  constructor(io, {sleep = ms => new Promise(r=>setTimeout(r,ms)), now = Date.now, random = Math.random} = {}) {
    this.io=io; this.sleep=sleep; this.now=now; this.random=random; this.options={...DEFAULTS};
    this.state='idle'; this.note='Ready'; this.generation=0; this.job=null;
    this.chars=[]; this.total=0; this.index=0; this.paragraphs=new Set(); this.sections=new Set();
    this.paragraphSuffix=[0]; this.sectionSuffix=[0]; this.sectionParagraphSuffix=[0]; this.pendingDelay=null; this.readyAt=0;
    this.typoSuffix=[0]; this.corrections=0; this.correctionUntil=0; this.correctionIssue='';
    this.wordGaps=new Set();this.wordSuffix=[0];this.wordNoise=0;
  }
  get interval() {return 60000/(this.options.wpm*5);}
  delayLength() {
    const d=this.pendingDelay;
    if(d?.kind==='paragraph')return this.options.paragraphPause*1000;
    const variation=this.options.variability/100,noise=d?.noise||0;
    if(!this.options.wordPacing)return this.interval*(1+noise*variation);
    const fastInterval=this.interval/1.6;
    if(d?.kind==='word')return (fastInterval+this.options.wordPause*1000)*(1+noise*variation);
    // Most of the tempo variation is shared by the letters in a word.
    return fastInterval*(1+(0.75*(d?.wordNoise||0)+0.25*noise)*variation);
  }
  typoEligible(index) {
    // Keep edits inside ASCII words, away from word boundaries, Unicode and line breaks.
    return /^[a-z]$/i.test(this.chars[index]||'') && /^[a-z]$/i.test(this.chars[index-1]||'') && /^[a-z]$/i.test(this.chars[index+1]||'');
  }
  async typeCharacter(job, character, index) {
    if (!(this.options.typoRate>0 && this.typoEligible(index) && this.random()<this.options.typoRate/100)) {
      return this.io.insert(job,character);
    }
    const neighbors={a:'s',b:'v',c:'x',d:'s',e:'w',f:'d',g:'f',h:'j',i:'o',j:'k',k:'l',l:'k',m:'n',n:'m',o:'p',p:'o',q:'w',r:'e',s:'a',t:'r',u:'y',v:'c',w:'q',x:'z',y:'u',z:'x'};
    let wrong=neighbors[character.toLowerCase()];
    if(character===character.toUpperCase())wrong=wrong.toUpperCase();
    const anchor=await this.io.correctionAnchor(job);
    this.state='correcting';this.note='Typing and correcting a temporary typo';this.changed();
    let inserted=false;
    try {
      await this.io.insert(job,wrong);inserted=true;
      const delay=200+this.random()*200;
      this.correctionUntil=this.now()+delay;this.changed();
      await this.sleep(delay);
      if(!await this.io.correctionSafe(job,anchor)) throw Error('The editor or cursor changed.');
      await this.io.backspace(job);
      await this.io.insert(job,character);
      this.corrections++;
    } catch(e) {
      this.correctionIssue=(inserted?'Correction interrupted. Check the last letter in Docs before restarting. ':'Could not type a correction. ')+e.message;
      throw Error(this.correctionIssue);
    } finally {this.correctionUntil=0;}
  }
  snapshot() {
    const waiting = ['paused','section'].includes(this.state);
    const sectionNumber = this.sections.size+1-(this.sectionSuffix[this.index]||0);
    const pending = this.pendingDelay ? Math.max(0,this.delayLength()-this.pendingDelay.elapsed) : 0;
    const countdown = Math.max(0,this.readyAt-this.now());
    const paragraphGaps=this.paragraphSuffix[this.index]||0;
    const automaticParagraphs=paragraphGaps-(this.options.sectionMode?(this.sectionParagraphSuffix[this.index]||0):0);
    const futureCountdowns=this.options.sectionMode?(this.sectionSuffix[this.index]||0)*5000:0;
    const typoEstimate=(this.typoSuffix[this.index]||0)*this.options.typoRate/100*300;
    const charInterval=this.interval/(this.options.wordPacing?1.6:1);
    const wordPauses=this.options.wordPacing?(this.wordSuffix[this.index]||0)*this.options.wordPause*1000:0;
    const etaMs = Math.max(0,this.total-this.index-1-paragraphGaps)*charInterval + wordPauses +
      automaticParagraphs*this.options.paragraphPause*1000 + pending + countdown + futureCountdowns + typoEstimate + Math.max(0,this.correctionUntil-this.now());
    return {state:this.state,note:this.note,index:this.index,total:this.total,
      percent:this.total?Math.round(100*this.index/this.total):0,
      etaSeconds:Math.ceil(etaMs/1000),waiting,tabId:this.job?.tabId,
      readyAt:this.readyAt,sectionNumber,sectionTotal:this.sections.size+1,corrections:this.corrections,options:{...this.options}};
  }
  changed() {this.io.changed(this.snapshot());}
  configure(value) {this.options=settings(value,this.options);this.changed();return this.options;}
  async start(job) {
    if (!['idle','done'].includes(this.state)) throw Error('Stop the current session first.');
    if (typeof job.text !== 'string' || !job.text.trim()) throw Error('Paste some text first.');
    if (job.text.length > 100000) throw Error('Use at most 100,000 characters per session.');
    this.options=settings(job.options || (job.wpm !== undefined ? {wpm:job.wpm} : {}),this.options);
    this.chars=prepareText(job.text); this.total=this.chars.length; this.index=0;
    this.corrections=0;this.correctionUntil=0;this.correctionIssue='';
    ({paragraphs:this.paragraphs,sections:this.sections,wordGaps:this.wordGaps}=boundaries(this.chars));
    this.wordNoise=2*this.random()-1;
    this.paragraphSuffix=Array(this.total+1).fill(0);
    this.sectionSuffix=Array(this.total+1).fill(0);this.sectionParagraphSuffix=Array(this.total+1).fill(0);
    this.typoSuffix=Array(this.total+1).fill(0);
    this.wordSuffix=Array(this.total+1).fill(0);
    for(let i=this.total-1;i>=0;i--) {
      this.paragraphSuffix[i]=this.paragraphSuffix[i+1]+Number(this.paragraphs.has(i+1));
      this.sectionSuffix[i]=this.sectionSuffix[i+1]+Number(this.sections.has(i+1));
      this.sectionParagraphSuffix[i]=this.sectionParagraphSuffix[i+1]+Number(this.sections.has(i+1)&&this.paragraphs.has(i+1));
      this.typoSuffix[i]=this.typoSuffix[i+1]+Number(this.typoEligible(i));
      this.wordSuffix[i]=this.wordSuffix[i+1]+Number(this.wordGaps.has(i+1));
    }
    this.job={tabId:job.tabId}; this.pendingDelay=null;
    this.state='starting';this.note='Connecting';this.changed();
    const token=++this.generation;
    try {
      this.pendingAttach=this.io.attach(this.job);await this.pendingAttach;
      if(token===this.generation)this.resume();
    } catch(e) {if(token===this.generation)await this.stop(e.message);throw e;}
  }
  resume() {
    if(!['starting','paused','section'].includes(this.state))return;
    this.state='countdown';this.note='Click inside your document';this.readyAt=this.now()+5000;
    const token=++this.generation;this.changed();void this.run(token);
  }
  pause(note='Paused. Resume when your cursor is ready.') {
    if(!['typing','countdown','paragraph','word','correcting'].includes(this.state))return;
    ++this.generation;this.state='paused';this.readyAt=0;this.note=note;this.changed();
  }
  stop(note='Stopped. Text already inserted stays in the document.') {
    if(this.state==='stopping')return this.stoppingPromise;
    ++this.generation;this.state='stopping';this.readyAt=0;this.note=note;this.changed();
    const job=this.job;
    this.stoppingPromise=(async()=>{
      try {
        await this.pendingAttach?.catch(()=>{});await this.inFlight?.catch(()=>{if(this.correctionIssue)this.note=this.correctionIssue;});
        if(job)await this.io.detach(job);
      } finally {
        this.state='idle';this.job=null;this.chars=[];this.total=0;this.index=0;
        this.paragraphs.clear();this.sections.clear();this.paragraphSuffix=[0];
        this.sectionSuffix=[0];this.sectionParagraphSuffix=[0];
        this.typoSuffix=[0];this.correctionUntil=0;
        this.wordGaps.clear();this.wordSuffix=[0];this.wordNoise=0;
        this.pendingDelay=null;this.pendingAttach=null;this.inFlight=null;this.changed();
      }
    })();return this.stoppingPromise;
  }
  async run(token) {
    try {
      await this.inFlight?.catch(()=>{});
      while(token===this.generation && this.now()<this.readyAt) {
        await this.sleep(Math.min(100,this.readyAt-this.now()));
      }
      if(token!==this.generation)return;
      this.readyAt=0;
      while(this.index<this.total) {
        if(token!==this.generation)return;
        if(this.pendingDelay) {
          this.state=this.pendingDelay.kind==='paragraph'?'paragraph':
            this.pendingDelay.kind==='word'&&this.options.wordPacing?'word':'typing';
          this.note=this.state==='paragraph'?'Paragraph pause':this.state==='word'?'Between words':'Typing';this.changed();
          while(token===this.generation && this.pendingDelay.elapsed<this.delayLength()) {
            const delay=this.pendingDelay, before=this.now();
            // Bound fractional remainders so floating-point rounding cannot spin a timer.
            await this.sleep(Math.min(100,Math.max(1,this.delayLength()-delay.elapsed)));
            delay.elapsed+=Math.max(0,this.now()-before);
          }
          if(token!==this.generation)return;
          this.pendingDelay=null;
        }
        this.state='typing';this.note='Typing';
        if(!await this.io.ready(this.job)){this.pause('Paused: select the Docs tab and click inside the document.');return;}
        if(token!==this.generation)return;
        this.inFlight=this.typeCharacter(this.job,this.chars[this.index],this.index);await this.inFlight;
        this.index++;
        if(this.index<this.total) {
          const kind=this.paragraphs.has(this.index)?'paragraph':this.wordGaps.has(this.index)?'word':'character';
          if(kind==='word'||kind==='paragraph')this.wordNoise=2*this.random()-1;
          this.pendingDelay={kind,elapsed:0,noise:2*this.random()-1,wordNoise:this.wordNoise};
        }
        if(token!==this.generation)return;
        if(this.options.sectionMode && this.sections.has(this.index)) {
          this.pendingDelay=null;this.state='section';this.note='Section finished. Press Continue for the next section.';
          this.changed();return;
        }
        this.changed();
      }
      this.state='finishing';this.changed();await this.io.detach(this.job);
      if(token!==this.generation)return;
      this.state='done';this.note='Finished sending text. Check your document.';
      this.job=null;this.chars=[];this.pendingDelay=null;this.changed();
    } catch(e) {
      if(this.correctionIssue && this.job && this.state!=='stopping') await this.stop(this.correctionIssue);
      else if(token===this.generation)await this.stop('Stopped: '+e.message);
    }
  }
}
