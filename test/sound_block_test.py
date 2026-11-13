import asyncio, json, subprocess
from playwright.async_api import async_playwright
def st():
    js="""const E=require('/home/claude/dungeon-in-one-card/engine.js');const st=E.newRun('paladin','base',[]);
    st.mons.forEach((m,i)=>{m.x=4;m.y=3-i*2;m.hp=5}); st.phase='move';
    st.turn={dice:[3,3,3],assign:{spd:0,atk:1,def:2,rng:-1},sel:-1,lock:-1,ranger:false,rerolled:false,spd:8,atk:8,def:9,rng:2,spdLeft:8,atkLeft:8}; st.adv.x=4; st.adv.y=4; st.totalTurns=3;console.log(JSON.stringify(st));"""
    return subprocess.check_output(['node','-e',js]).decode()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width':390,'height':780}, is_mobile=True, has_touch=True)
        await ctx.add_init_script("localStorage.setItem('dioc-run-v3', %s)" % json.dumps(st()))
        page = await ctx.new_page(); errs=[]
        page.on('pageerror', lambda e: errs.append(str(e)))
        await page.add_init_script("window.__s=[];const o=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(){window.__s.push([Math.round(performance.now()),+this.buffer.duration.toFixed(2)]);return o.apply(this,arguments)}; new MutationObserver(()=>{const f=document.querySelector('.float.block'); if(f&&!window.__fb){window.__fb=Math.round(performance.now())}}).observe(document,{childList:true,subtree:true})")
        await page.goto('file:///home/claude/dungeon-in-one-card/index.html'); await page.wait_for_timeout(300)
        await page.click('#mContinue'); await page.wait_for_timeout(800)
        await page.click('#btnEnd'); await page.wait_for_timeout(8000)
        print('sonidos [ms, dur]:', await page.evaluate("window.__s"), '| texto BLOCK a los', await page.evaluate("window.__fb"))
        print('log:', await page.evaluate("document.querySelector('#log, .log, #say, #msg')?.textContent||''"))
        print(errs); await b.close()
asyncio.run(main())
