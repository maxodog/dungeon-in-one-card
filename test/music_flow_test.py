import asyncio, json, subprocess, threading, http.server, socketserver, functools
from playwright.async_api import async_playwright
exec(open('/home/claude/dungeon-in-one-card/test/music_test.py').read().split("SPY=")[0].split("def st(")[0])
ROOT='/home/claude/dungeon-in-one-card'
def st(game, steps):
    js="const E=require('%s/engine.js');const st=E.newRun('paladin','%s',%s);for(let i=0;i<%d;i++)E.nextLevel(st);console.log(JSON.stringify(st));"%(ROOT,game,json.dumps([]),steps)
    return subprocess.check_output(['node','-e',js]).decode()
SPY="""window.__els=[];const o=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){if(!this.src.startsWith('data:'))window.__els.push(this);return o.apply(this,arguments)};
window.__bs=[];const s0=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(){if(this.buffer&&this.buffer.duration>20)window.__bs.push([+this.buffer.duration.toFixed(1),this.loop]);return s0.apply(this,arguments)};"""
async def open_(p, game, steps):
    b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
    ctx = await b.new_context(viewport={'width':390,'height':780}, is_mobile=True, has_touch=True)
    await ctx.add_init_script("localStorage.setItem('dioc-run-v3', %s)" % json.dumps(st(game,steps))); await ctx.add_init_script(SPY)
    page = await ctx.new_page(); reqs=[]; errs=[]
    page.on('pageerror', lambda e: errs.append(str(e))); page.on('request', lambda r: reqs.append(r.url.split('/')[-1]) if '/musica/' in r.url else None)
    await page.goto('http://127.0.0.1:%d/index.html'%PORT+''); await page.wait_for_timeout(400)
    await page.click('#mContinue'); await page.wait_for_timeout(2500)
    return b,page,reqs,errs
async def main():
    s=serve()
    async with async_playwright() as p:
        b,page,reqs,errs=await open_(p,'base',3)
        print('bucle (duración, loop):', await page.evaluate("window.__bs"), reqs, errs); await b.close()
        b,page,reqs,errs=await open_(p,'base',0)
        first=[r for r in reqs]
        # saltar casi al final de la canción para que termine y entre otra
        await page.evaluate("window.__els[0].dispatchEvent(new Event('ended'))"); await page.wait_for_timeout(4000)
        print('estado:', await page.evaluate("(()=>{const e=window.__els[0];return [e.src.split('/').pop(),e.currentTime,e.duration,e.paused,e.ended,e.loop,e.readyState]})()"))
        print('al terminar:', first, '->', reqs, errs)
        # cambio de piso normal->normal: no debe cortar la canción
        await page.evaluate("document.querySelector('#btnMenu')&&0"); await b.close()
    s.shutdown()
asyncio.run(main())
