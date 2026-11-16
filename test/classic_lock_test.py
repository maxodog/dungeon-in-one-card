# El modo Clásico solo aparece para los usuarios de la lista; para el resto no hay botón ni se aplica
import asyncio, json, subprocess
from playwright.async_api import async_playwright
ST = subprocess.check_output(['node','-e',"const E=require('/home/claude/dungeon-in-one-card/src/engine.js');const st=E.newRun('knight','base',[]);E.setupLevel(st,0);console.log(JSON.stringify(st))"]).decode().strip()
async def run(b, user):
    ctx = await b.new_context(locale='es-CL', viewport={'width': 1600, 'height': 900})
    init = "localStorage.setItem('dioc-classic','1');"
    key = 'dioc-run-v3:base'
    if user:
        init += "localStorage.setItem('dioc-users-v1', JSON.stringify({%s:{name:'%s',salt:'a',hash:'x',created:1,rec:{}}})); localStorage.setItem('dioc-user','%s');" % (user, user, user)
        key = 'dioc-run-v3:u:%s:base' % user
    init += "localStorage.setItem('%s', %s);" % (key, json.dumps(ST))
    await ctx.add_init_script(init)
    pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto('file:///home/claude/dungeon-in-one-card/index.html'); await pg.wait_for_timeout(300)
    await pg.click('[data-res="base"]'); await pg.wait_for_timeout(400)
    vis = await pg.locator('#classicBtn').is_visible(); on = await pg.evaluate("document.body.classList.contains('classic')")
    await ctx.close(); return vis, on, errs
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for user, want in [(None, False), ('ana', False), ('monogu', True), ('max', True)]:
            vis, on, errs = await run(b, user); print(user or 'sin usuario', '→ botón visible:', vis, '| clásico activo:', on, errs)
            assert vis == want and on == want and not errs
        print('ok  modo Clásico solo para los usuarios autorizados'); await b.close()
asyncio.run(main())
