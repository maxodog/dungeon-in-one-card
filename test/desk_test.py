import asyncio, json, subprocess, sys
from playwright.async_api import async_playwright
def st(game, items, hero='paladin'):
    js="const E=require('/home/claude/dungeon-in-one-card/src/engine.js');const st=E.newRun('%s','%s',%s);console.log(JSON.stringify(st));"%(hero,game,json.dumps(items))
    return subprocess.check_output(['node','-e',js]).decode()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for (w,h) in ((1920,1080),(1366,768)):
            for game,items,hero in (('base',[],'paladin'),('hell',['pendant','holy','mail'],'demonhunter')):
                ctx = await b.new_context(viewport={'width':w,'height':h})
                await ctx.add_init_script("localStorage.setItem('dioc-run-v3', %s)" % json.dumps(st(game,items,hero)))
                page = await ctx.new_page(); errs=[]
                page.on('pageerror', lambda e: errs.append(str(e)))
                await page.goto('file:///home/claude/dungeon-in-one-card/index.html'); await page.wait_for_timeout(400)
                await page.click('#mContinue'); await page.wait_for_timeout(500)
                await page.click('#btnRoll'); await page.wait_for_timeout(1000)
                ov = await page.evaluate("({sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,t:getComputedStyle(document.querySelector('.app')).getPropertyValue('--t'),board:document.querySelector('#board').getBoundingClientRect().width})")
                await page.screenshot(path='/tmp/dk_%s_%d.png'%(game,w))
                print(game,w,h,ov,errs)
                await ctx.close()
        # menús
        ctx = await b.new_context(viewport={'width':1920,'height':1080}); page = await ctx.new_page()
        await page.goto('file:///home/claude/dungeon-in-one-card/index.html'); await page.wait_for_timeout(500)
        await page.screenshot(path='/tmp/dk_menu.png')
        await page.click('#mNew'); await page.wait_for_timeout(500); await page.screenshot(path='/tmp/dk_adv.png')
        await page.click('[data-game="hell"]'); await page.wait_for_timeout(400); await page.screenshot(path='/tmp/dk_hero.png', full_page=True)
        await b.close()
asyncio.run(main())
