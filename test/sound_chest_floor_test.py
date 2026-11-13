import asyncio, json, subprocess
from playwright.async_api import async_playwright
def st(game, mons_js, extra=''):
    js="""const E=require('/home/claude/dungeon-in-one-card/engine.js');const st=E.newRun('paladin','%s',[]);%s
    st.phase='move'; st.turn={dice:[3,3,3],assign:{spd:0,atk:1,def:2,rng:-1},sel:-1,lock:-1,ranger:false,rerolled:false,spd:8,atk:8,def:4,rng:2,spdLeft:8,atkLeft:8}; st.adv.x=4; st.adv.y=4; st.totalTurns=3;%s console.log(JSON.stringify(st));"""%(game,mons_js,extra)
    return subprocess.check_output(['node','-e',js]).decode()
SPY="window.__s=[];const o=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(){window.__s.push(+this.buffer.duration.toFixed(2));return o.apply(this,arguments)}"
async def go(p, state, label, action):
    b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
    ctx = await b.new_context(viewport={'width':390,'height':780}, is_mobile=True, has_touch=True)
    await ctx.add_init_script("localStorage.setItem('dioc-run-v3', %s)" % json.dumps(state)); await ctx.add_init_script(SPY)
    page = await ctx.new_page(); errs=[]; page.on('pageerror', lambda e: errs.append(str(e)))
    await page.goto('file:///home/claude/dungeon-in-one-card/index.html'); await page.wait_for_timeout(300)
    await page.click('#mContinue'); await page.wait_for_timeout(1200)
    await action(page); print(label, await page.evaluate("window.__s"), errs); await b.close()
async def chest(page):
    t = await page.evaluate("[...document.querySelectorAll('.tile.target')].map(x=>+x.dataset.i)"); print('objetivos', t)
    await page.locator(f'.tile[data-i="{t[0]}"]').click(); await page.wait_for_timeout(800)
async def floor(page):
    t = await page.evaluate("[...document.querySelectorAll('.tile.target')].map(x=>+x.dataset.i)")
    await page.locator(f'.tile[data-i="{t[0]}"]').click(); await page.wait_for_timeout(1500)
    await page.evaluate("window.__s.length=0")
    btn = page.locator('#veil .choice').first; await btn.click(); await page.wait_for_timeout(1200)
async def main():
    async with async_playwright() as p:
        await go(p, st('peak',"","st.adv.x=1;st.adv.y=4;"), 'cofre (esperado ~0.9 s):', chest)
        await go(p, st('base',"st.mons=[st.mons[0]];st.mons[0].x=4;st.mons[0].y=3;st.mons[0].hp=1;"), 'piso siguiente (esperado ~0.5 s):', floor)
asyncio.run(main())
