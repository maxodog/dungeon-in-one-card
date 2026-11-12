const E=require('../src/engine.js');
const {idx,XY,LEVELS}=E;
function show(st){const lv=LEVELS[st.levelIdx];let out='';for(let y=0;y<6;y++){let r='';for(let x=0;x<7;x++){const i=idx(x,y);const m=st.mons.find(m=>m.x===x&&m.y===y);r+= (st.adv.x===x&&st.adv.y===y)?'A':m?String(m.hp):lv.walls[i]?'#':'.';}out+=r+'\n';}return out;}
// monsters-only trace on level 5 (skeletons range 4) and 4 (bats)
for (const L of [0,4,3,11]){
  const st=E.newRun(); E.setupLevel(st,L); st.turn.def=2;
  console.log('Nivel',L+1,'\n'+show(st));
  for(let t=0;t<4;t++){ const ev=E.playMonsters(st); const a=ev.find(e=>e.t==='attack'); console.log(' turno',t+1,'mov',ev.filter(e=>e.t==='move').length,'ataque total',a.total,'dmg',a.dmg,'hp',st.adv.hp); console.log(show(st)); st.adv.hp=6; }
}
