import asyncio, json, subprocess
from playwright.async_api import async_playwright
def st():
    js="""const E=require('/home/claude/dungeon-in-one-card/engine.js');const st=E.newRun('ranger','base',[]);st.mons.forEach((m,i)=>{m.x=4;m.y=i});
    st.phase='move'; st.turn={dice:[3,3,3],assign:{spd:0,atk:1,def:2,rng:-1},sel:-1,lock:-1,ranger:false,rerolled:false,spd:8,atk:8,def:4,rng:2,spdLeft:8,atkLeft:8}; st.adv.x=4; st.adv.y=4; st.totalTurns=3;console.log(JSON.stringify(st));"""
    return subprocess.check_output(['node','-e',js]).decode()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':390,'height':780}, is_mobile=True, has_touch=True)
        await ctx.add_init_script("localStorage.setItem('dioc-run-v3', %s)" % json.dumps(st()))
        page = await ctx.new_page(); errs=[]
        page.on('pageerror', lambda e: errs.append(str(e)))
        await page.goto('file:///home/claude/dungeon-in-one-card/index.html'); await page.wait_for_timeout(300)
        await page.click('#mContinue'); await page.wait_for_timeout(400)
        reach = await page.evaluate("[...document.querySelectorAll('.tile.reach')].map(t=>+t.dataset.i)")
        left = [i for i in reach if i//5==4 and i%5<4]
        print('alcanzables fila 4:', left)
        await page.locator(f'.tile[data-i="{left[0]}"]').click()
        await page.wait_for_timeout(9000)
        r = await page.evaluate("[document.querySelector('.token.pj').style.getPropertyValue('--flip'), document.querySelectorAll('.herospot').length, document.querySelector('.herospot').style.getPropertyValue('--flip')]")
        print('flip token / manchas / flip mancha:', r, 'OK' if r[0]==r[2] and r[1]==1 else 'FALLO')
        await page.screenshot(path='/tmp/flip.png')
        print(errs); await b.close()
asyncio.run(main())
