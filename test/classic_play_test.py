import asyncio, json, subprocess
from playwright.async_api import async_playwright
js="const E=require('/home/claude/dungeon-in-one-card/engine.js');const st=E.newRun('paladin','hell',[]);E.rollTurn(st);console.log(JSON.stringify(st));"
state=subprocess.check_output(['node','-e',js]).decode()
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        ctx=await b.new_context(viewport={'width':1600,'height':900})
        await ctx.add_init_script("localStorage.setItem('dioc-run-v3', %s); localStorage.setItem('dioc-classic','0')"%json.dumps(state))
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file:///home/claude/dungeon-in-one-card/index.html'); await pg.wait_for_timeout(300); await pg.click('#mContinue'); await pg.wait_for_timeout(700)
        print('clásico apagado -> body.classic:', await pg.evaluate("document.body.classList.contains('classic')"), '| nombre:', await pg.evaluate("document.querySelector('#gameName').textContent"))
        await pg.click('#classicBtn'); await pg.wait_for_timeout(500)
        print('clásico encendido ->', await pg.evaluate("document.body.classList.contains('classic')"), '| guardado:', await pg.evaluate("localStorage.getItem('dioc-classic')"), '| img:', await pg.evaluate("getComputedStyle(document.querySelector('#card')).backgroundImage.slice(-40)"))
        # repartir dados
        dice=pg.locator('.dice-row .die')
        for i,k in enumerate([0,1,2]):
            await dice.nth(i).click(); await pg.locator('.chip').nth(k).click()
        await pg.wait_for_timeout(300)
        await pg.click('#actions .btn.primary, #actions button:has-text("Confirmar")'); await pg.wait_for_timeout(600)
        await pg.screenshot(path='/tmp/cp_reach.png')
        n=await pg.locator('.tile.reach').count(); print('casillas alcanzables:',n)
        await pg.locator('.tile.reach').first.click(); await pg.wait_for_timeout(900)
        print('héroe mueve ->', await pg.evaluate("document.querySelector('.token.pj').style.cssText"))
        await pg.screenshot(path='/tmp/cp_moved.png')
        print(errs); await b.close()
asyncio.run(main())
