import asyncio, json, subprocess
from playwright.async_api import async_playwright

def make_state(js):
    code = "const E=require('/home/claude/dungeon-in-one-card/src/engine.js');" + js + ";console.log(JSON.stringify(st));"
    return subprocess.check_output(['node','-e',code]).decode()

STATES = {
 'clear': """const st=E.newRun('paladin'); st.mons=[{id:1,x:0,y:3,hp:1,maxHp:2,spd:5,atk:4,def:4,rng:3}];
   st.phase='move'; st.turn={dice:[3,3,3],assign:{spd:0,atk:1,def:2},sel:-1,spd:4,atk:4,def:4,spdLeft:4,atkLeft:4}; st.totalTurns=7;""",
 'death': """const st=E.newRun('paladin'); E.setupLevel(st,10); st.adv.hp=1; st.mons=[{id:1,x:1,y:4,hp:5,maxHp:5,spd:3,atk:7,def:7,rng:2}];
   st.phase='move'; st.turn={dice:[1,1,1],assign:{spd:0,atk:1,def:2},sel:-1,spd:2,atk:2,def:2,spdLeft:0,atkLeft:0}; st.totalTurns=40;""",
 'win': """const st=E.newRun('paladin'); E.setupLevel(st,11); st.adv.hp=4; st.mons=[{id:1,x:3,y:4,hp:1,maxHp:5,spd:5,atk:5,def:5,rng:5}];
   st.phase='move'; st.turn={dice:[5,5,5],assign:{spd:0,atk:1,def:2},sel:-1,spd:6,atk:6,def:6,spdLeft:6,atkLeft:6}; st.totalTurns=95;""",
}

async def run(name, steps):
    state = make_state(STATES[name])
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, has_touch=True, is_mobile=True)
        await ctx.add_init_script("localStorage.setItem('dioc-run-v3', %s)" % json.dumps(state))
        page = await ctx.new_page()
        errs=[]
        page.on('pageerror', lambda e: errs.append('PAGEERR '+str(e)))
        await page.goto('file:///home/claude/dungeon-in-one-card/index.html'); await page.wait_for_timeout(400)
        await page.click('#mContinue'); await page.wait_for_timeout(300)
        await steps(page)
        print(name, 'errors:', errs)
        await b.close()

async def clear(page):
    await page.locator('.tile.target').click(); await page.wait_for_timeout(1200)
    await page.screenshot(path='/tmp/f1_break.png')
    await page.locator('#veil .choice[data-c="atk"]').click(); await page.wait_for_timeout(1000)
    print('level now:', await page.inner_text('#lvlNum'), '|', await page.inner_text('#lvlName'), '|', await page.inner_text('#log'))
    await page.screenshot(path='/tmp/f2_level2.png', full_page=True)

async def death(page):
    await page.click('#btnEnd'); await page.wait_for_timeout(3500)
    await page.screenshot(path='/tmp/f3_death.png')
    print('death sheet:', (await page.inner_text('#veil')).replace('\n',' | '))
    await page.click('#retry'); await page.wait_for_timeout(500)
    print('retry level:', await page.inner_text('#lvlNum'), await page.inner_text('#hpnum'), '|', await page.inner_text('#log'))

async def win(page):
    await page.locator('.tile.target').click(); await page.wait_for_timeout(1500)
    await page.screenshot(path='/tmp/f4_win.png')
    print('win sheet:', (await page.inner_text('#veil')).replace('\n',' | '))

async def main():
    await run('clear', clear); await run('death', death); await run('win', win)
asyncio.run(main())
