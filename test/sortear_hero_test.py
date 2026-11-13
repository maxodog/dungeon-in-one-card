import asyncio, json, subprocess
from playwright.async_api import async_playwright
def st(game, items):
    js="const E=require('/home/claude/dungeon-in-one-card/engine.js');const st=E.newRun('paladin','%s',%s);console.log(JSON.stringify(st));"%(game,json.dumps(items))
    return subprocess.check_output(['node','-e',js]).decode()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ua='Mozilla/5.0 (Linux; Android 10; SM-A105M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
        ctx = await b.new_context(viewport={'width':360,'height':740}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=ua)
        page = await ctx.new_page(); errs=[]
        page.on('pageerror', lambda e: errs.append(str(e)))
        await page.goto('file:///home/claude/dungeon-in-one-card/index.html'); await page.wait_for_timeout(300)
        # --- Sortear sin saltar arriba
        await page.click('#mNew'); await page.wait_for_timeout(200)
        await page.evaluate("document.querySelector('[data-game=peak]')&&document.querySelector('[data-game=peak]').click()")
        await page.wait_for_timeout(200)
        await page.evaluate("document.querySelector('[data-hero]').click()"); await page.wait_for_timeout(300)
        has = await page.evaluate("!!document.querySelector('#itRoll')"); print('pantalla objetos:', has)
        await page.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)"); await page.wait_for_timeout(100)
        y0 = await page.evaluate("scrollY")
        await page.evaluate("document.querySelector('#itRoll').click()"); await page.wait_for_timeout(200)
        y1 = await page.evaluate("scrollY")
        n = await page.evaluate("document.querySelectorAll('.item-card.chosen').length")
        print('scroll antes/después:', y0, y1, '| elegidos:', n, 'OK' if y0>0 and abs(y1-y0)<3 and n==3 else 'FALLO')
        # --- héroe visible
        await ctx.add_init_script("localStorage.setItem('dioc-run-v3', %s)" % json.dumps(st('base',[])))
        pg = await ctx.new_page()
        await pg.goto('file:///home/claude/dungeon-in-one-card/index.html'); await pg.wait_for_timeout(300)
        await pg.click('#mContinue'); await pg.wait_for_timeout(400)
        info = await pg.evaluate("(()=>{const t=document.querySelector('.token.pj');const r=t.getBoundingClientRect();const s=t.querySelector('svg').getBoundingClientRect();const cs=getComputedStyle(t,'::before');return {r:[r.x,r.y,r.width,r.height],svg:[s.width,s.height],bg:cs.backgroundColor}})()")
        print('hero', info)
        await pg.screenshot(path='/tmp/hero_android.png')
        print(errs); await b.close()
asyncio.run(main())
