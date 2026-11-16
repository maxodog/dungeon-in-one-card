# Si la partida se guardó con el nivel ya vencido (sin monstruos), al retomarla aparece la pantalla de mejora
import asyncio, subprocess, json
from playwright.async_api import async_playwright
ENG = '/home/claude/dungeon-in-one-card/src/engine.js'; URL = 'file:///home/claude/dungeon-in-one-card/index.html'
ST = subprocess.check_output(['node', '-e', f"const E=require('{ENG}'); const st=E.newRun('knight','base',[]); E.setupLevel(st,1); st.mons=[]; st.phase='move'; E.rollTurn(st); console.log(JSON.stringify(st));"]).decode().strip()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx = await b.new_context(locale='es-CL', viewport={'width': 390, 'height': 844}); pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.evaluate("s => localStorage.setItem('dioc-run-v3:base', s)", ST); await pg.goto(URL); await pg.wait_for_timeout(300)
        await pg.click('[data-res="base"]'); await pg.wait_for_timeout(800)
        sheet = await pg.locator('#veil .choice[data-c="atk"]').count()
        if sheet: await pg.click('#veil .choice[data-c="atk"]'); await pg.wait_for_timeout(1500)
        lvl = await pg.evaluate("document.querySelector('#lvlName').textContent")
        print('pantalla de mejora:', bool(sheet), '| nivel ahora:', lvl, '| errores', errs)
        print('ok' if sheet and lvl and not errs else 'FAIL'); await b.close()
asyncio.run(main())
