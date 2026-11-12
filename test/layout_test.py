import asyncio, json, subprocess
from playwright.async_api import async_playwright
def st(game, items):
    js="const E=require('/home/claude/dungeon-in-one-card/src/engine.js');const st=E.newRun('paladin','%s',%s);console.log(JSON.stringify(st));"%(game,json.dumps(items))
    return subprocess.check_output(['node','-e',js]).decode()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for game,items in (('base',[]),('hell',['pendant','holy','mail'])):
          for vh in (664,720,780,844):
            ctx = await b.new_context(viewport={'width':390,'height':vh}, device_scale_factor=1, is_mobile=True, has_touch=True)
            await ctx.add_init_script("localStorage.setItem('dioc-run-v3', %s)" % json.dumps(st(game,items)))
            page = await ctx.new_page(); errs=[]
            page.on('pageerror', lambda e: errs.append(str(e)))
            await page.goto('file:///home/claude/dungeon-in-one-card/index.html'); await page.wait_for_timeout(300)
            await page.click('#mContinue'); await page.wait_for_timeout(300)
            r = lambda: page.evaluate("({t:getComputedStyle(document.documentElement).getPropertyValue('--t'), h:document.documentElement.scrollHeight, vh:innerHeight})")
            a = await r()
            await page.click('#btnRoll'); await page.wait_for_timeout(1000)
            bb = await r()
            await page.screenshot(path='/tmp/ly_%s_%d.png'%(game,vh))
            print(game, vh, 'inicio', a, '| tras tirar', bb, errs)
            await ctx.close()
        await b.close()
asyncio.run(main())
