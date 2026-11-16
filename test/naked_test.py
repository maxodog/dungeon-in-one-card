# Minimalista: cuenta con qué objetos se EMPEZÓ, no con los que quedan al final (los usados desaparecen)
import asyncio
exec(open('/home/claude/dungeon-in-one-card/test/cloud_test.py').read().split('async def main')[0])
exec(open('/home/claude/dungeon-in-one-card/test/unlock_test.py').read().split('async def win(')[0].split('from playwright')[1].split('\n', 1)[1])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--lang=es-CL'])
        A, pa, ea = await device(b)
        await pa.evaluate("localStorage.setItem('dioc-unlock-all','1')")
        await pa.click('#mUser'); await pa.click('#uNew'); await pa.wait_for_timeout(300)
        for _ in range(3):
            await pa.fill('#uName', 'Tester'); await pa.fill('#uPw', 'secreto1'); await pa.fill('#uPw2', 'secreto1'); await pa.wait_for_timeout(150)
            if await pa.evaluate("['uName','uPw','uPw2'].every(id => document.getElementById(id).value)"): break
        await pa.click('#uGo'); await pa.wait_for_timeout(800)
        async def winp(items):
            await pa.evaluate("s => localStorage.setItem('dioc-run-v3:u:tester:peak', s)", win_state('peak', 'sherpa', items))
            await pa.reload(); await pa.wait_for_timeout(400); await pa.click('[data-res="peak"]'); await pa.wait_for_timeout(400)
            await pa.locator('.tile.target').first.click(); await pa.wait_for_timeout(3500)
            t = await pa.inner_text('.endscr'); await pa.click('#eMenu'); await pa.wait_for_timeout(300); return t
        t = await winp(['cloak', 'axe', 'herbs']); print('con objetos usados → Minimalista:', 'Minimalista' in t); assert 'Minimalista' not in t
        t = await winp([]); print('sin objetos → Minimalista:', 'Minimalista' in t); assert 'Minimalista' in t
        print('errores', ea); assert not ea; print('ok  Minimalista solo sin objetos desde el inicio'); await b.close()
asyncio.run(main())
