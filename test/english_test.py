# Recorre el juego en inglés y busca texto en español en cada pantalla
import asyncio, re, json, subprocess
exec(open('/home/claude/dungeon-in-one-card/test/cloud_test.py').read().split('async def main')[0])
SP = re.compile(r"[áéíóúñ¿¡]|\b(de|el|la|los|las|del|tu|tus|con|para|que|una|por|sin|nivel|vida|dado|dados|monstruo|monstruos|turno|habilidad|partida|cofre|jefe|botín|objetos|héroe|usuario|entrar|crear|atrás|elige|toca|tira)\b", re.I)
ALLOW = re.compile(r"M'Guf-yn|Español|Barny|Little Rocket|One Card Dungeon|DIOC1|Harbour Clash|Eternal Peak|Hell's Door", re.I)
found = {}
async def scan(pg, where):
    txt = await pg.evaluate("document.body.innerText + ' ' + [...document.querySelectorAll('[aria-label],[title],[placeholder]')].map(e => (e.getAttribute('aria-label')||'') + ' ' + (e.getAttribute('title')||'') + ' ' + (e.getAttribute('placeholder')||'')).join(' ')")
    for line in txt.split('\n'):
        l = ALLOW.sub('', line)
        m = SP.search(l)
        if m: found.setdefault(where, set()).add(line.strip()[:140])
def st(js): return subprocess.check_output(['node','-e',"const E=require('/home/claude/dungeon-in-one-card/src/engine.js');"+js+";console.log(JSON.stringify(st))"]).decode().strip()
BREAK = st("const st=E.newRun('knight','base',[]); E.setupLevel(st,1); const lv=E.LEVELS[1]; const m0=lv.mon; let sx,sy; for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const x=st.adv.x+dx,y=st.adv.y+dy; if (x>=0&&y>=0&&x<5&&y<5&&!lv.walls[E.idx(x,y)]) { sx=x; sy=y; break; } } st.mons=[{id:1,x:sx,y:sy,hp:1,maxHp:m0.hp,spd:m0.spd,atk:m0.atk,def:m0.def,rng:m0.rng}]; E.rollTurn(st); st.turn.dice=[6,6,6]; st.turn.assign={spd:0,atk:1,def:2,rng:-1}; E.confirmEnergy(st); st.turn.atkLeft=99; st.turn.rng=99; st.adv.spd=6;")
BOSS = st("E.useGame('mguf'); const st=E.newRun('knight','mguf',[]); E.setupLevel(st,2); const lv=E.LEVELS[2]; const m0=lv.mon; let sx,sy; for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const x=st.adv.x+dx,y=st.adv.y+dy; if (x>=0&&y>=0&&x<5&&y<5&&!lv.walls[E.idx(x,y)]&&lv.chestAt!==E.idx(x,y)) { sx=x; sy=y; break; } } st.mons=[{id:1,x:sx,y:sy,hp:1,maxHp:m0.hp,spd:m0.spd,atk:m0.atk,def:m0.def,rng:m0.rng}]; st.chest=null; st.loot=2; E.rollTurn(st); st.turn.dice=[6,6,6]; st.turn.assign={spd:0,atk:1,def:2,rng:-1}; E.confirmEnergy(st); st.turn.atkLeft=99; st.turn.rng=99;")
DEAD = st("const st=E.newRun('knight','base',[]); E.setupLevel(st,1); const lv=E.LEVELS[1]; const m0=lv.mon; let sx,sy; for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const x=st.adv.x+dx,y=st.adv.y+dy; if (x>=0&&y>=0&&x<5&&y<5&&!lv.walls[E.idx(x,y)]) { sx=x; sy=y; break; } } st.mons=[{id:1,x:sx,y:sy,hp:m0.hp,maxHp:m0.hp,spd:m0.spd,atk:m0.atk,def:m0.def,rng:m0.rng}]; st.adv.hp=1; st.adv.def=1; E.rollTurn(st); st.turn.dice=[1,1,1]; st.turn.assign={spd:0,atk:1,def:2,rng:-1}; E.confirmEnergy(st);")
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        A, pg, errs = await device(b)
        await pg.evaluate("localStorage.setItem('dioc-lang','en')"); await pg.reload(); await pg.wait_for_timeout(400)
        await scan(pg, 'menu'); await pg.screenshot(path='/tmp/en_menu.png')
        await pg.click('#mRules'); await pg.wait_for_timeout(200); await scan(pg, 'rules'); await pg.click('#x')
        await pg.click('#mUser'); await scan(pg, 'users'); await pg.click('#uNew'); await scan(pg, 'new user'); await pg.click('#back')
        await pg.click('#uRem'); await scan(pg, 'sign in'); await pg.click('#back'); await pg.click('#uImp'); await scan(pg, 'import'); await pg.click('#back'); await pg.click('#back')
        await pg.click('#mNew'); await pg.wait_for_timeout(200); await scan(pg, 'adventures'); await pg.screenshot(path='/tmp/en_adv.png', full_page=True)
        await pg.click('[data-game="peak"]'); await pg.wait_for_timeout(200); await scan(pg, 'locked sheet'); await pg.click('#lkOk')
        await pg.click('[data-game="base"]'); await pg.click('#moreH'); await pg.wait_for_timeout(200); await scan(pg, 'heroes')
        await pg.click('[data-hero="paladin"]'); await pg.wait_for_timeout(200); await scan(pg, 'items')
        await pg.click('#itGo'); await pg.wait_for_timeout(400); await scan(pg, 'game start')
        await pg.click('#btnRoll'); await pg.wait_for_timeout(1200); await scan(pg, 'rolled')
        for _ in range(3):
            d = pg.locator('#diceRow [data-d]:not(.used)').first
            if await d.count(): await d.click(); await pg.locator('#chips .chip.slot:not(.filled)').first.click(); await pg.wait_for_timeout(100)
        await scan(pg, 'assigned'); await pg.click('#btnConfirm'); await pg.wait_for_timeout(400); await scan(pg, 'move phase')
        await pg.screenshot(path='/tmp/en_game.png')
        await pg.click('#btnPass'); await pg.wait_for_timeout(200); await scan(pg, 'pause'); await pg.click('#pwClose')
        await pg.click('#btnSnd'); await pg.wait_for_timeout(200); await scan(pg, 'sound'); await pg.click('#oOk')
        await pg.click('#btnEnd'); await pg.wait_for_timeout(3000); await scan(pg, 'after monsters')
        # subir de nivel, jefe, derrota, abandono (en un dispositivo nuevo)
        await A.close(); A, pg, errs2 = await device(b); await pg.evaluate("localStorage.setItem('dioc-lang','en')")
        for name, key, s in [('level up', 'base', BREAK), ('boss', 'mguf', BOSS)]:
            await pg.evaluate("([k,s]) => { localStorage.clear(); localStorage.setItem('dioc-lang','en'); localStorage.setItem('dioc-unlock-all','1'); localStorage.setItem(k, s); }", ['dioc-run-v3:' + key, s]); await pg.goto(URL); await pg.wait_for_timeout(400)
            await pg.click(f'[data-res="{key}"]'); await pg.wait_for_timeout(400); await pg.locator('.tile.target').first.click(); await pg.wait_for_timeout(2500)
            await scan(pg, name); await pg.screenshot(path=f'/tmp/en_{name.replace(" ","_")}.png')
        await pg.evaluate("localStorage.clear(); localStorage.setItem('dioc-lang','en')"); await pg.evaluate("s => localStorage.setItem('dioc-run-v3:base', s)", DEAD); await pg.goto(URL); await pg.wait_for_timeout(300)
        await pg.click('[data-res="base"]'); await pg.wait_for_timeout(400); await pg.click('#btnEnd'); await pg.wait_for_timeout(6000)
        await scan(pg, 'death screen'); await pg.screenshot(path='/tmp/en_dead.png', full_page=True)
        await pg.evaluate("s => { localStorage.clear(); localStorage.setItem('dioc-lang','en'); localStorage.setItem('dioc-run-v3:base', s); }", BREAK); await pg.goto(URL); await pg.wait_for_timeout(300)
        await pg.click('[data-ab="base"]'); await scan(pg, 'abandon sheet'); await pg.click('#abGo'); await pg.wait_for_timeout(3000); await scan(pg, 'abandon screen')
        # perfil con usuario
        await pg.click('#eMenu'); await pg.click('#mUser'); await pg.click('#uNew'); await pg.wait_for_timeout(300)
        for _ in range(3):
            await pg.fill('#uName', 'Tester'); await pg.fill('#uPw', 'secret1'); await pg.fill('#uPw2', 'secret1'); await pg.wait_for_timeout(150)
            if await pg.evaluate("['uName','uPw','uPw2'].every(id => document.getElementById(id).value)"): break
        await pg.click('#uGo'); await pg.wait_for_timeout(800); await pg.click('#mUser'); await pg.wait_for_timeout(300); await scan(pg, 'profile')
        await pg.click('#bkShow'); await scan(pg, 'backup'); await pg.click('#pDel'); await scan(pg, 'delete')
        await pg.screenshot(path='/tmp/en_profile.png', full_page=True)
        for k, v in found.items():
            print(f'[{k}]'); [print('   ', x) for x in sorted(v)]
        print('errores', errs); print('pantallas con español:', len(found)); await b.close()
asyncio.run(main())
