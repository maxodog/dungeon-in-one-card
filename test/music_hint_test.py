import asyncio, threading, http.server, socketserver, functools
from playwright.async_api import async_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
h=functools.partial(Q,directory='/home/claude/dungeon-in-one-card'); socketserver.TCPServer.allow_reuse_address=True; s=socketserver.TCPServer(('127.0.0.1',0),h); PORT=s.server_address[1]
threading.Thread(target=s.serve_forever,daemon=True).start()
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        ctx=await b.new_context(viewport={'width':390,'height':780},is_mobile=True,has_touch=True,device_scale_factor=2)
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('http://127.0.0.1:%d/index.html'%PORT); await pg.wait_for_timeout(1800)
        print('aviso visible:', await pg.locator('#musicHint').count(), await pg.locator('#musicHint').inner_text())
        await pg.screenshot(path='/tmp/hint.png')
        await pg.touchscreen.tap(200,300); await pg.wait_for_timeout(1500)
        print('aviso tras tocar:', await pg.locator('#musicHint').count(), errs); await b.close()
asyncio.run(main())
