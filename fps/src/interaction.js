/**
 * Deterministic proximity / facing selection. E must always respond near
 * reachable mission props, even when the tiny object is behind a drawer edge.
 * Exported separately so all 3 levels are unit-tested without WebGL.
 */
export function chooseInteraction({objectives, completed, markers, player, forward, exit, done}) {
  const item=(def) => {
    const point=markers.get(def.id)?.pos;
    if(!point)return null;
    const dx=point.x-player.x,dz=point.z-player.z;
    const distance=Math.hypot(dx,dz);
    if(distance>3.18)return null;
    const norm=distance>.001?1/distance:0;
    const dot=(dx*norm*forward.x+dz*norm*forward.z);
    // Very-close items work in any direction; longer range remains facing-based.
    if(distance>1.65&&dot<-.35)return null;
    return {def,d:distance,score:distance+Math.max(0,-dot)*.6};
  };
  if(done&&exit) {
    const dx=exit.x-player.x,dz=exit.z-player.z;
    const distance=Math.hypot(dx,dz);
    if(distance<2.55)return {exit:true,d:distance,score:distance};
  }
  const candidates=objectives
    .filter(def=>!completed.has(def.id))
    .map(item).filter(Boolean)
    .sort((a,b)=>a.score-b.score);
  return candidates[0]??null;
}
