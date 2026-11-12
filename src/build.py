# Une style.css, engine.js y ui.js en template.html y escribe ../index.html
import os
d = os.path.dirname(os.path.abspath(__file__))
rd = lambda n: open(os.path.join(d, n), encoding='utf-8').read()
t = rd('template.html').replace('/*STYLE*/', rd('style.css')).replace('/*ENGINE*/', rd('engine.js')).replace('/*UI*/', rd('ui.js'))
open(os.path.join(d, '..', 'index.html'), 'w', encoding='utf-8').write(t)
print(len(t), 'bytes')
