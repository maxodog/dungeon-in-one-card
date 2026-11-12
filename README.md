# Dungeon in One Card (versión web)

Versión web jugable desde el celular, sin instalar nada, del juego solitario de dados *One Card Dungeon*, de Barny Skinner.

**Jugar:** https://maxodog.github.io/dungeon-in-one-card/

Incluye la aventura original (12 niveles) y las expansiones *M'Guf-yn Returns* (cofres, 4 jefes y 4 héroes), *Eternal Peak* / Montaña Eterna (10 niveles, ventiscas, Sherpa) *Harbour Clash* (8 niveles, agua, Corsario) y *Hell's Door* / La Puerta del Infierno (12 niveles, 4 jefes, casillas malditas, Piedra de la Perdición, Cazador de demonios). Con cualquier aventura juegas con los héroes de la original y de esa expansión, y un botón permite elegir héroes de las demás. Los objetos de Montaña Eterna, Harbour Clash y La Puerta del Infierno se pueden usar en cualquier aventura. Contraseñas de 4, 5 (antiguas), 7 y 8 caracteres (8 en La Puerta del Infierno). Las portadas del menú (`img/`) son de Little Rocket Games.

Adaptación no oficial: los mapas, las cifras de los monstruos y su aparición por nivel siguen la carta original; las ilustraciones y los textos son propios. Si te gusta el juego, apoya al autor y consíguelo.

## Desarrollo

- `index.html` es el juego completo en un solo archivo (es lo que se publica).
- El código fuente está en `src/` (`engine.js` reglas, `ui.js` interfaz, `style.css`, `template.html`). Tras editarlo, ejecuta `python3 src/build.py` para regenerar `index.html`.
- `test/` tiene pruebas del motor con Node: `node test/pw_test.js`, `node test/los_test.js`, `node test/diag_test.js`, `node test/peak_test.js`, `node test/exp_test.js`. Las pruebas de interfaz (Playwright) están en `test/*.py`.
