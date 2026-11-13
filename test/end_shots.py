import asyncio, json, subprocess
from playwright.async_api import async_playwright
def mk(js): return subprocess.check_output(['node','-e',"const E=require('/home/claude/dungeon-in-one-card/engine.js');"+js+";console.log(JSON.stringify(st));"]).decode()
S={
'win':mk("const st=E.newRun('paladin','base',[]);E.setupLevel(st,11);st.adv.hp=4;st.adv.atk=3;st.adv.def=3;st.mons=[{id:1,x:3,y:4,hp:1,maxHp:5,spd:5,atk:5,def:5,rng:5}];st.phase='move';st.turn={dice:[5,5,5],assign:{spd:0,atk:1,def:2},sel:-1,spd:6,atk:6,def:6,spdLeft:6,atkLeft:6};st.totalTurns=95;st.stats={kills:23,hits:31,dmgIn:14,blocks:12,deaths:1}"),
'lose':mk("const st=E.newRun('mage','base',[]);E.setupLevel(st,10);st.adv.hp=1;st.mons=[{id:1,x:1,y:4,hp:5,maxHp:5,spd:3,atk:7,def:7,rng:2}];st.phase='move';st.turn={dice:[1,1,1],assign:{spd:0,atk:1,def:2},sel:-1,spd:2,atk:2,def:2,spdLeft:0,atkLeft:0};st.totalTurns=64;st.stats={kills:9,hits:14,dmgIn:17,blocks:0,deaths:2}")}
async def one(name, vw, vh, mobile):
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        ctx=await b.new_context(viewport={'width':vw,'height':vh},device_scale_factor=2 if mobile else 1,is_mobile=mobile,has_touch=mobile)
        await ctx.add_init_script("localStorage.setItem('dioc-run-v3', %s)"%json.dumps(S[name]))
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file:///home/claude/dungeon-in-one-card/index.html'); await pg.wait_for_timeout(300); await pg.click('#mContinue'); await pg.wait_for_timeout(300)
        if name=='win': await pg.locator('.tile.target').click()
        else: await pg.click('#btnEnd')
        await pg.wait_for_timeout(4500)
        await pg.screenshot(path=f'/tmp/end_{name}_{"m" if mobile else "d"}.png',full_page=True); print(name,mobile,errs); await b.close()
async def main():
    for n in ('win','lose'):
        await one(n,390,844,True); await one(n,1280,900,False)
asyncio.run(main())
