# Una partida guardada por aventura: retomar, abandonar (secuencia de derrota), pausa y aviso al empezar otra
import asyncio, subprocess
from playwright.async_api import async_playwright
def st(js): return subprocess.check_output(['node','-e',"const E=require('/home/claude/dungeon-in-one-card/src/engine.js');"+js+";console.log(JSON.stringify(st))"]).decode().strip()
BASE = st("const st=E.newRun('knight','base',[]);E.setupLevel(st,3);st.adv.hp=4")
PEAK = st("E.useGame('peak');const st=E.newRun('sherpa','peak',E.itemPool('peak').slice(0,3));E.setupLevel(st,2)")
SPY = "window.__sfx=[];"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, has_touch=True, is_mobile=True)
        pg = await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///home/claude/dungeon-in-one-card/index.html'); await pg.wait_for_timeout(300)
        # partida antigua (una sola ranura) + otra en Montaña Eterna
        await pg.evaluate("([a,b]) => { localStorage.setItem('dioc-run-v3', a); localStorage.setItem('dioc-run-v3:peak', b); }", [BASE, PEAK])
        await pg.reload(); await pg.wait_for_timeout(400)
        keys = await pg.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('dioc-run'))"); print('claves:', sorted(keys))
        assert 'dioc-run-v3' not in keys and 'dioc-run-v3:base' in keys
        n = await pg.locator('.rslot').count(); print('partidas en curso:', n, '|', [t.replace('\n', ' · ') for t in await pg.locator('.rslot-t').all_inner_texts()]); assert n == 2
        assert not await pg.locator('#mPass').count(), 'ya no hay contraseñas'
        await pg.screenshot(path='/tmp/s_menu.png', full_page=True)
        # retomar Montaña Eterna
        await pg.click('[data-res="peak"]'); await pg.wait_for_timeout(500)
        print('retomada:', await pg.inner_text('#lvlName'), '| nivel', await pg.inner_text('#lvlNum'))
        # pausa → abandonar
        await pg.click('#btnPass'); await pg.wait_for_timeout(200); await pg.screenshot(path='/tmp/s_pause.png')
        await pg.click('#pwAb'); await pg.wait_for_timeout(200)
        assert 'contará como una derrota' in await pg.inner_text('#veil')
        await pg.click('#abGo'); await pg.wait_for_timeout(3000)
        print('pantalla:', (await pg.inner_text('.end-kicker')), '|', await pg.inner_text('.endscr h2'))
        assert 'abandonada' in (await pg.inner_text('.end-kicker')).lower() and not await pg.locator('#eRetry').count()
        await pg.screenshot(path='/tmp/s_end.png', full_page=True)
        await pg.click('#eMenu'); await pg.wait_for_timeout(300)
        assert await pg.locator('.rslot').count() == 1; print('queda 1 partida en curso')
        # abandonar desde el menú
        await pg.click('[data-ab="base"]'); await pg.wait_for_timeout(200); await pg.click('#abGo'); await pg.wait_for_timeout(3000)
        assert await pg.locator('.endscr').count(); await pg.click('#eMenu'); await pg.wait_for_timeout(300)
        assert await pg.locator('.rslot').count() == 0; print('sin partidas en curso')
        # aviso al empezar otra partida en una aventura con partida guardada
        await pg.evaluate("s => localStorage.setItem('dioc-run-v3:base', s)", BASE); await pg.reload(); await pg.wait_for_timeout(300)
        await pg.click('#mNew'); await pg.wait_for_timeout(200)
        assert await pg.locator('[data-game="base"] .adv-tag.run').count() == 1
        await pg.click('[data-game="base"]'); await pg.wait_for_timeout(200)
        assert await pg.locator('#axRes').count(); await pg.screenshot(path='/tmp/s_adv.png')
        await pg.click('#axRes'); await pg.wait_for_timeout(400); print('retomada desde aventuras:', await pg.inner_text('#lvlNum'))
        print('errores', errs); assert not errs; print('ok  partidas por aventura, pausa y abandono'); await b.close()
asyncio.run(main())
