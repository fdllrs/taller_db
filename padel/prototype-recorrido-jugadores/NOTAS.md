# Prototipo: recorrido del Jugador en el celular

PROTOTIPO descartable — ticket "Recorrido del Front de Jugadores" (fdllrs/taller_db#16). Visual: Neón.

## Cómo correrlo

```
cd padel/prototype-recorrido-jugadores && npm install && npm start
```
Abrir http://localhost:5174/. En desktop se ve dentro de un marco de celular; a la derecha (o arriba a la derecha en pantallas angostas) está el selector "Jugando como" y el "Estado (debug)". "Ahora" está fijo: miércoles 2026-11-25 10:00.

## Recorrido para probar

1. Como Martina Ibarra, tab **Buscar**: Palermo, CABA, elegí un día, un Horario ("Alrededor de las 20:00") y una duración.
2. Tocá un Horario libre: se abre la hoja con Club, Cancha, fecha, inicio–fin y duración.
3. **Reservar** (probá también tocar un Horario que ya empezó o uno ocupado desde otra cuenta para ver los errores en rojo).
4. En "Reserva confirmada": **Abrir Partida** (o **Listo**, y abrirla después desde **Mis reservas**).
5. Cambiá a Joaquín Sosa o Lucía Ferreyra en el selector (se queda en la tab actual). En **Partidas** buscá la Partida de Martina y tocá **Unirme**. Probá **Salir**, y mirá que el creador solo ve "Sos el creador".
6. Volvé a Martina: en **Mis reservas** aparece "Partida 2/4" y **Cancelar Reserva** (con confirmación) borra la Partida.
7. Extra: en Palermo ya hay Partidas sembradas (3/4 hoy 19:00 en Soho, 2/4, 1/4 de Joaquín; la 4/4 no se lista). Tab **Clubes** muestra `ver_club` por día; Soho cierra los domingos.

## Líneas de TS

- `src/store.ts`: 149 (datos semilla + un stub por Procedimiento)
- `src/main.ts`: 149 (pantallas, hoja de reserva, chrome, acciones)
- Total: 298. Más `styles/app.css` (53).

## Cómo se mapeó `hora` en `buscar_horarios`

El Horario de la pantalla es un select "Alrededor de las HH:00" (8 a 23); `hora` es un "HH:MM" y se devuelven solo los inicios a ±1 h de esa hora. Sin `hora`, todos los inicios libres del día. La búsqueda es en vivo (no hay botón "Buscar").

## Lo que pidió la pantalla y no está en los Procedimientos

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

## Qué dolió en TS plano

- Re-render completo con `innerHTML` pierde el scroll (vertical y de los chips de días) y el estado de los `<details>`: hubo que guardarlos y restaurarlos a mano (`scrollTop`, `scrollLeft`, evento `toggle`).
- Hay que reproducir el estado de cada pantalla en un objeto `ui` y mantener un `errs` por clave para los errores inline.
- Strings de HTML largos sin chequeo: un `esc()` olvidado o una comilla mal cerrada no se ve hasta correrlo.
- El `data-v`/`dataset` convierte todo en string, así que cada acción hace `+v` a mano.

## Verificación

Recorrido completo probado en Chrome headless (DevTools Protocol, 390×844 móvil), sin excepciones: reservar desde Buscar, abrir la Partida desde la hoja, cambiar a Joaquín, encontrarla en Partidas, unirse, salir y volver a unirse; llenar la 3/4 (deja de listarse), cancelar una Reserva con confirmación, reservar desde Clubes, y la búsqueda (Horario y duración) se conserva al cambiar de tab.
