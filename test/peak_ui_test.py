import asyncio, json, subprocess
from playwright.async_api import async_playwright

def make_state(js):
    code = "const E=require('/home/claude/dungeon-in-one-card/src/engine.js');" + js + ";console.log(JSON.stringify(st));"
    return subprocess.check_output(['node','-e',code]).decode()

async def new_page(p, state=None):
    b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, has_touch=True, is_mobile=True)
    if state: await ctx.add_init_script("localStorage.setItem('dioc-run-v3', %s)" % json.dumps(state))
    page = await ctx.new_page(); errs=[]
    page.on('pageerror', lambda e: errs.append('PAGEERR '+str(e)))
    page.on('console', lambda m: errs.append('CONSOLE '+m.text) if m.type=='error' and 'fonts' not in m.text and 'ERR_' not in m.text else None)
    await page.goto('file:///home/claude/dungeon-in-one-card/index.html'); await page.wait_for_timeout(400)
    return b, page, errs

async def main():
    async with async_playwright() as p:
        # ---- flujo de inicio
        b, page, errs = await new_page(p)
        await page.click('#mNew'); await page.click('[data-game="peak"]'); await page.wait_for_timeout(200)
        print('héroes:', await page.locator('.hero-card').count(), '| sherpa visible', await page.locator('[data-hero="sherpa"]').is_visible())
        await page.click('[data-hero="sherpa"]'); await page.wait_for_timeout(200)
        print('objetos sorteados:', await page.locator('.item-card.chosen').count(), '| Empezar habilitado', not await page.locator('#itGo').is_disabled())
        await page.screenshot(path='/tmp/p1_items.png', full_page=True)
        # quitar uno -> deshabilitado; intentar elegir 4 -> mensaje
        await page.locator('.item-card.chosen').first.click()
        print('tras quitar uno: ', await page.locator('.item-card.chosen').count(), 'empezar deshabilitado', await page.locator('#itGo').is_disabled())
        await page.locator('.item-card:not(.chosen)').first.click(); await page.locator('.item-card:not(.chosen)').first.click(); 
        await page.locator('.item-card:not(.chosen)').first.click()
        print('con 3:', await page.locator('.item-card.chosen').count(), '| mensaje:', await page.inner_text('#itMsg'))
        await page.click('#itRoll'); await page.wait_for_timeout(100)
        await page.click('#itGo'); await page.wait_for_timeout(400)
        print('en juego:', await page.inner_text('#lvlNum'), 'de', await page.inner_text('#lvlTot'), '|', await page.inner_text('#lvlName'), '|', await page.inner_text('#heroTag'))
        print('objetos en panel:', await page.locator('#items .item').count(), await page.locator('#items').inner_text())
        await page.screenshot(path='/tmp/p2_game.png', full_page=True)
        await page.click('#btnPass'); await page.wait_for_timeout(300)
        pw = ''.join(await page.locator('.pwshow span').all_inner_texts()); print('contraseña:', pw, len(pw))
        await page.screenshot(path='/tmp/p3_pw.png')
        await page.click('#pwMenu'); await page.wait_for_timeout(300)
        await page.click('#mPass'); await page.fill('#pwIn', pw); await page.click('#pwGo'); await page.wait_for_timeout(400)
        print('cargada:', await page.inner_text('#log'), await page.locator('#items .item').count(), 'objetos')
        print('errores', errs); await b.close()

        # ---- Sherpa + ventisca (nivel 1: ventiscas en fila 0 y otras)
        st = make_state("""const st=E.newRun('sherpa','peak',['cloak','axe','herbs']); st.mons=[{id:1,x:4,y:0,hp:2,maxHp:2,spd:4,atk:4,def:4,rng:4}];
          st.phase='move'; st.turn={dice:[3,3,3],assign:{spd:0,atk:1,def:2,rng:-1},sel:-1,lock:-1,ranger:false,rerolled:false,spd:8,atk:8,def:4,rng:2,spdLeft:8,atkLeft:8}; st.adv.x=4; st.adv.y=2; st.totalTurns=3;""")
        b, page, errs = await new_page(p, st)
        await page.click('#mContinue'); await page.wait_for_timeout(300)
        print('\nSHERPA botón:', await page.inner_text('#btnAbil'))
        await page.screenshot(path='/tmp/p4_sherpa.png', full_page=True)
        before = await page.locator('.tile.reach').count()
        await page.click('#btnAbil'); await page.wait_for_timeout(200)
        print('casillas alcanzables:', before, '→', await page.locator('.tile.reach').count(), '| botón:', await page.inner_text('#btnAbil'))
        await page.screenshot(path='/tmp/p5_sherpa_on.png', full_page=True)
        # ir a una casilla tras un muro: (3,2) es '#'? intentamos casilla alcanzable con coste
        reach = await page.evaluate("[...document.querySelectorAll('.tile.reach')].map(t=>+t.dataset.i)")
        print('reach idx', reach)
        tgt = max(reach, key=lambda i:int(0))  # primera
        # elegir una casilla en la fila 2 a la izquierda del muro (x=2)
        cand = [i for i in reach if i==2*5+2] or reach[:1]
        await page.locator(f'.tile[data-i="{cand[0]}"]').click()
        await page.wait_for_timeout(300)
        print('mientras camina: busy', await page.locator('#btnEnd').is_disabled())
        await page.wait_for_timeout(5500)
        print('tras caminar:', await page.inner_text('#log'), '| botón hab:', await page.locator('#btnAbil').count())
        print('errores', errs); await b.close()

        # ---- ventisca: héroe sobre ventisca
        st = make_state("""const st=E.newRun('paladin','peak',['herbs','flame','wyrm']); st.mons=[{id:1,x:4,y:0,hp:2,maxHp:2,spd:4,atk:4,def:4,rng:4},{id:2,x:2,y:0,hp:2,maxHp:2,spd:4,atk:4,def:4,rng:4}];
          st.phase='move'; st.turn={dice:[3,3,3],assign:{spd:0,atk:1,def:2,rng:-1},sel:-1,lock:-1,ranger:false,rerolled:false,spd:4,atk:5,def:4,rng:2,spdLeft:4,atkLeft:5}; st.adv.x=3; st.adv.y=0; st.totalTurns=3;""")
        b, page, errs = await new_page(p, st)
        await page.click('#mContinue'); await page.wait_for_timeout(300)
        print('\nVENTISCA chips:', await page.locator('#chips .chip').all_inner_texts())
        await page.screenshot(path='/tmp/p6_blizz.png', full_page=True)
        # Extracto de Wyrm
        await page.click('[data-item="wyrm"]'); await page.wait_for_timeout(200)
        await page.screenshot(path='/tmp/p7_wyrm.png')
        await page.click('#iUse'); await page.wait_for_timeout(200)
        print('tras extracto Mov:', (await page.locator('#chips .chip').first.inner_text()).replace('\n',' '), '| items', await page.locator('#items .item').count())
        # Hierbas -> fin de turno: el goblin ataca (rng 4, atk 4, def 4-1=3 → 1 dmg → no pending si dmg=0?)
        await page.click('[data-item="herbs"]'); await page.wait_for_timeout(200)
        print('hierbas (sheet):', (await page.inner_text('#veil')).replace('\n',' | ')); await page.click('#iNo')
        await page.click('#btnEnd'); await page.wait_for_timeout(6000)
        txt = (await page.inner_text('#veil')).replace('\n',' | ') if await page.locator('#veil').count() else 'sin hoja'
        print('tras fin de turno:', txt)
        await page.screenshot(path='/tmp/p8_herbs.png')
        if await page.locator('#hUse').count():
            await page.click('#hUse'); await page.wait_for_timeout(1500)
            print('log:', await page.inner_text('#log'), '|', await page.inner_text('#hpnum'), '| items:', await page.locator('#items .item').count())
        print('errores', errs); await b.close()

        # ---- Llama del destino en energía
        st = make_state("""const st=E.newRun('mage','peak',['flame','cloak','axe']); st.phase='energy'; st.turn=E.freshTurn(); st.turn.dice=[1,1,1];""")
        b, page, errs = await new_page(p, st)
        await page.click('#mContinue'); await page.wait_for_timeout(300)
        print('\nLLAMA dados:', await page.locator('#diceRow .die').count())
        await page.click('[data-item="flame"]'); await page.click('#iUse'); await page.wait_for_timeout(200)
        await page.click('#veil [data-p="0"]'); await page.click('#veil [data-p="2"]'); await page.wait_for_timeout(100)
        await page.screenshot(path='/tmp/p9_flame.png')
        print('botón:', await page.inner_text('#fGo'))
        await page.click('#fGo'); await page.wait_for_timeout(1200)
        print('dado 1 se conserva (1):', await page.evaluate("document.querySelectorAll('#diceRow .die')[1].getAttribute('aria-label')"), '| items', await page.locator('#items .item').count())
        # Capa
        await page.click('[data-item="cloak"]'); await page.click('#iUse'); await page.wait_for_timeout(200)
        print('capa:', await page.inner_text('#items'), '|', await page.inner_text('#log'))
        print('errores', errs); await b.close()

asyncio.run(main())
