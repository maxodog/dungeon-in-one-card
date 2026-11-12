import asyncio, json, subprocess
from playwright.async_api import async_playwright
def st_for(i):
    js="const E=require('/home/claude/dungeon-in-one-card/src/engine.js');const st=E.newRun('demonhunter','hell',['pendant','holy','mail']);E.setupLevel(st,%d,null);console.log(JSON.stringify(st));"%i
    return subprocess.check_output(['node','-e',js]).decode()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for i in range(16):
            ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=1, is_mobile=True, has_touch=True)
            await ctx.add_init_script("localStorage.setItem('dioc-run-v3', %s)" % json.dumps(st_for(i)))
            page = await ctx.new_page(); errs=[]
            page.on('pageerror', lambda e: errs.append(str(e)))
            await page.goto('file:///home/claude/dungeon-in-one-card/index.html'); await page.wait_for_timeout(300)
            await page.click('#mContinue'); await page.wait_for_timeout(300)
            t=(await page.inner_text('.lvl-num')).replace('\n',' ')+' | '+await page.inner_text('#lvlName')
            print(i,t,'| mons',await page.locator('.token.mon').count(),'| dam',await page.locator('.tile.damned').count(),'| stone',await page.locator('.tile.stone').count(),errs)
            if i in (3,5,8,11,15): await page.screenshot(path='/tmp/hb_%d.png'%i)
            await ctx.close()
        await b.close()
asyncio.run(main())
