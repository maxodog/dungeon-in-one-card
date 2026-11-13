import asyncio, json, subprocess
from playwright.async_api import async_playwright
def st(game, items):
    js="const E=require('/home/claude/dungeon-in-one-card/engine.js');console.log(JSON.stringify(E.newRun('paladin','%s',%s)));"%(game,json.dumps(items))
    return subprocess.check_output(['node','-e',js]).decode()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':390,'height':780}, is_mobile=True, has_touch=True)
        await ctx.add_init_script("localStorage.setItem('dioc-run-v3', %s)" % json.dumps(st('base',[])))
        page = await ctx.new_page(); errs=[]
        page.on('pageerror', lambda e: errs.append(str(e)))
        await page.goto('file:///home/claude/dungeon-in-one-card/index.html'); await page.wait_for_timeout(300)
        print('versión en menú:', await page.evaluate("(document.querySelector('.fine')||{}).textContent"))
        await page.click('#mContinue'); await page.wait_for_timeout(400)
        cnt = lambda: page.evaluate("document.querySelectorAll('.herospot').length")
        print('manchas héroe al inicio:', await cnt())
        await page.add_style_tag(content='.token.adv{display:none!important}')
        await page.screenshot(path='/tmp/spot_notoken.png')
        # mover: tirar dados, confirmar y mover
        await page.evaluate("document.querySelector('#btnRoll').click()"); await page.wait_for_timeout(1200)
        print('tras tirar:', await cnt())
        await page.screenshot(path='/tmp/spot_after.png')
        print(errs); await b.close()
asyncio.run(main())
