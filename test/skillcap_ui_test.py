import asyncio, json, subprocess
from playwright.async_api import async_playwright
JS = """const st=E.newRun('knight','base',[]); E.setupLevel(st,1); const lv=E.LEVELS[1]; const m0=lv.mon;
 const [sx,sy]=E.XY(lv.spawns[0]); st.mons=[{id:1,x:sx,y:sy,hp:1,maxHp:m0.hp,spd:m0.spd,atk:m0.atk,def:m0.def,rng:m0.rng}];
 st.adv.spd=6; st.adv.rng=6;
 E.rollTurn(st); st.turn.dice=[6,6,6]; st.turn.assign={spd:0,atk:1,def:2,rng:-1}; E.confirmEnergy(st); st.turn.rng=9; st.adv.x=2; st.adv.y=4;"""
st = subprocess.check_output(['node','-e',"const E=require('/home/claude/dungeon-in-one-card/engine.js');"+JS+";console.log(JSON.stringify(st));"]).decode()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, has_touch=True, is_mobile=True)
        await ctx.add_init_script("localStorage.setItem('dioc-run-v3', %s)" % json.dumps(st))
        page = await ctx.new_page(); errs=[]
        page.on('pageerror', lambda e: errs.append(str(e)))
        await page.goto('file:///home/claude/dungeon-in-one-card/index.html'); await page.wait_for_timeout(400)
        await page.click('#mContinue'); await page.wait_for_timeout(400)
        await page.locator('.tile.target').first.click(); await page.wait_for_timeout(2000)
        txt = (await page.inner_text('#veil')).replace('\n',' | ')
        print(txt)
        dis = await page.evaluate("[...document.querySelectorAll('#veil .choice')].map(b=>b.dataset.c+':'+b.disabled)")
        print(dis)
        assert 'spd:true' in dis and 'rng:true' in dis and 'atk:false' in dis, dis
        await page.screenshot(path='/tmp/skillcap.png')
        await page.click('#veil [data-c="atk"]'); await page.wait_for_timeout(1500)
        print('errores', errs); await b.close()
asyncio.run(main())
