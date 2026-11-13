import asyncio, json, subprocess
from playwright.async_api import async_playwright
def st(hero='paladin'):
    js="const E=require('/home/claude/dungeon-in-one-card/engine.js');console.log(JSON.stringify(E.newRun('%s','base',[])));"%hero
    return subprocess.check_output(['node','-e',js]).decode()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
        for w,h in ((320,640),(360,740),(375,780),(390,780),(412,860)):
            ctx = await b.new_context(viewport={'width':w,'height':h}, is_mobile=True, has_touch=True)
            await ctx.add_init_script("localStorage.setItem('dioc-run-v3', %s)" % json.dumps(st()))
            page = await ctx.new_page(); errs=[]
            page.on('pageerror', lambda e: errs.append(str(e))); page.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
            await page.goto('file:///home/claude/dungeon-in-one-card/index.html'); await page.wait_for_timeout(300)
            await page.click('#mContinue'); await page.wait_for_timeout(600)
            await page.evaluate("document.body.click()"); await page.wait_for_timeout(800)
            ov = await page.evaluate("(()=>{const r=document.querySelector('.top-actions').getBoundingClientRect();const t=document.querySelector('.top');return {actionsRight:Math.round(r.right), vw:innerWidth, topScroll:t.scrollWidth, topClient:t.clientWidth, docW:document.documentElement.scrollWidth}})()")
            print(w,h,'cabecera', ov)
            # contar clips decodificados llamando a la reproducción de cada grupo
            n = await page.evaluate("""(async()=>{ const c=[]; 
              const AC=window.AudioContext; let cnt=0;
              const orig=AudioBufferSourceNode.prototype.start; const seen=[]; AudioBufferSourceNode.prototype.start=function(){seen.push(this.buffer? +this.buffer.duration.toFixed(2):null); return orig.apply(this,arguments)};
              window.__seen=seen; return Object.keys(SND_CLIPS).length })()""")
            print('clips en página:', n)
            await page.screenshot(path=f'/tmp/snd_{w}.png')
            print(errs); await ctx.close()
        await b.close()
asyncio.run(main())
