import asyncio, json, subprocess
from playwright.async_api import async_playwright
def make_state(js):
    return subprocess.check_output(['node','-e',"const E=require('/home/claude/dungeon-in-one-card/src/engine.js');"+js+";console.log(JSON.stringify(st));"]).decode()
S = {
 'chest': """const st=E.newRun('knight','mguf',['gorgon']); st.chest.val=2; E.rollTurn(st); st.turn.dice=[4,5,6];
   st.turn.assign={spd:0,atk:1,def:2,rng:-1}; E.confirmEnergy(st);
   const [cx,cy]=E.XY(st.chest.at); const c=[[1,0],[-1,0],[0,1],[0,-1]].map(([a,b])=>[cx+a,cy+b]).find(([x,y])=>x>=0&&y>=0&&x<5&&y<5&&!E.LEVELS[0].walls[E.idx(x,y)]&&E.idx(x,y)!==E.LEVELS[0].spawns[0]); st.adv.x=c[0]; st.adv.y=c[1]; st.mons=st.mons.filter(m=>!(m.x===c[0]&&m.y===c[1]));""",
 'boss': """const st=E.newRun('necromancer','mguf',[]); E.setupLevel(st,3,{loot:3}); const lv=E.LEVELS[3]; const m0=lv.mon;
   const [sx,sy]=E.XY(lv.spawns[0]); st.mons=[{id:1,x:sx,y:sy,hp:1,maxHp:m0.hp,spd:m0.spd,atk:m0.atk,def:m0.def,rng:m0.rng}];
   E.rollTurn(st); st.turn.dice=[6,6,6]; st.turn.assign={spd:0,atk:1,def:2,rng:-1}; E.confirmEnergy(st); st.turn.rng=9; st.adv.x=2; st.adv.y=4;""",
 'harbour': """const st=E.newRun('corsair','harbour',['hourglass','eye','sands']); E.rollTurn(st);""",
}
async def run(name, steps):
    st = make_state(S[name])
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, has_touch=True, is_mobile=True)
        await ctx.add_init_script("localStorage.setItem('dioc-run-v3', %s)" % json.dumps(st))
        page = await ctx.new_page(); errs=[]
        page.on('pageerror', lambda e: errs.append('PAGEERR '+str(e)))
        await page.goto('file:///home/claude/dungeon-in-one-card/index.html'); await page.wait_for_timeout(400)
        await page.click('#mContinue'); await page.wait_for_timeout(400)
        await steps(page)
        print(name,'errores',errs); await b.close()
async def chest(page):
    await page.screenshot(path='/tmp/g1_chest.png', full_page=True)
    print('objetivo cofre:', await page.locator('.tile.target .chest').count(), '| loot row', await page.locator('#loot').is_visible())
    await page.locator('.tile.target').first.click(); await page.wait_for_timeout(500)
    print(await page.inner_text('#log'), '|', await page.inner_text('#loot'))
    await page.click('#btnEnd'); await page.wait_for_timeout(4500)
    for _ in range(3):
        if await page.locator('#btnRoll').count(): break
        await page.wait_for_timeout(1500)
    await page.click('#btnRoll'); await page.wait_for_timeout(1000)
    await page.click('#btnLoot'); await page.wait_for_timeout(300)
    await page.screenshot(path='/tmp/g2_lootsheet.png')
    await page.click('#veil [data-lk="atk"]'); await page.wait_for_timeout(200)
    await page.click('#lOk'); await page.wait_for_timeout(300)
    print('botín:', await page.inner_text('#loot'), '| chip atq:', (await page.locator('.chip[data-k="atk"]').inner_text()).replace('\n',' '))
    print('caballero botón:', await page.inner_text('#btnAbil'))
    await page.click('#btnAbil'); await page.wait_for_timeout(200)
    await page.click('#diceRow [data-d="0"]'); await page.click('#chips [data-k="atk"]')
    await page.click('#diceRow [data-d="1"]'); await page.click('#chips [data-k="atk"]')
    await page.click('#diceRow [data-d="2"]'); await page.click('#chips [data-k="def"]')
    await page.screenshot(path='/tmp/g3_knight.png', full_page=True)
    print('atq chip:', (await page.locator('.chip[data-k="atk"]').inner_text()).replace('\n',' '), '| confirmar', not await page.locator('#btnConfirm').is_disabled())
    await page.click('#btnConfirm'); await page.wait_for_timeout(300)
    print('tras confirmar:', await page.inner_text('#log'), '|', await page.inner_text('#loot') if await page.locator('#loot').is_visible() else 'sin botín')
async def boss(page):
    print('nivel jefe:', await page.inner_text('.lvl-num'), '|', await page.inner_text('#lvlName'))
    await page.screenshot(path='/tmp/g4_boss.png', full_page=True)
    print('hab:', await page.inner_text('#btnAbil'))
    await page.click('#btnAbil'); await page.wait_for_timeout(200)
    await page.locator('.tile.target').first.click(); await page.wait_for_timeout(1800)
    print('sheet:', (await page.inner_text('#veil')).replace('\n',' | ')[:200])
async def harbour(page):
    await page.screenshot(path='/tmp/g5_harbour.png', full_page=True)
    print('agua:', await page.locator('.tile.water').count(), '| objetos', await page.locator('#items .item').count())
    await page.click('#items [data-item="eye"]'); await page.wait_for_timeout(300)
    await page.screenshot(path='/tmp/g6_eye.png')
    await page.click('#iUse'); await page.wait_for_timeout(300)
    await page.click('#veil [data-e="0"]'); await page.wait_for_timeout(1200)
    print('dados:', await page.locator('#diceRow .die').evaluate_all("e=>e.map(x=>x.getAttribute('aria-label'))"))
    await page.screenshot(path='/tmp/g7_eye_done.png', full_page=True)
async def main():
    await run('chest', chest); await run('boss', boss); await run('harbour', harbour)
asyncio.run(main())
