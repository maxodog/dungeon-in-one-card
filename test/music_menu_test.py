import asyncio, json, subprocess, threading, http.server, socketserver, functools
from playwright.async_api import async_playwright
ROOT='/home/claude/dungeon-in-one-card'
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
def serve():
    h=functools.partial(Q,directory=ROOT); socketserver.TCPServer.allow_reuse_address=True; s=socketserver.TCPServer(('127.0.0.1',0),h); globals()['PORT']=s.server_address[1]
    threading.Thread(target=s.serve_forever,daemon=True).start(); return s
js="const E=require('%s/engine.js');const st=E.newRun('paladin','base',[]);st.adv.hp=1;E.setupLevel(st,10);st.mons=[{id:1,x:1,y:4,hp:5,maxHp:5,spd:3,atk:7,def:7,rng:2}];st.phase='move';st.turn={dice:[1,1,1],assign:{spd:0,atk:1,def:2},sel:-1,spd:2,atk:2,def:2,spdLeft:0,atkLeft:0};console.log(JSON.stringify(st));"%ROOT
state=subprocess.check_output(['node','-e',js]).decode()
SPY="window.__p=[];const o=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){window.__p.push(this.src.split('/').pop());return o.apply(this,arguments)};"
async def played(pg): return await pg.evaluate("window.__p.filter(x=>x.endsWith('.mp3'))")
async def main():
    s=serve()
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
        ctx=await b.new_context(viewport={'width':390,'height':780},is_mobile=True,has_touch=True)
        await ctx.add_init_script("localStorage.setItem('dioc-run-v3', %s)"%json.dumps(state)); await ctx.add_init_script(SPY)
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('http://127.0.0.1:%d/index.html'%PORT); await pg.wait_for_timeout(500)
        await pg.mouse.click(10,10); await pg.wait_for_timeout(1500)
        print('menú →', await played(pg))
        await pg.evaluate('window.__p=[]'); await pg.click('#mContinue'); await pg.wait_for_timeout(2500)
        print('mazmorra (nivel 11) →', await played(pg))
        await pg.evaluate('window.__p=[]'); await pg.click('#btnEnd'); await pg.wait_for_timeout(4000)
        print('pantalla derrota, música:', await played(pg), '| hay pantalla final:', await pg.evaluate("!!document.querySelector('.endscr')"))
        await pg.click('#eMenu'); await pg.wait_for_timeout(2500)
        print('de vuelta al menú →', await played(pg), errs); await b.close()
    s.shutdown()
asyncio.run(main())
