# Desbloqueo de aventuras, héroes y objetos
import asyncio, subprocess, json
from playwright.async_api import async_playwright
def win_state(game, hero, items):
    js = f"""E.useGame('{game}'); const st=E.newRun('{hero}','{game}',{json.dumps(items)}); const L=E.LEVELS.length-1; E.setupLevel(st,L); const lv=E.LEVELS[L]; const m0=lv.mon; let sx,sy;
 for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {{ const x=st.adv.x+dx,y=st.adv.y+dy; if (x>=0&&y>=0&&x<5&&y<5&&!lv.walls[E.idx(x,y)]&&!(lv.chestAt===E.idx(x,y))) {{ sx=x; sy=y; break; }} }}
 st.mons=[{{id:1,x:sx,y:sy,hp:1,maxHp:m0.hp,spd:m0.spd,atk:m0.atk,def:m0.def,rng:m0.rng}}]; st.chest=null; st.stone=null; st.totalTurns=40; st.startItems=st.items.slice(); st.items=[];
 E.rollTurn(st); st.turn.dice=[6,6,6]; st.turn.assign={{spd:0,atk:1,def:2,rng:-1}}; E.confirmEnergy(st); st.turn.atkLeft=99; st.turn.rng=99;"""
    return subprocess.check_output(['node','-e',"const E=require('/home/claude/dungeon-in-one-card/src/engine.js');"+js+";console.log(JSON.stringify(st))"]).decode().strip()
async def win(pg, game, hero, items=[]):
    await pg.evaluate("([k,s]) => localStorage.setItem(k, s)", ['dioc-run-v3:' + game, win_state(game, hero, items)])
    await pg.reload(); await pg.wait_for_timeout(400); await pg.click(f'[data-res="{game}"]'); await pg.wait_for_timeout(400)
    await pg.locator('.tile.target').first.click(); await pg.wait_for_timeout(3500)
    t = await pg.locator('.end-unlock').all_inner_texts(); await pg.click('#eMenu'); await pg.wait_for_timeout(200)
    return [x.replace('\n', ' ') for x in t]
async def locked(pg):
    await pg.click('#mNew'); await pg.wait_for_timeout(200)
    r = await pg.evaluate("[...document.querySelectorAll('.adv-card')].filter(c => c.classList.contains('locked')).map(c => c.dataset.game)")
    await pg.click('#back'); await pg.wait_for_timeout(100); return r
async def setprog(pg, o):
    await pg.evaluate("o => localStorage.setItem('dioc-guest-prog-v1', JSON.stringify(o))", o); await pg.reload(); await pg.wait_for_timeout(300)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, has_touch=True, is_mobile=True)
        pg = await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///home/claude/dungeon-in-one-card/index.html'); await pg.wait_for_timeout(300)
        L = await locked(pg); print('bloqueadas al inicio:', L); assert L == ['mguf', 'peak', 'harbour', 'hell']
        await pg.click('#mNew'); await pg.screenshot(path='/tmp/u_adv.png', full_page=True)
        await pg.click('[data-game="mguf"]'); await pg.wait_for_timeout(200); print('hoja:', (await pg.inner_text('#veil .lead')))
        await pg.click('#lkOk'); await pg.click('[data-game="base"]'); await pg.click('#moreH'); await pg.wait_for_timeout(200)
        print('héroes bloqueados:', await pg.locator('.hero-card.locked').count()); assert await pg.locator('.hero-card.locked').count() == 7
        await pg.screenshot(path='/tmp/u_heroes.png', full_page=True)
        await pg.click('#back'); await pg.click('#back')
        # dos victorias en la original con héroes distintos → M'Guf-yn
        print('1ª victoria:', await win(pg, 'base', 'paladin'))
        assert 'mguf' in await locked(pg)
        u = await win(pg, 'base', 'barbarian'); print('2ª victoria:', u); assert u and "M'Guf-yn" in u[0]
        assert await locked(pg) == ['peak', 'harbour', 'hell']
        # Montaña Eterna exige un héroe de M'Guf-yn
        await setprog(pg, {'base': {'heroes': ['paladin', 'barbarian'], 'pure': [], 'played': True}, 'mguf': {'heroes': ['paladin', 'mage'], 'pure': [], 'played': True}})
        assert 'peak' in await locked(pg); print('mguf con 2 héroes base: Montaña sigue bloqueada')
        await setprog(pg, {'base': {'heroes': ['paladin', 'barbarian'], 'played': True}, 'mguf': {'heroes': ['paladin', 'knight'], 'played': True}})
        assert 'peak' not in await locked(pg); print('con el Caballero: Montaña desbloqueada')
        # victoria en Montaña con objetos de otra expansión: cuenta el héroe pero no como «solo objetos propios»
        await win(pg, 'peak', 'sherpa', ['cloak', 'axe', 'hourglass'])
        prog = await pg.evaluate("JSON.parse(localStorage.getItem('dioc-guest-prog-v1')).peak"); print('progreso Montaña:', prog)
        assert 'sherpa' in prog['heroes'] and 'sherpa' not in prog['pure']
        await win(pg, 'peak', 'sherpa', ['cloak', 'axe', 'herbs']); await win(pg, 'peak', 'paladin', ['cloak', 'axe', 'herbs'])
        L = await locked(pg); print('tras dos victorias con objetos de Montaña:', L); assert L == ['hell']
        # objetos de expansiones bloqueadas no se ofrecen
        await pg.click('#mNew'); await pg.click('[data-game="base"]'); await pg.click('[data-hero="paladin"]'); await pg.wait_for_timeout(200)
        packs = await pg.locator('.pack-h').all_inner_texts(); print('objetos disponibles por expansión:', [x.split('\n')[0] for x in packs])
        assert not any('Infierno' in x for x in packs)
        print('errores', errs); assert not errs; print('ok  desbloqueo de aventuras, héroes y objetos'); await b.close()
asyncio.run(main())
