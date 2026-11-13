import asyncio, json, subprocess
from playwright.async_api import async_playwright
HDR = "const E=require('/home/claude/dungeon-in-one-card/engine.js');"
def make_state(js):
    return subprocess.check_output(['node','-e',HDR+js+";console.log(JSON.stringify(st));"]).decode()
MV = "E.rollTurn(st); st.turn.dice=[%s]; st.turn.assign={spd:0,atk:1,def:2,rng:-1}; E.confirmEnergy(st);"
def mon(i,x,y,hp=None): return "{id:%d,x:%d,y:%d,hp:%s,maxHp:m0.hp,spd:m0.spd,atk:m0.atk,def:m0.def,rng:m0.rng}"%(i,x,y,hp if hp else 'm0.hp')
S = {
 'stone': "const st=E.newRun('paladin','hell',['fist','pendant','mail']); const m0=E.LEVELS[0].mon; st.mons=[%s,%s]; st.adv.x=4; st.adv.y=4; st.stone.val=2; %s" % (mon(1,4,2,2), mon(2,0,1,2), MV % '3,6,3'),
 'curse': "const st=E.newRun('paladin','hell',['holy','mail','herbs']); const m0=E.LEVELS[0].mon; st.mons=[%s,%s]; st.adv.x=2; st.adv.y=0; %s" % (mon(1,0,1),mon(2,4,2), MV % '3,3,3'),
 'mail': "const st=E.newRun('paladin','hell',['mail','herbs','pendant']); const m0=E.LEVELS[0].mon; st.mons=[%s,%s]; st.adv.x=0; st.adv.y=4; %s" % (mon(1,0,3),mon(2,1,4), MV % '3,3,1'),
 'laurel': "const st=E.newRun('paladin','hell',['laurel','holy','fist']); const i=E.LEVELS.findIndex(l=>!l.boss&&l.num===7); E.setupLevel(st,i,null); const m0=E.LEVELS[i].mon; st.mons=[%s,%s]; st.adv.x=0; st.adv.y=4; %s" % (mon(1,4,2),mon(2,3,1), MV % '3,3,3'),
 'dead': "const st=E.newRun('paladin','hell',['pendant','mail','herbs']); const m0=E.LEVELS[0].mon; st.mons=[%s,%s]; st.adv.x=4; st.adv.y=4; st.adv.hp=1; st.stone.val=1; %s" % (mon(1,4,2),mon(2,0,1), MV % '3,6,3'),
}
async def boot(p, name=None):
    b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, has_touch=True, is_mobile=True)
    if name: await ctx.add_init_script("localStorage.setItem('dioc-run-v3', %s)" % json.dumps(make_state(S[name])))
    page = await ctx.new_page(); errs=[]
    page.on('pageerror', lambda e: errs.append('PAGEERR '+str(e)))
    await page.goto('file:///home/claude/dungeon-in-one-card/index.html'); await page.wait_for_timeout(400)
    if name: await page.click('#mContinue'); await page.wait_for_timeout(400)
    return b, page, errs
async def log(page): return (await page.inner_text('#log')).replace('\n',' ')

async def t_menu(p):
    b,page,errs = await boot(p)
    await page.click('#mNew'); await page.wait_for_timeout(500)
    print('aventuras:', await page.locator('.adv-card').count())
    await page.screenshot(path='/tmp/h0_adv.png', full_page=True)
    ok = await page.evaluate("[...document.querySelectorAll('.adv-card img')].map(i=>i.complete&&i.naturalWidth>0)")
    print('portadas cargan:', ok)
    await page.click('[data-game="hell"]'); await page.wait_for_timeout(300)
    print('héroes aventura:', await page.locator('[data-hero]').count(), '| cazador:', await page.locator('[data-hero="demonhunter"]').count())
    await page.click('[data-hero="paladin"]'); await page.wait_for_timeout(300)
    print('objetos sorteados:', await page.locator('.item-card.chosen').count(), '| empezar deshab:', await page.locator('#itGo').is_disabled())
    await page.click('#itGo'); await page.wait_for_timeout(500)
    print('malditas:', await page.locator('.tile.damned').count(), '| piedra:', await page.locator('.tile.stone').count(), '| ítems:', await page.locator('#items .item').count())
    print(await log(page))
    await page.screenshot(path='/tmp/h1_start.png', full_page=True)
    # contraseña de 8
    await page.click('#btnPass'); await page.wait_for_timeout(300)
    pw = await page.evaluate("[...document.querySelectorAll('.pwshow span')].map(s=>s.textContent).join('')")
    print('contraseña:', pw, len(pw))
    await page.click('#pwMenu'); await page.wait_for_timeout(300)
    await page.click('#mPass'); await page.wait_for_timeout(300)
    await page.fill('#pwIn', pw); await page.click('#pwGo'); await page.wait_for_timeout(400)
    print('tras contraseña:', await log(page))
    print('menu errores', errs); await b.close()

async def t_stone(p):
    b,page,errs = await boot(p,'stone')
    print('objetivos:', await page.locator('.tile.target').count(), '| piedra objetivo:', await page.locator('.tile.stone.target').count())
    print('gema:', await page.inner_text('.tile.stone .gem'))
    await page.click('#items [data-item="fist"]'); await page.wait_for_timeout(200)
    await page.click('#iUse'); await page.wait_for_timeout(300)
    print(await log(page), '| chips:', await page.inner_text('#items'))
    await page.screenshot(path='/tmp/h2_stone.png', full_page=True)
    await page.click('.tile.stone'); await page.wait_for_timeout(900)
    print('tras romper:', await page.inner_text('#veil') if await page.locator('#veil').count() else await log(page))
    print('vida', await page.inner_text('#hpnum'))
    print('stone errores', errs); await b.close()

async def t_dead(p):
    b,page,errs = await boot(p,'dead')
    await page.click('#items [data-item="pendant"]') if False else None
    await page.click('.tile.stone'); await page.wait_for_timeout(900)
    print('colgante en piedra:', await log(page), '| vida', await page.inner_text('#hpnum'), '| veil', await page.locator('#veil').count())
    print('dead errores', errs); await b.close()

async def t_curse(p):
    b,page,errs = await boot(p,'curse')
    print('malditos (héroe en maldita):', await page.locator('.token.cursed').count(), '| nota:', await page.inner_text('.wnote'))
    await page.screenshot(path='/tmp/h3_curse.png', full_page=True)
    await page.click('#items [data-item="holy"]'); await page.wait_for_timeout(200)
    await page.click('#iUse'); await page.wait_for_timeout(300)
    print('tras agua bendita: malditos', await page.locator('.token.cursed').count(), '| nota:', await page.inner_text('.wnote'), '| chips:', await page.inner_text('#items'))
    print('curse errores', errs); await b.close()

async def t_mail(p):
    b,page,errs = await boot(p,'mail')
    await page.click('#btnEnd'); await page.wait_for_timeout(2500)
    for _ in range(10):
        if await page.locator('#veil').count(): break
        await page.wait_for_timeout(500)
    print('hoja 1:', (await page.inner_text('#veil')).replace('\n',' | '))
    await page.screenshot(path='/tmp/h4_mail.png')
    await page.click('#mNo'); await page.wait_for_timeout(400)
    print('hoja 2:', (await page.inner_text('#veil')).replace('\n',' | ') if await page.locator('#veil').count() else 'ninguna')
    if await page.locator('#hUse').count(): await page.click('#hUse'); await page.wait_for_timeout(1200)
    print(await log(page), '| vida', await page.inner_text('#hpnum'), '| ítems:', (await page.inner_text('#items')).replace('\n',' '))
    print('mail errores', errs); await b.close()

async def t_laurel(p):
    b,page,errs = await boot(p,'laurel')
    await page.click('#items [data-item="laurel"]'); await page.wait_for_timeout(200)
    await page.click('#iUse'); await page.wait_for_timeout(300)
    print(await log(page), '| botón:', await page.inner_text('#btnLaurelNo'))
    await page.locator('.tile.target').first.click(); await page.wait_for_timeout(300)   # (4,2)
    print(await log(page), '| botón:', await page.inner_text('#actions'))
    await page.screenshot(path='/tmp/h5_laurel.png', full_page=True)
    await page.click('.tile[data-i="9"]'); await page.wait_for_timeout(2600)
    print(await log(page))
    tg = await page.locator('.tile.target').count()
    print('objetivos de ataque:', tg)
    await page.locator('.tile.target').first.click(); await page.wait_for_timeout(500)
    print(await log(page))
    await page.click('#btnLaurelEnd'); await page.wait_for_timeout(3500)
    for _ in range(8):
        if await page.locator('#btnRoll').count(): break
        await page.wait_for_timeout(1000)
    print('tras la orden:', await log(page), '| fase botón roll', await page.locator('#btnRoll').count(), '| ítems', (await page.inner_text('#items')).replace('\n',' '))
    print('laurel errores', errs); await b.close()

async def main():
    async with async_playwright() as p:
        for t in (t_menu, t_stone, t_dead, t_curse, t_mail, t_laurel):
            print('=====', t.__name__); await t(p)
asyncio.run(main())
