import asyncio, sys, threading, http.server, socketserver, functools
from playwright.async_api import async_playwright
ROOT='/home/claude/dungeon-in-one-card'
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
def serve():
    h=functools.partial(Q,directory=ROOT); socketserver.TCPServer.allow_reuse_address=True; s=socketserver.TCPServer(('127.0.0.1',0),h); globals()['PORT']=s.server_address[1]
    threading.Thread(target=s.serve_forever,daemon=True).start(); return s
# registra qué se reproduce de verdad: elementos <audio> con play() resuelto y buffers del AudioContext
SPY="""window.__p=[];window.__src=0;
const o=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){const n=this.src.split('/').pop();const r=o.apply(this,arguments);if(n.endsWith('.mp3')&&r&&r.then)r.then(()=>window.__p.push(n),()=>window.__p.push('BLOQ:'+n));return r};
const S=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(){window.__src++;return S.apply(this,arguments)};"""
async def main():
    s=serve(); mode=sys.argv[1] if len(sys.argv)>1 else 'strict'
    args=['--no-sandbox'] + (['--autoplay-policy=no-user-gesture-required'] if mode=='free' else [])
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=args)
        ctx=await b.new_context(viewport={'width':390,'height':780},is_mobile=True,has_touch=True)
        await ctx.add_init_script(SPY)
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('http://127.0.0.1:%d/index.html'%PORT); await pg.wait_for_timeout(2500)
        st=lambda: pg.evaluate("({el:window.__p.slice(), buf:window.__src})")
        print(mode,'al abrir, sin tocar →', await st())
        await pg.touchscreen.tap(200,400); await pg.wait_for_timeout(2500)
        print(mode,'tras primer toque →', await st(), errs); await b.close()
    s.shutdown()
asyncio.run(main())
