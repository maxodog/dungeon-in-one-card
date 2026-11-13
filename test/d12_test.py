import asyncio, json, subprocess
from playwright.async_api import async_playwright
js="const E=require('/home/claude/dungeon-in-one-card/engine.js');const st=E.newRun('ranger','harbour',['eye','flame','herbs']);E.rollTurn(st);console.log(JSON.stringify(st));"
state=subprocess.check_output(['node','-e',js]).decode()
SPY="window.__s=[];const o=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(){window.__s.push(+this.buffer.duration.toFixed(2));return o.apply(this,arguments)};"
async def go(vw,vh,mobile,tag):
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        ctx=await b.new_context(viewport={'width':vw,'height':vh},device_scale_factor=1 if not mobile else 2,is_mobile=mobile,has_touch=mobile)
        await ctx.add_init_script("localStorage.setItem('dioc-run-v3', %s)"%json.dumps(state)); await ctx.add_init_script(SPY)
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file:///home/claude/dungeon-in-one-card/index.html'); await pg.wait_for_timeout(300); await pg.click('#mContinue'); await pg.wait_for_timeout(500)
        await pg.screenshot(path=f'/tmp/d12_{tag}_a.png')
        await pg.click('[data-item="eye"]'); await pg.wait_for_timeout(400); await pg.click('#veil button:has-text("Usar")'); await pg.wait_for_timeout(400)
        await pg.click('#veil [data-e="1"]'); await pg.wait_for_timeout(1500)
        print(tag,'sonidos:',await pg.evaluate('window.__s'),'| d12 en turno:',await pg.evaluate("document.querySelectorAll('.dice-row .die.d12').length"),errs)
        await pg.click('.dice-row .die.d12'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f'/tmp/d12_{tag}_b.png'); await b.close()
async def main():
    await go(1280,720,False,'pc'); await go(390,844,True,'mov')
asyncio.run(main())
