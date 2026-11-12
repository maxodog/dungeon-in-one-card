# Dungeon in One Card (versión web)

Versión web jugable desde el celular, sin instalar nada, del juego solitario de dados *One Card Dungeon*, de Barny Skinner.

**Jugar:** https://maxodog.github.io/dungeon-in-one-card/

Adaptación no oficial: los mapas, las cifras de los monstruos y su aparición por nivel siguen la carta original; las ilustraciones y los textos son propios. Si te gusta el juego, apoya al autor y consíguelo.

## Desarrollo

- `index.html` es el juego completo en un solo archivo (es lo que se publica).
- El código fuente está en `src/` (`engine.js` reglas, `ui.js` interfaz, `style.css`, `template.html`). Tras editarlo, ejecuta `python3 src/build.py` para regenerar `index.html`.
- `test/` tiene pruebas del motor con Node: `node test/pw_test.js`, `node test/los_test.js`, `node test/diag_test.js`.
