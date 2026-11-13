import asyncio, json, subprocess
from playwright.async_api import async_playwright

def node(js): return subprocess.check_output(['node','-e',"const E=require('/home/claude/dungeon-in-one-card/engine.js');"+js]).decode().strip()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, has_touch=True, is_mobile=True)
        page = await ctx.new_page(); errs=[]
        page.on('pageerror', lambda e: errs.append('PAGEERR '+str(e)))
        page.on('console', lambda m: errs.append('CONSOLE '+m.text) if m.type=='error' else None)
        await page.goto('file:///home/claude/dungeon-in-one-card/index.html'); await page.wait_for_timeout(500)
        await page.click('#mNew'); await page.wait_for_timeout(300)
        await page.screenshot(path='/tmp/e0_adv.png', full_page=True)
        print('portadas', await page.locator('.adv-card').count(), await page.evaluate("[...document.querySelectorAll('.adv-card img')].every(i=>i.complete&&i.naturalWidth>0)"))
        # --- M'Guf-yn: héroes propios y botón de otras expansiones
        await page.click('[data-game="mguf"]'); await page.wait_for_timeout(200)
        hs = await page.locator('[data-hero]').evaluate_all("e=>e.map(x=>x.dataset.hero)")
        print('mguf héroes por defecto:', hs)
        await page.click('#moreH'); await page.wait_for_timeout(300)
        hs2 = await page.locator('[data-hero]').evaluate_all("e=>e.map(x=>x.dataset.hero)")
        print('mguf con otras expansiones:', hs2)
        await page.screenshot(path='/tmp/e1_heroes_more.png', full_page=True)
        await page.click('#moreH'); await page.wait_for_timeout(200)
        print('oculta de nuevo:', await page.locator('[data-hero]').count())
        # base con corsario desde "otras"
        await page.click('#back'); await page.click('[data-game="base"]'); await page.wait_for_timeout(200)
        print('base héroes:', await page.locator('[data-hero]').count())
        await page.click('#moreH'); await page.wait_for_timeout(200)
        print('base + otras:', await page.locator('[data-hero]').count(), '| corsario', await page.locator('[data-hero="corsair"]').is_visible())
        await page.click('[data-hero="corsair"]'); await page.wait_for_timeout(300)
        print('objetos base (opcional): botón', await page.inner_text('#itGo'), '| cartas', await page.locator('.item-card').count(), '| cloak/sands?', await page.locator('[data-it="cloak"], [data-it="sands"]').count())
        await page.screenshot(path='/tmp/e2_items_opt.png', full_page=True)
        await page.click('#itRoll'); await page.wait_for_timeout(200)
        print('3 sorteados', await page.locator('.item-card.chosen').count(), await page.inner_text('#itGo'))
        await page.click('#itNone'); await page.wait_for_timeout(200)
        print('ninguno', await page.locator('.item-card.chosen').count(), await page.inner_text('#itGo'))
        await page.click('#itGo'); await page.wait_for_timeout(400)
        print('juego base con corsario:', await page.inner_text('#heroTag'), await page.inner_text('#lvlNum'), '| items', await page.locator('#items .item').count())
        await page.click('#btnRoll'); await page.wait_for_timeout(1000)
        for i,k in enumerate(['spd','atk','def']):
            await page.click(f'#diceRow [data-d="{i}"]'); await page.click(f'#chips [data-k="{k}"]')
        await page.click('#btnConfirm'); await page.wait_for_timeout(300)
        print('corsario botón:', await page.inner_text('#btnAbil'))
        await page.click('#btnAbil'); await page.wait_for_timeout(200)
        n = await page.locator('.tile.reach').count(); print('casillas por abordaje:', n)
        await page.screenshot(path='/tmp/e3_corsair.png', full_page=True)
        await page.locator('.tile.reach').nth(3).click(); await page.wait_for_timeout(1500)
        print('tras abordaje: Mov', await page.locator('#chips .chip .val').first.inner_text(), '| botón hab', await page.locator('#btnAbil').count(), '|', await page.inner_text('#log'))
        print('errores', errs)
        await b.close()
asyncio.run(main())
