import asyncio, json, subprocess
from playwright.async_api import async_playwright
def st(hero,hp=6):
    js="""const E=require('/home/claude/dungeon-in-one-card/engine.js');const st=E.newRun('%s','base',[]);
    st.mons.forEach((m,i)=>{m.x=4;m.y=3-i*2;m.hp=1}); st.adv.hp=HPV; // adyacente y otro lejos
    st.phase='move'; st.turn={dice:[3,3,3],assign:{spd:0,atk:1,def:2,rng:-1},sel:-1,lock:-1,ranger:false,rerolled:false,spd:8,atk:8,def:4,rng:2,spdLeft:8,atkLeft:8}; st.adv.x=4; st.adv.y=4; st.totalTurns=3;console.log(JSON.stringify(st));""".replace("HPV",str(hp))%hero
    return subprocess.check_output(['node','-e',js]).decode()
async def run(p, hero, hp=6):
    b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
    ctx = await b.new_context(viewport={'width':390,'height':780}, is_mobile=True, has_touch=True)
    await ctx.add_init_script("localStorage.setItem('dioc-run-v3', %s)" % json.dumps(st(hero,hp)))
    page = await ctx.new_page(); errs=[]
    page.on('pageerror', lambda e: errs.append(str(e)))
    await page.add_init_script("window.__s=[];const o=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(){window.__s.push(+this.buffer.duration.toFixed(2));return o.apply(this,arguments)}")
    await page.goto('file:///home/claude/dungeon-in-one-card/index.html'); await page.wait_for_timeout(300)
    await page.click('#mContinue'); await page.wait_for_timeout(1500)
    n=await page.evaluate("window.__s.length"); print(hero,'sonidos al cargar:',n)
    tile = await page.evaluate("(()=>{const t=[...document.querySelectorAll('.tile.target')];return t.map(x=>+x.dataset.i)})()")
    print('objetivos', tile)
    await page.locator(f'.tile[data-i="{tile[0]}"]').click(); await page.wait_for_timeout(700)
    print('tras golpear y matar:', await page.evaluate("window.__s"))
    k=await page.evaluate("window.__s.length")
    await page.click('#btnEnd'); await page.wait_for_timeout(9000)
    print('fase de monstruos (ataque + daño/bloqueo/muerte):', (await page.evaluate("window.__s"))[k:], '| hoja:', (await page.evaluate("(document.querySelector('.sheet h3')||{}).textContent")))
    print(errs); await b.close()
async def main():
    async with async_playwright() as p:
        await run(p,"paladin"); await run(p,"mage",1)
asyncio.run(main())
