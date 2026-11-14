# Usuarios en la nube con un Firebase simulado (Authentication + Firestore por REST)
import asyncio, json, subprocess, re, secrets
from urllib.parse import urlparse, parse_qs, unquote
from playwright.async_api import async_playwright
ENG = '/home/claude/dungeon-in-one-card/src/engine.js'; URL = 'file:///home/claude/dungeon-in-one-card/index.html'
JS = """const st=E.newRun('knight','base',[]); E.setupLevel(st,11); const lv=E.LEVELS[11]; const m0=lv.mon; let sx,sy;
 for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const x=st.adv.x+dx,y=st.adv.y+dy; if (x>=0&&y>=0&&x<5&&y<5&&!lv.walls[E.idx(x,y)]) { sx=x; sy=y; break; } }
 st.mons=[{id:1,x:sx,y:sy,hp:1,maxHp:m0.hp,spd:m0.spd,atk:m0.atk,def:m0.def,rng:m0.rng}]; st.stats={kills:11,hits:20,dmgIn:4,blocks:9,chests:0}; st.totalTurns=60; st.trackAbil=true; st.abilEver=false;
 E.rollTurn(st); st.turn.dice=[6,6,6]; st.turn.assign={spd:0,atk:1,def:2,rng:-1}; E.confirmEnergy(st); st.turn.atkLeft=99; st.turn.rng=99;"""
ST = subprocess.check_output(['node','-e',f"const E=require('{ENG}');"+JS+";console.log(JSON.stringify(st));"]).decode().strip()
accounts, docs, tokens = {}, {}, {}
OFFLINE = {'on': False}
def tok(uid): t = secrets.token_hex(8); tokens[t] = uid; return t
async def handler(route):
    if OFFLINE['on']: return await route.abort()
    req = route.request; u = urlparse(req.url); body = req.post_data or ''
    def ok(j, st=200): return route.fulfill(status=st, content_type='application/json', body=json.dumps(j), headers={'Access-Control-Allow-Origin': '*'})
    def err(m, st=400, status=None): return ok({'error': {'message': m, 'status': status or m}}, st)
    if req.method == 'OPTIONS': return await route.fulfill(status=204, headers={'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*'})
    if 'identitytoolkit' in u.netloc:
        j = json.loads(body or '{}'); act = u.path.split(':')[-1]
        if act == 'signUp':
            if j['email'] in accounts: return await err('EMAIL_EXISTS')
            if len(j['password']) < 6: return await err('WEAK_PASSWORD : Password should be at least 6 characters')
            uid = 'uid' + secrets.token_hex(4); accounts[j['email']] = {'pw': j['password'], 'uid': uid}
            return await ok({'localId': uid, 'idToken': tok(uid), 'refreshToken': 'r' + uid, 'expiresIn': '3600'})
        if act == 'signInWithPassword':
            a = accounts.get(j['email'])
            if not a or a['pw'] != j['password']: return await err('INVALID_LOGIN_CREDENTIALS')
            return await ok({'localId': a['uid'], 'idToken': tok(a['uid']), 'refreshToken': 'r' + a['uid'], 'expiresIn': '3600'})
        if act == 'delete':
            uid = tokens.get(j['idToken'])
            for e, a in list(accounts.items()):
                if a['uid'] == uid: del accounts[e]
            return await ok({})
    if 'securetoken' in u.netloc:
        rt = parse_qs(body)['refresh_token'][0]; uid = rt[1:]
        return await ok({'id_token': tok(uid), 'refresh_token': rt, 'expires_in': '3600', 'user_id': uid})
    if 'firestore' in u.netloc:
        uid = unquote(u.path.rsplit('/', 1)[-1]); auth = (req.headers.get('authorization') or '')[7:]
        if tokens.get(auth) != uid: return await err('Missing or insufficient permissions.', 403, 'PERMISSION_DENIED')
        if req.method == 'GET': return await (ok(docs[uid]) if uid in docs else err('not found', 404, 'NOT_FOUND'))
        if req.method == 'PATCH': docs[uid] = json.loads(body); return await ok(docs[uid])
        if req.method == 'DELETE': docs.pop(uid, None); return await ok({})
    await route.continue_()
async def device(b):
    ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True)
    await ctx.route(re.compile(r'https://(identitytoolkit|securetoken|firestore)\.googleapis\.com/.*'), handler)
    pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(URL); await pg.wait_for_timeout(400); return ctx, pg, errs
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        # --- dispositivo A: crear usuario
        A, pa, ea = await device(b)
        await pa.click('#mUser'); await pa.click('#uNew'); await pa.wait_for_selector('#uPw2')
        await pa.fill('#uName', 'Ana María'); await pa.fill('#uPw', '1234'); await pa.fill('#uPw2', '1234'); await pa.click('#uGo'); await pa.wait_for_timeout(300)
        print('err:', await pa.inner_text('#uErr')); assert '6 CARACTERES' in (await pa.inner_text('#uErr')).upper()
        await pa.fill('#uPw', 'secreto1'); await pa.fill('#uPw2', 'secreto1'); await pa.click('#uGo'); await pa.wait_for_timeout(800)
        assert 'Ana María' in await pa.inner_text('#mUser'); print('cuentas:', list(accounts))
        assert list(accounts)[0].endswith('@usuarios.dioc.juego')
        # gana una partida
        await pa.evaluate("s => localStorage.setItem('dioc-run-v3:u:ana maría', s)", ST)
        await pa.reload(); await pa.wait_for_timeout(500); await pa.click('#mContinue'); await pa.wait_for_timeout(500)
        await pa.locator('.tile.target').first.click(); await pa.wait_for_timeout(3500)
        t_new = await pa.inner_text('.end-new'); assert 'Cáliz de Brasas' in t_new and 'Sin trucos' in t_new, t_new
        await pa.click('#eMenu'); await pa.wait_for_timeout(1200)
        doc = json.loads(list(docs.values())[0]['fields']['data']['stringValue'])
        assert doc['rec']['games']['base']['wins'] == 1 and 'saves' in doc, doc['rec']['games']; print('nube: base ganada, logros', len(doc['rec']['ach']))
        await pa.click('#mUser'); await pa.wait_for_timeout(300)
        print('perfil A:', (await pa.inner_text('.cloud-box')).replace('\n', ' '))
        await pa.screenshot(path='/tmp/c_profA.png')
        # --- dispositivo B: entra con el mismo usuario
        B, pb, eb = await device(b)
        await pb.click('#mUser'); await pb.click('#uRem'); await pb.fill('#uName', 'ana maría'); await pb.fill('#uPw', 'malmal'); await pb.click('#uGo'); await pb.wait_for_timeout(500)
        assert 'incorrectos' in await pb.inner_text('#uErr')
        await pb.fill('#uPw', 'secreto1'); await pb.click('#uGo'); await pb.wait_for_timeout(1000)
        await pb.click('#mUser'); await pb.wait_for_timeout(300)
        t = await pb.inner_text('.prof'); assert 'Completada' in t, t[:300]; print('dispositivo B ve la mazmorra completada')
        await pb.screenshot(path='/tmp/c_profB.png', full_page=True)
        # nombre ya usado
        await pb.click('#pOut'); await pb.click('#mUser'); await pb.click('#uNew')
        await pb.fill('#uName', 'Ana María'); await pb.fill('#uPw', 'otraclave'); await pb.fill('#uPw2', 'otraclave'); await pb.click('#uGo'); await pb.wait_for_timeout(500)
        print('mismo nombre:', await pb.inner_text('#uErr'))
        # --- sin internet: A sale y vuelve a entrar con la copia local
        await pa.click('#pOut'); OFFLINE['on'] = True
        await pa.click('#mUser'); await pa.click('[data-uk="ana maría"]'); await pa.fill('#uPw', 'secreto1'); await pa.click('#uGo'); await pa.wait_for_timeout(600)
        assert 'Ana María' in await pa.inner_text('#mUser'); print('entra sin internet con la copia local')
        OFFLINE['on'] = False
        # --- borrar usuario borra la nube
        await pa.click('#mUser'); await pa.click('#pDel'); await pa.fill('#dPw', 'secreto1'); await pa.click('#dGo'); await pa.wait_for_timeout(800)
        assert not accounts and not docs, (accounts, docs); print('borrado también en la nube')
        print('errores', ea, eb); assert not ea and not eb
        print('ok  usuarios en la nube'); await b.close()
asyncio.run(main())
