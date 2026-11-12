t=open('template.html').read()
t=t.replace('/*STYLE*/',open('style.css').read()).replace('/*ENGINE*/',open('engine.js').read()).replace('/*UI*/',open('ui.js').read())
open('index.html','w').write(t)
print(len(t),'bytes')
