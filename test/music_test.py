import asyncio, json, subprocess, threading, http.server, socketserver, functools, os
from playwright.async_api import async_playwright
ROOT='/home/claude/dungeon-in-one-card'
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
def serve():
    h=functools.partial(Q,directory=ROOT); socketserver.TCPServer.allow_reuse_address=True; s=socketserver.TCPServer(('127.0.0.1',0),h); globals()['PORT']=s.server_address[1]
    threading.Thread(target=s.serve_forever,daemon=True).start(); return s
def st(game, hero, steps):
    js="const E=require('%s/engine.js');const st=E.newRun('%s','%s',%s);for(let i=0;i<%d;i++)E.nextLevel(st);console.log(JSON.stringify(st));"%(ROOT,hero,game,json.dumps(['herbs','flame','wyrm'] if game in('peak','harbour','hell') else []),steps)
    return subprocess.check_output(['node','-e',js]).decode()
SPY="window.__p=[];const o=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){window.__p.push(this.src.split('/').pop());return o.apply(this,arguments)};"
async def case(p, game, steps, label):
    b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
    ctx = await b.new_context(viewport={'width':390,'height':780}, is_mobile=True, has_touch=True)
    await ctx.add_init_script("localStorage.setItem('dioc-run-v3', %s)" % json.dumps(st(game,'paladin',steps))); await ctx.add_init_script(SPY)
    page = await ctx.new_page(); errs=[]; reqs=[]
    page.on('pageerror', lambda e: errs.append(str(e))); page.on('request', lambda r: reqs.append(r.url.split('/')[-1]) if '/musica/' in r.url else None)
    await page.goto('http://127.0.0.1:%d/index.html'%PORT+''); await page.wait_for_timeout(400)
    await page.click('#mContinue'); await page.wait_for_timeout(3000)
    played = await page.evaluate("window.__p.filter(x=>!x.startsWith('data:')&&x.endsWith('.mp3'))")
    print(label, '| pidió:', [r for r in reqs if r.endswith('.mp3')], '| elementos:', played, errs); await b.close()
async def main():
    s=serve()
    async with async_playwright() as p:
        await case(p,'base',0,'base piso 1 (normal)')
        await case(p,'base',3,'base piso 4 (demonio=jefe)')
        await case(p,'mguf',3,'M\'Guf-yn piso 4 (ogro=jefe)')
        await case(p,'peak',9,'Peak piso 10 (hechicero=jefe)')
        await case(p,'harbour',3,'Harbour piso 4 (kraken=jefe)')
        await case(p,'hell',0,'Hell piso 1')
        await case(p,'hell',3,'Hell piso 4 (jefe)')
    s.shutdown()
asyncio.run(main())
