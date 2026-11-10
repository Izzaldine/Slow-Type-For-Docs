import assert from 'node:assert/strict';
export const tick=()=>new Promise(r=>setImmediate(r));
export function clock(){
  let now=0;const timers=[];
  return {now:()=>now,sleep:ms=>new Promise(resolve=>timers.push({at:now+ms,resolve})),
    async advance(ms){const end=now+ms;await tick();let guard=0;
      while(true){timers.sort((a,b)=>a.at-b.at);if(!timers.length||timers[0].at>end)break;
        assert.ok(++guard<100000,'Timer loop');const timer=timers.shift();now=timer.at;timer.resolve();await tick();
      }now=end;await tick();},get timers(){return timers;}};
}
