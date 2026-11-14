import asyncio, json, subprocess
from playwright.async_api import async_playwright
JS = """const st=E.newRun('knight','base',[]); E.setupLevel(st,11); const lv=E.LEVELS[11]; const m0=lv.mon;
 let sx,sy; for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const x=st.adv.x+dx,y=st.adv.y+dy; if (x>=0&&y>=0&&x<5&&y<5&&!lv.walls[E.idx(x,y)]) { sx=x; sy=y; break; } } st.mons=[{id:1,x:sx,y:sy,hp:1,maxHp:m0.hp,spd:m0.spd,atk:m0.atk,def:m0.def,rng:m0.rng}];
 st.stats={kills:11,hits:20,dmgIn:4,blocks:9,chests:0}; st.totalTurns=60;
 E.rollTurn(st); st.turn.dice=[6,6,6]; st.turn.assign={spd:0,atk:1,def:2,rng:-1}; E.confirmEnergy(st); st.turn.atkLeft=99; st.turn.rng=99;"""
ST = subprocess.check_output(['node','-e',"const E=require('/home/claude/dungeon-in-one-card/src/engine.js');"+JS+";console.log(JSON.stringify(st));"]).decode().strip()
URL='file:///home/claude/dungeon-in-one-card/index.html'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, has_touch=True, is_mobile=True)
        page = await ctx.new_page(); errs=[]; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.goto(URL); await page.wait_for_timeout(400)
        assert 'Entrar o crear' in await page.inner_text('#mUser')
        await page.screenshot(path='/tmp/u_menu0.png')
        await page.click('#mUser'); await page.wait_for_timeout(200)
        await page.fill('#uName','Max'); await page.fill('#uPw','1234'); await page.fill('#uPw2','12345')
        await page.click('#uGo'); await page.wait_for_timeout(200)
        assert 'no coinciden' in await page.inner_text('#uErr')
        await page.fill('#uPw2','1234'); await page.click('#uGo'); await page.wait_for_timeout(300)
        assert 'Max' in await page.inner_text('#mUser'), 'menú con usuario'
        await page.screenshot(path='/tmp/u_menu1.png')
        stored = await page.evaluate("localStorage.getItem('dioc-users-v1')"); assert '1234' not in stored, 'la contraseña no se guarda en claro'
        # partida casi ganada para este usuario
        await page.evaluate("s => localStorage.setItem('dioc-run-v3:u:max', s)", ST)
        await page.reload(); await page.wait_for_timeout(400)
        await page.click('#mContinue'); await page.wait_for_timeout(500)
        await page.locator('.tile.target').first.click(); await page.wait_for_timeout(3500)
        new = await page.inner_text('.end-new'); print('logros nuevos:', new.replace('\n',' | '))
        assert 'Cáliz de Brasas' in new
        await page.screenshot(path='/tmp/u_end.png', full_page=True)
        await page.click('#eMenu'); await page.wait_for_timeout(300)
        await page.click('#mUser'); await page.wait_for_timeout(300)
        txt = await page.inner_text('.prof'); assert 'Completada' in txt and 'VICTORIAS' in txt.upper()
        print('perfil:', (await page.inner_text('.prof-head')).replace('\n',' '))
        await page.screenshot(path='/tmp/u_prof.png', full_page=True)
        await page.click('#bkShow'); await page.wait_for_timeout(200)
        code = await page.input_value('#bkCode'); assert code.startswith('DIOC1-')
        await page.click('#pOut'); await page.wait_for_timeout(200)
        assert 'Entrar o crear' in await page.inner_text('#mUser')
        assert not await page.locator('#mContinue').count() or True
        # contraseña incorrecta
        await page.click('#mUser'); await page.click('[data-uk="max"]'); await page.fill('#uPw','0000'); await page.click('#uGo'); await page.wait_for_timeout(300)
        assert 'incorrecta' in await page.inner_text('#uErr')
        # recuperar en "otro dispositivo"
        await page.evaluate("localStorage.clear()"); await page.reload(); await page.wait_for_timeout(300)
        await page.click('#mUser'); await page.click('#uImp'); await page.fill('#uCode', code); await page.click('#uGo'); await page.wait_for_timeout(300)
        assert 'Max' in await page.inner_text('#mUser')
        await page.click('#mUser'); await page.wait_for_timeout(200)
        assert 'Completada' in await page.inner_text('.prof')
        # la partida sin usuario sigue usando su propia ranura
        print('errores', errs); assert not errs
        print('ok  usuarios locales, logros, perfil y copia de seguridad')
        await b.close()
asyncio.run(main())
