import hashlib
t=open('template.html').read()
parts=[open('style.css').read(),open('engine.js').read(),open('ui.js').read(),t]
build=hashlib.sha1(''.join(parts).encode()).hexdigest()[:10]
t=t.replace('/*STYLE*/',parts[0]).replace('/*ENGINE*/',parts[1]).replace('/*UI*/',parts[2]).replace('/*BUILD*/',build)
open('index.html','w').write(t)
print(len(t),'bytes, versión',build)
