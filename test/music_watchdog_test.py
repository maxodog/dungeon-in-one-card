# La música se recupera sola: si el navegador la pausa o la canción no carga, el vigilante la reanuda o pasa a otra
import asyncio, threading, http.server, socketserver, functools
from playwright.async_api import async_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Q, directory='/home/claude/dungeon-in-one-card')); PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
SPY = """window.__els = new Set(); const P = HTMLMediaElement.prototype.play;
HTMLMediaElement.prototype.play = function () { if (/musica\\//.test(this.src)) window.__els.add(this); return P.apply(this, arguments); };"""
PLAYING = "[...window.__els].filter(e => !e.paused && /musica\\//.test(e.src)).map(e => e.src.split('/').pop())"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width': 390, 'height': 780}, is_mobile=True, has_touch=True)
        await ctx.add_init_script(SPY)
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://127.0.0.1:%d/index.html' % PORT); await pg.wait_for_timeout(500)
        await pg.touchscreen.tap(200, 700); await pg.wait_for_timeout(2500)
        a = await pg.evaluate(PLAYING); print('suena:', a)
        # el navegador la pausa (p. ej. al volver de otra app)
        await pg.evaluate("[...window.__els].forEach(e => e.pause())"); await pg.wait_for_timeout(300)
        print('pausada:', await pg.evaluate(PLAYING))
        await pg.wait_for_timeout(3500); b2 = await pg.evaluate(PLAYING); print('tras el vigilante:', b2)
        assert b2, 'la música debe reanudarse sola'
        # la canción falla al cargar → pasa a otra
        await pg.evaluate("[...window.__els].filter(e => !e.paused).forEach(e => { e.src = 'musica/no-existe.mp3'; })"); await pg.wait_for_timeout(4500)
        c = await pg.evaluate(PLAYING); print('tras un error de carga:', c); assert c and 'no-existe.mp3' not in c
        print('errores', errs); assert not errs; print('ok  la música se recupera sola'); await b.close()
asyncio.run(main())
