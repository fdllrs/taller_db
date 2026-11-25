# Prototipo: recorrido del Jugador en el celular

PROTOTIPO descartable — ticket "Recorrido del Front de Jugadores" (fdllrs/taller_db#16). Visual: Neón.

## Cómo correrlo

```
cd padel/prototype-recorrido-jugadores && npm install && npm start
```
Abrir http://localhost:5174/. Es responsive (corte en 768 px: abajo barra de tabs inferior, arriba barra superior). Arriba a la derecha en el celular (abajo a la derecha en desktop) está el selector "Jugando como" y el "Estado (debug)". "Ahora" está fijo: miércoles 2026-11-25 10:00.

## Recorrido para probar

1. Como Martina Ibarra, tab **Buscar** (wizard): Paso 1 elegí Palermo, CABA; Paso 2 un día; Paso 3 una franja (Mañana/Tarde/Noche/Cualquier hora) y duración, y **Ver horarios libres**. Las pastillas de arriba vuelven a cada paso.
2. Paso 4: tocá un Horario libre: se abre la hoja con Club, Cancha, fecha, inicio–fin y duración.
3. **Reservar** (probá también tocar un Horario ocupado desde otra cuenta para ver los errores en rojo).
4. En "Reserva confirmada": **Abrir Partida** (o **Listo**, y abrirla después desde **Mis reservas**).
5. Cambiá a Joaquín Sosa o Lucía Ferreyra en el selector (se queda en la tab actual). En **Partidas** buscá la Partida de Martina y tocá **Unirme**. Probá **Salir**, y mirá que el creador solo ve "Sos el creador".
6. Volvé a Martina: en **Mis reservas** aparece "Partida 2/4" y **Cancelar Reserva** (con confirmación) borra la Partida.
7. Extra: en Palermo ya hay Partidas sembradas (3/4 hoy 19:00 en Soho, 2/4, 1/4 de Joaquín; la 4/4 no se lista). Tab **Clubes** muestra `ver_club` por día; Soho cierra los domingos.

## Líneas de TS

- `src/store.ts`: 149 (datos semilla + un stub por Procedimiento)
- `src/main.ts`: 167 (pantallas, wizard de Buscar, hoja de reserva, chrome, acciones)
- Total: 316. Más `styles/app.css` (73).

## Cómo se mapeó `hora` en `buscar_horarios`

El paso 3 ofrece franjas (Cualquier hora, Mañana 08–12, Tarde 12–18, Noche 18–24). **No se usa `hora`**: se llama a `buscar_horarios` sin `hora` y el front filtra los inicios devueltos por franja. Motivo: `hora` (±1 h) no expresa un rango; conviene un parámetro de franja (o `hora_desde`/`hora_hasta`) en el back.

## Iteración 2 (feedback del usuario)

"La página de Buscar no me gusta. Hacelo más paso a paso. Hacelo responsive."
- Buscar pasó de un formulario largo a un wizard de 4 pasos (Dónde / Día / Hora + duración / Horarios libres), con pastillas-resumen tocables, "‹ Atrás" y "Paso N de 4". El estado vive en `ui.w` y sobrevive al cambio de tab o de cuenta.
- Acciones nuevas: `w-loc`, `w-dia`, `w-hora`, `w-ver`, `w-paso`, `w-atras` (valor en `data-v`); el contenedor lleva `data-paso`. Tras reservar + "Listo" se queda en el paso 4 refrescado.
- Se quitó el marco de celular: mobile (< 768 px) a pantalla completa con tabs abajo y hoja desde abajo; desktop (>= 768 px) con barra superior "Pádel", contenido de 720 px máx. y hoja como modal centrado.
- El selector "Jugando como" es una píldora fija; el debug solo se ve en desktop.

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
