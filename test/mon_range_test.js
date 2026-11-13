const E=require('../engine.js');
let bad=[],tot=0;
for (const game of ['harbour','peak','mguf','base','hell']) { const n=E.GAMES[game].levels.length;
for(let li=0;li<n;li++){
 for(let it=0;it<4000;it++){
  const st=E.newRun('paladin',game,[]); E.setupLevel(st,li,null);
  const lv=E.LEVELS[li]; if(lv.boss) continue;
  const free=[];for(let i=0;i<E.N;i++) if(!lv.walls[i]&&!lv.voids[i]) free.push(i);
  const pick=()=>free.splice(Math.floor(Math.random()*free.length),1)[0];
  const a=pick(); st.adv.x=E.XY(a)[0]; st.adv.y=E.XY(a)[1];
  const m0=lv.mon, p=pick(), [x,y]=E.XY(p);
  st.mons=[{id:1,x,y,hp:m0.hp,maxHp:m0.hp,spd:m0.spd,atk:m0.atk,def:m0.def,rng:m0.rng}];
  const was=E.attackers(st).length>0;
  const from=[x,y];
  E.playMonsters(st); tot++;
  const now=E.attackers(st).length>0;
  if(was&&!now&&bad.length<8) bad.push({lvl:li+1,adv:[st.adv.x,st.adv.y],from,to:[st.mons[0].x,st.mons[0].y],waterTo:!!lv.water[E.idx(st.mons[0].x,st.mons[0].y)],rdTo:E.rangeDist(E.lvOf(st),E.idx(st.mons[0].x,st.mons[0].y),a)});
 }
}
console.log(bad.length===0?'ok  ningún monstruo que podía atacar se queda fuera de alcance ('+tot+' casos)':'FALLO '+JSON.stringify(bad)); if(bad.length) process.exit(1);
}
