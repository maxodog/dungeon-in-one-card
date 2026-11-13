import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for game, hero, first in [('base','corsair','Dungeon'),('peak','sherpa',None),('hell',None,None)]:
            ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=1, has_touch=True, is_mobile=True)
            page = await ctx.new_page(); errs=[]
            page.on('pageerror', lambda e: errs.append(str(e)))
            await page.goto('file:///home/claude/dungeon-in-one-card/index.html'); await page.wait_for_timeout(400)
            await page.click('#mNew'); await page.click(f'[data-game="{game}"]'); await page.wait_for_timeout(200)
            if game=='base':
                await page.click('#moreH'); await page.wait_for_timeout(200)
            h = hero or await page.locator('[data-hero]').first.get_attribute('data-hero')
            await page.click(f'[data-hero="{h}"]'); await page.wait_for_timeout(300)
            heads = await page.locator('.pack-h').all_inner_texts()
            n = await page.locator('.item-card').count()
            # orden DOM: cada título seguido de sus cartas
            order = await page.evaluate("[...document.querySelectorAll('#itList > *')].map(e=>e.classList.contains('pack-h')?'H:'+e.textContent.trim():'c').join(',')")
            print(game, '| títulos:', [t.replace('\n',' ') for t in heads], '| cartas', n)
            print('   ', order[:200])
            await page.screenshot(path=f'/tmp/items_{game}.png', full_page=True)
            # selección sigue funcionando
            c0 = await page.locator('.item-card.chosen').count()
            await page.locator('.item-card').first.click(); await page.wait_for_timeout(100)
            c1 = await page.locator('.item-card.chosen').count()
            assert c1 <= 3, (c0, c1)
            print('   errores', errs); await ctx.close()
        await b.close()
asyncio.run(main())
