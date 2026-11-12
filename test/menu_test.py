import asyncio, json, subprocess
from playwright.async_api import async_playwright

def node(js): return subprocess.check_output(['node','-e',"const E=require('/home/claude/dungeon-in-one-card/engine.js');"+js]).decode().strip()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, has_touch=True, is_mobile=True)
        page = await ctx.new_page(); errs=[]
        page.on('pageerror', lambda e: errs.append('PAGEERR '+str(e)))
        await page.goto('file:///home/claude/dungeon-in-one-card/index.html'); await page.wait_for_timeout(500)
        vis = lambda sel: page.locator(sel).is_visible()
        print('menú: app oculta', not await vis('.app'), '| nueva', await vis('#mNew'), '| contraseña', await vis('#mPass'), '| seguir', await vis('#mContinue'))
        await page.screenshot(path='/tmp/m1_menu.png')
        await page.click('#mNew'); await page.wait_for_timeout(300)
        print('aventuras:', await page.locator('.adv-card').count(), '| portadas cargadas:', await page.evaluate("[...document.querySelectorAll('.adv-card img')].every(i=>i.complete&&i.naturalWidth>0)"))
        await page.screenshot(path='/tmp/m0_adv.png', full_page=True)
        await page.click('[data-game="base"]'); await page.wait_for_timeout(200)
        print('héroes:', await page.locator('.hero-card').count())
        await page.screenshot(path='/tmp/m2_heroes.png', full_page=True)
        await page.click('[data-hero="mage"]'); await page.wait_for_timeout(400)
        print('juego:', await vis('.app'), await page.inner_text('#heroTag'), await page.inner_text('#hpnum'), await page.inner_text('#lvlNum'))
        # contraseña del nivel 1
        await page.click('#btnPass'); await page.wait_for_timeout(300)
        pw = ''.join(await page.locator('.pwshow span').all_inner_texts())
        print('contraseña N1:', pw)
        await page.screenshot(path='/tmp/m3_pwsheet.png')
        r = json.loads(node(f"const g=E.decodePassword('{pw}');console.log(JSON.stringify({{h:g.hero,l:g.levelIdx,hp:g.adv.hp}}))"))
        print('decodifica:', r)
        # mago: tirar y volver a tirar
        await page.click('#pwClose'); await page.click('#btnRoll'); await page.wait_for_timeout(1000)
        print('hab mago:', await page.inner_text('#btnAbil'))
        before = await page.locator('#diceRow .die').count()
        await page.click('#btnAbil'); await page.wait_for_timeout(1000)
        print('tras repetir: dados', before, await page.locator('#diceRow .die').count(), '| botón hab:', await page.locator('#btnAbil').count())
        # menú: seguir en este dispositivo
        await page.click('#btnPass'); await page.click('#pwMenu'); await page.wait_for_timeout(300)
        print('menú de nuevo: seguir', await vis('#mContinue'), '|', (await page.inner_text('#mContinue')).replace('\n',' · '))
        # contraseña inválida
        await page.click('#mPass'); await page.fill('#pwIn','0o0!'); await page.wait_for_timeout(100)
        print('valor filtrado:', await page.input_value('#pwIn'), '| botón deshabilitado', await page.locator('#pwGo').is_disabled())
        await page.fill('#pwIn','0000'); await page.click('#pwGo'); await page.wait_for_timeout(200)
        print('error:', await page.inner_text('#pwErr'))
        # contraseña válida: ranger, nivel 5, vida 3, mejoras
        pw5 = node("const st=E.newRun('ranger');st.adv.hp=3;st.adv.atk=3;st.adv.rng=3;st.adv.def=2;E.setupLevel(st,4);console.log(E.encodePassword(st))")
        await page.fill('#pwIn', pw5.lower()); await page.click('#pwGo'); await page.wait_for_timeout(500)
        print('cargado', pw5, '→', await page.inner_text('#heroTag'), await page.inner_text('#lvlNum'), await page.inner_text('#hpnum'), '|', await page.inner_text('#log'))
        chips = await page.locator('#chips .chip .val').all_inner_texts(); print('base Mov/Atq/Def/Alc:', chips)
        # Ranger: habilidad
        await page.click('#btnRoll'); await page.wait_for_timeout(1000)
        print('hab ranger:', await page.inner_text('#btnAbil'))
        await page.click('#btnAbil'); await page.wait_for_timeout(200)
        print('banner:', await page.inner_text('#bannerText'))
        await page.screenshot(path='/tmp/m4_ranger.png', full_page=True)
        for d,k in [(0,'rng'),(1,'atk'),(2,'def')]:
            await page.click(f'#diceRow [data-d="{d}"]'); await page.click(f'#chips [data-k="{k}"]')
        print('confirmar habilitado:', not await page.locator('#btnConfirm').is_disabled())
        await page.click('#btnConfirm'); await page.wait_for_timeout(300)
        print('chips turno (Mov/Atq/Def/Alc):', await page.locator('#chips .chip .val').all_inner_texts(), '|', await page.inner_text('#log'))
        await page.screenshot(path='/tmp/m5_ranger_move.png', full_page=True)
        # Paladín: conservar dado en el segundo turno
        pwP = node("const st=E.newRun('paladin');console.log(E.encodePassword(st))")
        await page.click('#btnPass'); await page.click('#pwMenu'); await page.wait_for_timeout(200)
        await page.click('#mPass'); await page.fill('#pwIn', pwP); await page.click('#pwGo'); await page.wait_for_timeout(300)
        print('paladín turno 1 botón hab:', await page.locator('#btnAbil').count())
        await page.click('#btnRoll'); await page.wait_for_timeout(1000)
        d=[int(x) for x in await page.locator('#diceRow .die').evaluate_all("els=>els.map(e=>e.getAttribute('aria-label').split(' ')[1])")]
        for i,k in enumerate(['spd','atk','def']):
            await page.click(f'#diceRow [data-d="{i}"]'); await page.click(f'#chips [data-k="{k}"]')
        await page.click('#btnConfirm'); await page.wait_for_timeout(200); await page.click('#btnEnd'); await page.wait_for_timeout(4500)
        print('dados turno 1', d, '| vida', await page.inner_text('#hpnum'), '| fase', await page.inner_text('#bannerText'))
        print('paladín turno 2 botón hab:', await page.inner_text('#btnAbil') if await page.locator('#btnAbil').count() else None)
        if await page.locator('#btnAbil').count():
            await page.click('#btnAbil'); await page.wait_for_timeout(200)
            await page.screenshot(path='/tmp/m6_keep.png')
            await page.locator('#veil .choice[data-k="atk"]').click(); await page.wait_for_timeout(1000)
            d2=await page.locator('#diceRow .die').evaluate_all("els=>els.map(e=>e.getAttribute('aria-label').split(' ')[1])")
            print('dados tras conservar Atq:', d2, '(el dado 0 debe ser', d[1], ') chips:', await page.locator('#chips .chip.locked .val').all_inner_texts())
            # el slot fijo no se puede quitar
            await page.click('#chips [data-k="atk"]'); await page.wait_for_timeout(100)
            print('slot fijo sigue lleno:', await page.locator('#chips .chip.locked').count())
        print('errores:', errs)
        await b.close()
asyncio.run(main())
