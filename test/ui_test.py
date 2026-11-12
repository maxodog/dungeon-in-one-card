import asyncio, sys
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, has_touch=True, is_mobile=True)
        page = await ctx.new_page()
        errs=[]
        page.on('pageerror', lambda e: errs.append('PAGEERR '+str(e)))
        page.on('console', lambda m: errs.append('CONSOLE '+m.text) if m.type=='error' and 'fonts' not in m.text.lower() and 'ERR_' not in m.text else None)
        await page.goto('file:///home/claude/dungeon-in-one-card/index.html')
        await page.wait_for_timeout(500)
        await page.screenshot(path='/tmp/s1_start.png', full_page=True)
        await page.click('#btnRoll'); await page.wait_for_timeout(1000)
        await page.screenshot(path='/tmp/s2_rolled.png', full_page=True)
        dice = page.locator('#diceRow [data-d]')
        for i,k in enumerate(['spd','atk','def']):
            await page.locator(f'#diceRow [data-d="{i}"]').click()
            await page.locator(f'#chips [data-k="{k}"]').click()
        await page.wait_for_timeout(200)
        await page.screenshot(path='/tmp/s3_assigned.png', full_page=True)
        await page.click('#btnConfirm'); await page.wait_for_timeout(300)
        await page.screenshot(path='/tmp/s4_move.png', full_page=True)
        n = await page.locator('.tile.reach').count()
        print('reach tiles', n)
        if n:
            await page.locator('.tile.reach').first.click(); await page.wait_for_timeout(500)
        await page.click('#btnEnd'); await page.wait_for_timeout(3500)
        await page.screenshot(path='/tmp/s5_after.png', full_page=True)
        print('log:', await page.inner_text('#log'))
        print('errors:', errs)
        await b.close()
asyncio.run(main())
