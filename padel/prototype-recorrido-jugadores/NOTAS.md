# Prototipo: recorrido del Jugador en el celular

PROTOTIPO descartable — ticket "Recorrido del Front de Jugadores" (fdllrs/taller_db#16). Visual: Neón.

## Cómo correrlo

```
cd padel/prototype-recorrido-jugadores && npm install && npm start
```
Abrir http://localhost:5174/. Es responsive (corte en 768 px: abajo barra de tabs inferior, arriba barra superior). Arriba a la derecha en el celular (abajo a la derecha en desktop) está el selector "Jugando como" y el "Estado (debug)". "Ahora" está fijo: miércoles 2026-11-25 10:00.

## Recorrido para probar

1. Como Martina, tab **Partidas** (inicio): arriba el botón **Reservar una Cancha** (el subtítulo resume la búsqueda). Tocalo: panel paso a paso (pantalla completa en celular, modal en desktop), 3 pantallas: **¿Qué día?** (calendario del mes, con "Jugás en [Localidad]" arriba) > **¿A qué hora?** (franja + duración y, en vivo, los Horarios libres de todos los Clubes de la localidad, "3 Canchas" por hora) > **¿Dónde?** ("Me da igual" reserva la primera opción; o elegís Club + Cancha; si hay una sola opción se salta). Arriba: ‹ atrás, ✕, barra de 3 segmentos, título y una línea con lo elegido.
2. Tocá un horario: se abre la hoja con Club, Cancha (chips para elegir si hay más de una libre), fecha ("Miércoles 25 de noviembre"), inicio–fin y duración.
3. **Reservar** (probá también tocar un Horario ocupado desde otra cuenta para ver los errores en rojo).
4. En "Reserva confirmada": **Abrir Partida** (o **Listo**, y abrirla después desde **Mis reservas**).
5. Cambiá a Joaquín Sosa o Lucía Ferreyra en el selector (se queda en la tab actual). En **Partidas** buscá la Partida de Martina y tocá **Unirme**. Probá **Salir**, y mirá que el creador solo ve "Sos el creador".
6. Volvé a Martina: en **Mis reservas** aparece "Partida 2/4" y **Cancelar Reserva** (con confirmación) borra la Partida.
7. Extra: en Palermo ya hay Partidas sembradas (3/4 hoy 19:00 en Soho, 2/4, 1/4 de Joaquín; la 4/4 no se lista). Tab **Clubes** muestra `ver_club` por día; Soho cierra los domingos.

## Líneas de TS

- `src/store.ts`: 149 (datos semilla + un stub por Procedimiento)
- `src/main.ts`: 236 (pantallas, panel de búsqueda de 3 pasos, hoja de reserva, chrome, acciones)
- Total: 385. Más `styles/app.css` (133).

## Cómo se mapeó `hora` en `buscar_horarios`

El panel de búsqueda ofrece franjas (Cualquier hora, Mañana 08–12, Tarde 12–18, Noche 18–24). **No se usa `hora`**: se llama a `buscar_horarios` sin `hora` y el front filtra los inicios devueltos por franja. Motivo: `hora` (±1 h) no expresa un rango; conviene un parámetro de franja (o `hora_desde`/`hora_hasta`) en el back.

## Iteración 2 (feedback del usuario)

"La página de Buscar no me gusta. Hacelo más paso a paso. Hacelo responsive."
- Buscar pasó de un formulario largo a un wizard de 4 pasos (Dónde / Día / Hora + duración / Horarios libres), con pastillas-resumen tocables, "‹ Atrás" y "Paso N de 4". El estado vive en `ui.w` y sobrevive al cambio de tab o de cuenta.
- Acciones nuevas: `w-loc`, `w-dia`, `w-hora`, `w-ver`, `w-paso`, `w-atras` (valor en `data-v`); el contenedor lleva `data-paso`. Tras reservar + "Listo" se queda en el paso 4 refrescado.
- Se quitó el marco de celular: mobile (< 768 px) a pantalla completa con tabs abajo y hoja desde abajo; desktop (>= 768 px) con barra superior "Pádel", contenido de 720 px máx. y hoja como modal centrado.
- El selector "Jugando como" es una píldora fija; el debug solo se ve en desktop.

## Iteración 3 (feedback del usuario)

"Unificá la parte de buscar arriba de 'Partidas' como un botón. No me gusta el paso a paso. Hacelo más lindo. La fecha ponela más como una fecha."
- Se eliminó la tab Buscar y el wizard. Tabs: `partidas` (inicio), `clubes`, `reservas`. Arriba de Partidas hay un botón-tarjeta neón (`buscar-abrir`) que abre el panel `.busqueda`: todo en una pantalla y en vivo (sin botón de enviar). Cierra con la ✕ (`buscar-cerrar`) o tocando fuera en desktop. El estado de búsqueda (`ui.loc/dia/fr/bloques`) persiste al cerrar, cambiar de tab o de cuenta.
- Acciones nuevas: `buscar-abrir`, `buscar-cerrar`, `s-dia` (`data-v` = offset 0..14), `s-franja` (`data-v` = `""` Cualquier hora, `manana`, `tarde`, `noche`). Se quitaron `w-*`. `loc` y `dur` se comparten con Clubes/Partidas.
- Fechas como fechas: tile de calendario (SEMANA / número grande / mes, "HOY" en el de hoy) en la búsqueda, en el filtro de Partidas (con tile "Todas") y en Clubes; la fecha elegida se escribe abajo ("Miércoles 25 de noviembre"). Las cards (Partidas, Mis reservas) llevan el tile a la izquierda y "Mié 25 nov" + etiqueta Hoy/Mañana. La hoja muestra la fecha larga.
- "Más lindo": radios 12/14/16, títulos de sección en mayúscula chica gris, glow neón solo en el botón principal y en el CTA de buscar, animación de entrada de panel y hoja (se apaga con `prefers-reduced-motion`).
- En celular la ✕ va a la izquierda y el header deja lugar arriba: la píldora "Jugando como" (chrome del prototipo) tapaba el título.
- Sigue valiendo la nota de franja: se filtra en el cliente, `hora` de `buscar_horarios` no se usa.

## Iteración 4 (feedback del usuario)

"No me gusta que me muestre todos los horarios de una. Es una banda de texto. Más poco a poco."
- Los Horarios libres de la búsqueda van por niveles: (1) un Club por tarjeta, cerrada, con "N horarios libres · desde HH:MM" (inicios distintos entre todas sus Canchas); (2) al tocar el Club se abre en el lugar (uno a la vez) con los inicios distintos en grilla (4 por fila en celular, 6 en desktop), los primeros 8 y "Ver más (N)"; (3) al tocar un horario se abre la hoja, que ahora tiene los chips de Cancha libres a esa hora (la primera preseleccionada; si hay una sola, texto).
- Ya no se agrupa por Cancha: al Jugador le importa la hora, la Cancha es un detalle de la confirmación.
- Estado en `ui.abierto` / `ui.mas`; se cierran al cambiar localidad, fecha, franja o duración. Tras reservar + "Listo" el Club sigue abierto con los horarios refrescados.
- Acciones nuevas: `club-toggle`, `ver-mas` (`data-v` = código del Club), `sheet-cancha` (`data-v` = nombre de Cancha). `slot` de la búsqueda ya no lleva `data-cancha`; el de `ver_club` (Clubes) sí y preselecciona esa Cancha.
- Extra: el borde del Club abierto es neón, la apertura anima (se apaga con `prefers-reduced-motion`) y las franjas ya no se cortan en el modal de desktop.

## Iteración 5 (feedback del usuario)

"Que sea paso a paso" (toda la búsqueda); del wizard de la iteración 2: "no me gustaba cómo estaba hecho, pero la idea está bien". Primera versión: 6 pasos (Localidad, Día, Hora, Club, Horario, Cancha). Feedback: "Son muchos pasos. ¿Qué pasa si una persona no sabe en qué Club quiere, o no le importa el Club?" Versión final: 3 pasos, tiempo primero y Club al final y opcional.
- Pasos (`data-paso` 1..3, estado `ui.paso/hora`, se retoma donde quedó y sobrevive a tabs y cuentas): (1) `s-dia` calendario real (solo semanas con días habilitados, "HOY") con la Localidad como `<select>` `s-loc` arriba; (2) `s-franja` + `dur` y, en vivo, los Horarios libres como unión de todos los Clubes y Canchas (`slot` con `data-fecha`/`data-hora`, sin club ni cancha; "N Canchas" por hora; vacío: `s-ir`); (3) `s-igual` ("Me da igual", con subtítulo de lo que se reserva) o `s-opcion` (`data-club`, `data-cancha`) agrupado por Club. Con una sola opción se salta el paso 3. Navegación: `s-atras`, `buscar-cerrar`. Se quitaron `club-toggle`, `ver-mas`, el acordeón y (de la v. de 6 pasos) `s-club`, `s-cancha`, `s-continuar`.
- Cambiar algo anterior borra la hora elegida. Hoja de confirmación igual (chips de Cancha del Club elegido). "Volver" deja la búsqueda en su paso; "Listo" tras reservar (con o sin Partida) cierra el panel y vuelve a Partidas.
- Transiciones: deslizado corto (entra desde la derecha al avanzar, desde la izquierda al volver), solo al cambiar de paso, apagado con `prefers-reduced-motion`; el cuerpo vuelve arriba en cada paso.
- Diferencia con la iteración 2: sin pastillas-resumen tocables ni "Paso N de 4" (una línea de texto y una barra fina; se vuelve con ‹); el día es un calendario y no una fila de chips; los Horarios son los de toda la localidad, no de un Club; el Club es lo último y se puede saltear; filas de 64 px y un solo color de acento.

## Lo que pidió la pantalla y no está en los Procedimientos

- **`buscar_horarios` devuelve por Cancha lista de horas; la pantalla quiere por Club los inicios distintos y, por cada inicio, las Canchas libres.** Hoy el front hace la unión y la inversa (`libresEn`) en el cliente. Conviene que devuelva `{ club, horarios: [{ hora, canchas: [...] }] }`.
- **`listar_partidas_abiertas` no devuelve quiénes están anotados.** La card necesita las iniciales de cada Jugador, el nombre del creador y saber si yo ya estoy anotado (para mostrar "Unirme" vs "Estás anotado/Salir" vs "Sos el creador"). Usé un helper `jugadoresDe(clave)` que no es Procedimiento. Hace falta que devuelva la lista de Jugadores (o al menos creador + "yo estoy").
- **`listar_partidas_abiertas` tampoco tiene que devolver solo cantidad**: devuelve club, cancha, fecha, hora, `bloques` y `jugadores` (número). El `bloques` (duración, para mostrar inicio–fin) hay que pedirlo explícito; no estaba en "key + Jugadores".
- **Nombre del Club desde el código**: las Reservas/Partidas traen el `codigo` del Club; la pantalla muestra `nombre`. Usé `nombreClub(codigo)` (no es Procedimiento). Las Reservas de `mis_reservas` y las Partidas necesitan traer el `nombre` del Club.
- **`ver_club` devuelve Bloques libres/ocupados, pero la pantalla necesita "inicios posibles para N Bloques"**: hubo que calcular en el cliente qué inicios admiten una duración de 2/3/4 Bloques contiguos libres. Es lógica de dominio que se duplica entre front y back (`buscar_horarios` ya la tiene).
- **`ver_club` debe marcar como no libres los Bloques que ya empezaron** (hoy). Lo hice así; si no, la pantalla ofrece inicios inválidos.
- **No hay operación para ver el estado de una Reserva puntual** (por ejemplo, para refrescar la hoja de confirmación): se usa la clave que arma el cliente (`club|cancha|fecha|hora`). Armar la clave en el cliente es un acuerdo implícito; conviene que el back devuelva la `clave` en cada Reserva/Partida.
- **`mis_reservas` mezcla en un solo resultado Reservas propias y Partidas donde participo**; la pantalla necesita separarlas, y por cada Reserva propia saber si tiene Partida y cuántos Jugadores (`Partida 2/4`) y quiénes (círculos con iniciales). Lo armé en el stub (`{ reserva, partida? }`).
- **Fecha/hora "ahora" y huso horario**: la pantalla necesita saber "hoy" y la hora actual para el chip "Hoy", y para ocultar lo que ya empezó. Salió de una constante; en real hace falta una fuente única (el back).
- **Ventana de 14 días**: los chips de días la asumen (15 chips); no hay un Procedimiento ni parámetro que la informe. Si cambia en el back, el front no se entera.
- **Horario del Club en texto** ("Lun–Sáb 09:00–23:00 · Dom cerrado"): `listar_clubes` devuelve el Horario por día, y el agrupado en texto lo hace el front.
- **Cambiar de localidad**: no hay `listar_localidades`; la lista de "Localidad, Provincia" está hardcodeada en el front. Hace falta un Procedimiento (o datos de referencia).
- **Errores sin código**: el front solo muestra el texto del error; para decidir cosas (por ejemplo, refrescar la lista si la Partida se llenó, o cerrar la hoja si "Horario ocupado") hacen falta códigos de error estables, no solo mensajes.
- **Falta "Partida inexistente"** en los errores de `unirse`/`salir` (Reserva cancelada mientras tanto) y "Reserva inexistente" en `abrir_partida`; los agregué.

- **`buscar_horarios` debería poder devolver la disponibilidad agregada por hora de inicio entre Clubes** (hora -> lista de `{club, cancha}`): el paso 2 muestra horas de toda la localidad y el paso 3 las opciones de esa hora. Hoy el cliente lo arma invirtiendo el resultado por Cancha (`porHora`).

## Qué dolió en TS plano

- Re-render completo con `innerHTML` pierde el scroll (vertical y de los chips de días) y el estado de los `<details>`: hubo que guardarlos y restaurarlos a mano (`scrollTop`, `scrollLeft`, evento `toggle`).
- Hay que reproducir el estado de cada pantalla en un objeto `ui` y mantener un `errs` por clave para los errores inline.
- Strings de HTML largos sin chequeo: un `esc()` olvidado o una comilla mal cerrada no se ve hasta correrlo.
- El `data-v`/`dataset` convierte todo en string, así que cada acción hace `+v` a mano.

## Verificación

Recorrido completo probado en Chrome headless (DevTools Protocol, 390×844 móvil), sin excepciones: reservar desde el panel de búsqueda, abrir la Partida desde la hoja, cambiar a Joaquín, encontrarla en Partidas, unirse, salir y volver a unirse; llenar la 3/4 (deja de listarse), cancelar una Reserva con confirmación, reservar desde Clubes, y la búsqueda (Horario y duración) se conserva al cambiar de tab.
