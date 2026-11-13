import asyncio, json, subprocess
from playwright.async_api import async_playwright
js="const E=require('/home/claude/dungeon-in-one-card/engine.js');console.log(JSON.stringify(E.newRun('paladin','base',[])));"
st=subprocess.check_output(['node','-e',js]).decode()
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        ctx=await b.new_context(viewport={'width':390,'height':780},is_mobile=True,has_touch=True)
        await ctx.add_init_script("localStorage.setItem('dioc-run-v3', %s)"%json.dumps(st))
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file:///home/claude/dungeon-in-one-card/index.html'); await pg.wait_for_timeout(300); await pg.click('#mContinue'); await pg.wait_for_timeout(500)
        await pg.click('#btnSnd'); await pg.wait_for_timeout(300)
        print('hoja:', await pg.evaluate("document.querySelector('#veil h3').textContent"), '| casillas:', await pg.evaluate("[...document.querySelectorAll('#veil input')].map(i=>i.id+':'+(i.type=='checkbox'?i.checked:i.value))"))
        await pg.screenshot(path='/tmp/snd_sheet.png')
        await pg.click('#oMus'); await pg.click('#oSfx'); await pg.wait_for_timeout(200)
        print('guardado:', await pg.evaluate("[localStorage.getItem('dioc-music'),localStorage.getItem('dioc-sound')]"), '| botón silenciado:', await pg.evaluate("document.querySelector('#btnSnd').classList.contains('muted')"))
        await pg.click('#oOk'); print(errs); await b.close()
asyncio.run(main())
