import hashlib
t=open('template.html').read()
import os
snd=''.join(open(f).read() for f in ('sounds.js','music.js') if os.path.exists(f))
parts=[open('style.css').read(),open('engine.js').read(),open('ui.js').read(),t,snd]
build=hashlib.sha1(''.join(parts).encode()).hexdigest()[:10]
t=t.replace('/*STYLE*/',parts[0]).replace('/*ENGINE*/',parts[1]).replace('/*UI*/',parts[2]).replace('/*SOUNDS*/',parts[4]).replace('/*BUILD*/',build)
open('index.html','w').write(t)
print(len(t),'bytes, versión',build)
