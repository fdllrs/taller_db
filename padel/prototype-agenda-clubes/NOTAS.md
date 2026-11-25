# Notas del prototipo: ¿alcanza TS sin framework?

Correr: `npm install && npm start` y abrir `http://localhost:5173/?variant=A` (o B, C). Estado en memoria, se pierde al recargar.

## Líneas de TS por variante

| Variante | TS | CSS |
|---|---|---|
| A, Calendario claro (drag + popover) | 120 | 41 |
| B, Tablero denso (clic-clic + panel lateral) | 134 | 34 |
| C, Deportivo (modal) | 117 | 56 |
| D, Deportivo simple (drag + popover, paleta de C) | 120 | 36 |
| Compartido: `store.ts` 59, `main.ts` (switcher + debug) 61 | 120 | 14 |

Nota: no se probó en un navegador real (solo compila, sirve y se probó el store con node). Las observaciones sobre el DOM salen de escribir el código, no de usarlo.

## Variante D (agregada después)

D = paleta/tipografía de C + creación por arrastre de A + popover mínimo. El drag con plain TS no sumó dolor nuevo respecto de A: se copió el patrón (`paintDrag` por clases durante el arrastre, `render()` al soltar). Lo único extra fue usar `pointer*` en vez de `mouse*` para que sirva en touch: hay que poner `touch-action: none` en los Bloques y buscar el Bloque bajo el dedo con `elementFromPoint`, porque el puntero queda capturado por el primer elemento. El drag en sí no se probó con un navegador real (solo la captura estática).

## Qué fue fácil

- El store con `subscribe` + `render()` completo (`innerHTML` con template strings) es corto y se entiende. Con 4 x 32 celdas el costo de reconstruir todo es irrelevante.
- Delegación de eventos en el contenedor (un `click`/`submit` por variante) evita re-cablear listeners después de cada render.
- El layout (posicionamiento absoluto por Bloque) es CSS puro, no depende de ningún framework.

## Qué dolió

- **Re-render vs. estado de UI efímero.** Cada `innerHTML =` destruye foco, scroll y lo escrito en inputs. Hubo que reparar a mano: en B y C el titular se guarda en una variable en cada `input` para restaurarlo; en C se guarda y restaura `scrollY`; en A y C se re-enfoca el input después de renderizar. Es la causa de casi todos los bugs potenciales, y un framework con DOM diffing lo resuelve gratis.
- **Drag (A).** No se puede re-renderizar mientras se arrastra, así que hay dos caminos de pintado: `render()` para el estado y `paintDrag()` que toca clases directo. Mantener ambos coherentes es trabajo manual. Lo mismo con el preview de rango en B (`paintPreview`).
- **Formularios.** B tiene selects dependientes (el "hasta" depende del "desde"); hubo que escribir a mano la lógica de qué se re-renderiza y qué no. Sin binding bidireccional, cada campo necesita su `input`/`change` handler.
- **Sin tipos en el HTML.** Los `data-*` y los `querySelector` son strings: un typo en `data-cancha` no lo detecta `tsc`. Se castea `as HTMLElement` seguido.
- **Seguridad.** Hay que acordarse de `esc()` en cada interpolación del titular; con templates de framework el escape es el default.
- **Ciclo de vida.** Cada variante agrega listeners en `document` y hay que removerlos al cambiar de variante (`mount` devuelve un `unmount`). Fácil de olvidar.

## Qué no se midió

Accesibilidad con teclado (B y A son solo mouse), touch real en C, y qué pasa con más de un día o un Club (el modelo de Reserva/Partida real tiene más estados, y ahí el re-render manual escala peor).

## Recomendación

conviene un framework liviano (Lit o Preact): para una pantalla con estado efímero de UI (selección, drag, modal, formulario) el TS plano funciona pero obliga a reimplementar a mano foco/scroll/valores de inputs en cada render, y eso solo va a empeorar con más pantallas.

## Variante E — Neón (la elegida)

Verde neón sobre negro y gris oscuro. Clic en un Bloque libre abre el formulario de C (Cancha, duración, inicio, titular); arrastrar abre un menú simple con Inicio y Fin editables con − / +; clic en una Reserva abre el mismo menú para cambiarle el horario o cancelarla. 179 líneas de TS, escrita a mano.

TS plano alcanzó: el único cuidado fue guardar en el estado lo que se escribe (titular) para que sobreviva al re-render de los steppers, y enfocar el input solo al abrir. Probado en Chrome headless por DevTools Protocol: arrastre, clic, steppers, conservación del titular, edición de horario, rechazo por solape y cancelación.
