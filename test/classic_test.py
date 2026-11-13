import asyncio, json, subprocess, sys
from playwright.async_api import async_playwright
def mk(js): return subprocess.check_output(['node','-e',"const E=require('/home/claude/dungeon-in-one-card/engine.js');"+js+";console.log(JSON.stringify(st));"]).decode()
CASES={
 'hell_lord': mk("const st=E.newRun('paladin','hell',[]);for(let i=0;i<15;i++)E.nextLevel(st);E.rollTurn(st)"),
 'base_orc':  mk("const st=E.newRun('ranger','base',[]);for(let i=0;i<2;i++)E.nextLevel(st);E.rollTurn(st)"),
 'peak_wolf': mk("const st=E.newRun('mage','peak',['herbs']);for(let i=0;i<1;i++)E.nextLevel(st);E.rollTurn(st)"),
}
async def shot(name, vw, vh, classic, tag):
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        ctx=await b.new_context(viewport={'width':vw,'height':vh})
        await ctx.add_init_script("localStorage.setItem('dioc-run-v3', %s); localStorage.setItem('dioc-classic','%s')"%(json.dumps(CASES[name]),'1' if classic else '0'))
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file:///home/claude/dungeon-in-one-card/index.html'); await pg.wait_for_timeout(300); await pg.click('#mContinue'); await pg.wait_for_timeout(900)
        # asignar un dado a Mov para ver casillas alcanzables
        await pg.click('.dice-row .die >> nth=0'); await pg.click('.chip >> nth=0'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f'/tmp/cl_{tag}.png'); print(name,tag,errs); await b.close()
async def main():
    await shot('hell_lord',1920,1080,True,'hell_lord')
    await shot('base_orc',1366,768,True,'base_orc')
    await shot('peak_wolf',1920,1080,True,'peak_wolf')
    await shot('base_orc',1920,1080,False,'base_normal')
asyncio.run(main())
