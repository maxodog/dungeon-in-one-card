import asyncio, json, hashlib
exec(open('/home/claude/dungeon-in-one-card/test/cloud_test.py').read().split('async def main')[0])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--lang=es-CL'])
        A, pa, ea = await device(b)
        h = hashlib.sha256(b'abc|1234').hexdigest()
        users = {'max': {'name': 'Max', 'salt': 'abc', 'hash': h, 'created': 1, 'rec': {'games': {'peak': {'wins': 2, 'falls': 1, 'best': 10, 'bestRank': 'Intocable', 'fastest': 50}}, 'tot': {'wins': 2}, 'ach': {'win_peak': {'d': 1, 'g': 'peak'}}, 'hist': [], 'heroes': ['knight'], 'runs': {}}}}
        await pa.evaluate("u => { localStorage.setItem('dioc-users-v1', JSON.stringify(u)); localStorage.setItem('dioc-user', 'max'); }", users)
        await pa.reload(); await pa.wait_for_timeout(400)
        await pa.click('#mUser'); await pa.wait_for_timeout(200)
        print('antes:', (await pa.inner_text('.cloud-box')).replace('\n', ' '))
        await pa.click('#cUp'); await pa.fill('#upPw', '1234'); await pa.click('#upGo'); await pa.wait_for_timeout(500)
        await pa.fill('#upPw', '1234'); await pa.fill('#upNew', 'clave123'); await pa.click('#upGo'); await pa.wait_for_timeout(1000)
        print('después:', (await pa.inner_text('.cloud-box')).replace('\n', ' '))
        doc = json.loads(list(docs.values())[0]['fields']['data']['stringValue']); assert doc['rec']['games']['peak']['wins'] == 2
        await pa.screenshot(path='/tmp/c_up.png')
        print('errores', ea); assert not ea; print('ok  usuario local subido a la nube con contraseña nueva'); await b.close()
asyncio.run(main())
