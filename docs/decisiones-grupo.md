# Decisiones pendientes para el grupo

Del [Mapa: plataforma de pádel](https://github.com/fdllrs/taller_db/issues/2). Cada pregunta trae una recomendación, y contestar "sí" la acepta. Las respuestas van como comentario en el ticket de cada sección.

## Entidades y claves del SSOT de pádel ([ticket](https://github.com/fdllrs/taller_db/issues/10))

**1. Clave de Club.** ¿Cada Club se identifica con un código corto que pone el Administrador al crearlo (por ejemplo `palermo`) y que no cambia nunca? El nombre del Club se guarda aparte y se puede editar.

- `[localidad, nombre]` no sirve como clave, porque el nombre puede cambiar y la clave primaria tiene que ser inmutable.
- Un `id` sintético sería una segunda excepción a la regla de claves naturales. Hoy la única es `usuarios`.

➡️ **Sí**, código asignado por el Administrador.

**2. Partida como tabla propia.** ¿`partidas` es una tabla aparte, con la misma clave que su Reserva (una Partida por Reserva), y sus Jugadores van en `partida_jugadores`?

- La base no puede limitar la cantidad de filas, así que el cupo de 4 lo controla el Procedimiento de unirse. El Procedimiento bloquea la Partida, cuenta los Jugadores y recién después agrega uno.

➡️ **Sí**.

**3. Cancelar borra.** ¿Cancelar una Reserva borra sus filas, es decir los Bloques, la Partida y sus Jugadores?

- No queda historial, y el horario vuelve a estar libre en el momento.
- Si se guardaran las Reservas canceladas, su clave impediría volver a reservar ese horario.

➡️ **Sí**.

**4. Lista de entidades.** ¿Aprobamos esta propuesta?

| Entidad | Clave primaria |
|---|---|
| `provincias` | `provincia` |
| `localidades` | `provincia, localidad` |
| `clubes` | `club` (el código de la pregunta 1) |
| `canchas` | `club, cancha` (número de Cancha dentro del Club) |
| `horarios` | `club, dia_semana` |
| `usuarios` | `id` (excepción ya aceptada, ADR 0003) |
| `administradores` | `usuario` |
| `encargados_club` | `club, usuario` |
| `reservas` | `club, cancha, fecha, hora_inicio` (con su titular) |
| `bloques_reservados` | `club, cancha, fecha, hora` |
| `partidas` | la misma clave que `reservas` |
| `partida_jugadores` | la clave de `partidas` + `usuario` |

➡️ **Sí**.

## Permisos por rol y por fila en SSOT ([ticket](https://github.com/fdllrs/taller_db/issues/12))

**5. ¿Quién usa el CRUD genérico?** Hoy cualquier Usuario con sesión iniciada puede ver y modificar todo, porque no hay roles. Al armar el mapa decidimos que el Front de Clubes iba a usar el CRUD genérico filtrado por su Club.

| | A: CRUD filtrado por Club (decisión actual del mapa) | B: CRUD solo para Administradores |
|---|---|---|
| Qué se hace | Agregar el filtro en las 7 rutas del CRUD, más datos en el SSOT que digan qué tabla lleva a qué Club | Responder 403 a quien no esté en `administradores`. Clubes y Jugadores usan solo Procedimientos que verifican el rol y el Club |
| Tamaño | 200 a 400 líneas | Unas 30 líneas |
| Riesgo | Alto: alcanza con una ruta sin filtro para que se vean datos de otro Club | Bajo |
| Costo extra | Ninguno | El Front de Clubes necesita Procedimientos para administrar Canchas y Horarios |

➡️ **Sí a la B**, aunque cambia lo que se decidió al armar el mapa.

## Cómo recibe SSOT las entidades por parámetro ([ticket](https://github.com/fdllrs/taller_db/issues/11))

**6. Tipos de `api-contract.ts`.** Para que `ssot2026` no tenga nada de pádel adentro, va a recibir las entidades por parámetro. Casi todo ese cambio es mecánico. La excepción es `api-contract.ts`, que hoy saca todos sus tipos de las entidades fijas.

- **(a) Genéricos estrictos:** cumple el principio de cero `any`, pero lleva más trabajo.
- **(b) Tipos amplios:** es más simple, pero rompe ese principio y habría que aprobar una excepción.

➡️ **(a)**: la regla de simplicidad no pasa por encima de los principios.

## Agenda visual del Front de Clubes ([ticket](https://github.com/fdllrs/taller_db/issues/15))

Estas dos preguntas no se contestan con sí o no. Primero se arma un prototipo rápido de la agenda de un día, con una columna por Cancha, y con eso se decide:

**7. Dirección visual:** colores, tipografía y densidad. El Front de Jugadores usa la misma.

**8. Framework:** ¿alcanza con TypeScript sin framework, o conviene usar uno liviano?

---

Con las preguntas 1 a 6 contestadas se cierran tres tickets: Entidades, Permisos y SSOT por parámetro. Después de eso, *Procedimientos de Jugadores y de Clubes* se resuelve sin pasar por el grupo. Las preguntas 7 y 8 se contestan cuando esté el prototipo.
