# Spec: plataforma de pádel

Esta spec reúne lo que se decidió en el [Mapa: plataforma de pádel](https://github.com/fdllrs/taller_db/issues/2). Es la versión final y se puede leer sin abrir los tickets. Si algo de un ticket no coincide con lo que dice esta spec, vale la spec.

- **Vocabulario:** [`GLOSSARY.md`](../GLOSSARY.md). Las palabras con mayúscula (Reserva, Bloque, Partida…) tienen el sentido que les da el glosario.
- **Decisiones de fondo:** [`docs/adr/`](adr/).
- **Reglas de código:** [`DEVELOPMENT-PRINCIPLES.md`](../DEVELOPMENT-PRINCIPLES.md). Mandan sobre esta spec ([ADR 0002](adr/0002-principios-como-unica-regla.md)).

Es un prototipo para una materia, con datos de prueba y sin operación real. Siempre se elige la opción más simple y los casos borde no se modelan, salvo que los principios pidan otra cosa.

## Alcance

**Entra:**

- Un solo SSOT, una sola base PostgreSQL y un solo backend, con tres frontends web responsive:
  - **Front de Jugadores:** registrarse, ver Clubes, buscar horarios libres, reservar, abrir Partidas, unirse y salir.
  - **Front de Clubes:** la agenda del día, reservar, cancelar y cambiar el horario de Reservas, y cargar Canchas y Horario.
  - **Front de Administración:** el CRUD genérico de `ssot2026`, solo para Administradores.
- `ssot2026/` es nuestra copia del framework. Recibe las entidades por parámetro y no lleva nada de pádel ([ADR 0001](adr/0001-ssot2026-como-copia-propia.md)). La app vive en `padel/` y depende de `file:../ssot2026`.
- Un único registro de Usuarios y un único login. Todo Usuario puede ser Jugador. Los roles de Encargado de Club y de Administrador salen de las tablas `encargados_club` y `administradores`.
- Un Administrador crea cada Club y le asigna sus Encargados desde el Front de Administración.

**No entra:**

- **Plataforma:** pagos online (se paga en el Club), niveles y ranking, chat, torneos, clases, notificaciones, app nativa, registro público de Clubes, mapa y GPS, y tiempo real (todo se actualiza al recargar).
- **Reservas y Horario:** feriados, horario partido, horario por Cancha, Reservas después de medianoche, límites por Jugador, historial de cancelaciones, plazos de cancelación y No-Show.
- **Partidas:** Partidas privadas, aprobación para unirse y cancelación automática.
- **Cuentas:** recuperación por email, sesión persistente, protección del alta y datos de perfil.
- **Repo original:** PRs al repo original de `ssot2026`.

## Entidades y claves

Son 12 entidades, todas con clave natural salvo `usuarios` ([ADR 0003](adr/0003-usuarios-conserva-id-sintetico.md)). Se declaran en `padel/src/system.ts` con `defineEntity`.

| Entidad | Clave primaria | Otros campos | Referencias | `isName` |
| --- | --- | --- | --- | --- |
| `provincias` | `provincia` | `nombre` | | `nombre` |
| `localidades` | `provincia, localidad` | `nombre` | `provincias` | `nombre` |
| `clubes` | `club` | `nombre`, `provincia`, `localidad` | `localidades` | `nombre` |
| `canchas` | `club, cancha` | `nombre` | `clubes` | `nombre` |
| `horarios` | `club, dia_semana` | `apertura`, `cierre` | `clubes` | |
| `usuarios` | `id` | `usuario`, `version_sesion` y los campos de login de `ssot2026` | | `usuario` |
| `administradores` | `usuario` | | `usuarios` | |
| `encargados_club` | `club, usuario` | | `clubes`, `usuarios` | |
| `reservas` | `club, cancha, fecha, hora_inicio` | `titular`, `a_nombre_de` (opcional) | `canchas`, `titular` → `usuarios` | |
| `bloques_reservados` | `club, cancha, fecha, hora` | `hora_inicio` | `reservas` (por `club, cancha, fecha, hora_inicio`) | |
| `partidas` | `club, cancha, fecha, hora_inicio` | | `reservas` | |
| `partida_jugadores` | `club, cancha, fecha, hora_inicio, usuario` | `orden` | `partidas`, `usuarios` | |

**Campos:**

- **`club`:** un código corto que asigna el Administrador (por ejemplo `palermo`) y que no cambia nunca. `nombre` sí se puede editar.
- **`cancha`:** el número de la Cancha dentro del Club.
- **`dia_semana`:** de 1 (lunes) a 7 (domingo), como `isodow` de PostgreSQL.
- **`apertura`, `cierre`, `hora_inicio`, `hora`:** horas alineadas a Bloque (ver *Tipos*). `cierre` puede ser 24:00.
- **`titular`:** el Usuario que hizo la Reserva. Si reserva un Encargado, el titular es el Encargado.
- **`a_nombre_de`:** texto libre opcional, por ejemplo para quien reserva por teléfono en el Club.
- **`orden`:** posición de llegada del Jugador en la Partida. El creador tiene 1 y cada nuevo Jugador recibe el máximo + 1. Si alguien sale, queda un hueco, y no se renumera.
- **Duración:** no se guarda. Es la cantidad de filas de la Reserva en `bloques_reservados`, y el fin es `hora_inicio` + 30 min × esa cantidad.

**Ocupación por Bloque:** cada Bloque ocupado es una fila de `bloques_reservados`. Su clave primaria impide que dos Reservas se solapen, aunque dos personas reserven a la vez ([ADR 0005](adr/0005-ocupacion-por-bloque.md)). Que los Bloques de una Reserva sean dos o más y consecutivos lo controla el Procedimiento que la crea.

**Partida:** su clave es la misma que la de su Reserva, porque cada Reserva tiene como mucho una Partida. El cupo de 4 no lo impone la base: lo controla `unirse` (ver *Procedimientos*).

### Tipos

Se declaran en `padel/` y llegan a `ssot2026` por `AppSystem`, junto con su mapeo a SQL (`sqlMapping`). Si `ssot2026` necesita algo para manejarlos en el Front de Administración, se agrega como capacidad genérica.

| Tipo | En JSON | En SQL | Regla |
| --- | --- | --- | --- |
| `fecha` | `"2026-11-25"` | `date` | Fecha válida |
| `hora_bloque` | `"19:30"` | `time` | Minutos en `00` o `30`, de `00:00` a `24:00` |

Los demás campos usan los tipos que ya existen (`text`, `integer`, `posInteger`).

## Reglas de dominio

### Reloj

- **"Ahora"** lo da PostgreSQL (`localtimestamp`), con las sesiones en la zona `America/Argentina/Buenos_Aires`. Un test verifica la zona de la sesión. El front nunca calcula "ahora" ni "hoy".
- **"Ya empezó":** una Reserva ya empezó cuando su `fecha` + `hora_inicio` es anterior o igual a "ahora". Lo mismo vale para un Bloque.

### Horario del Club

- **Forma:** una apertura y un cierre por día de la semana, dentro del mismo día calendario y hasta las 24:00. Si un día no tiene fila en `horarios`, el Club está cerrado ese día.
- **Cambios:** cambiar el Horario no revisa las Reservas que ya existen. Si alguna queda afuera, el Encargado la cancela a mano.

### Reserva

- **Inicio:** solo en :00 o :30, con la misma grilla en todas las Canchas.
- **Duración:** como mínimo 2 Bloques (1 hora), sin máximo.
- **Horario:** todos sus Bloques caen dentro del Horario del Club para ese día de la semana.
- **Ventana:** se reserva desde hoy hasta hoy + 14 días, y nunca un Bloque que ya empezó.
- **Titular:** siempre un Usuario, quien llama al Procedimiento. No hay límites por Jugador.
- **Cancelar:**
  - pueden cancelar el titular o un Encargado del Club, hasta que la Reserva empieza;
  - cancelar borra la Reserva, sus Bloques, su Partida y los Jugadores de la Partida, sin dejar historial;
  - nadie recibe aviso: la Reserva deja de aparecer.
- **Cambiar el horario:**
  - solo lo hace un Encargado del Club, en la misma Cancha y con las mismas reglas que al reservar;
  - el solape con la propia Reserva no cuenta;
  - en una sola transacción, la Reserva se **reemplaza** por otra con el nuevo inicio, el mismo titular y el mismo `a_nombre_de`;
  - si tenía Partida, la Partida y sus Jugadores (con su `orden`) pasan a la Reserva nueva;
  - así ninguna clave cambia: la Reserva vieja deja de existir.

### Partida

- **Abrir:** solo el titular de la Reserva puede abrirla, antes de que empiece. El creador ocupa el primer lugar.
- **Cupo:** siempre 4 lugares.
- **Unirse:** es inmediato, sin aprobación, mientras quede lugar y la Partida no haya empezado.
- **Salir:** quien se unió puede salir hasta el inicio. El creador no sale: si no va a jugar, cancela la Reserva.
- **Partida incompleta:** no se cancela sola. Una Reserva sin Partida es, en la práctica, una Partida privada.

### Permisos

([ADR 0006](adr/0006-crud-generico-solo-administradores.md))

- **CRUD genérico** de `ssot2026` (incluidos delete-check y `/api/events`): responde 403 a todo Usuario que no esté en `administradores`.
- **Fronts de Jugadores y de Clubes:** usan solo Procedimientos. Cada Procedimiento exige sesión y verifica el rol y el Club en su propio SQL.
- **Cuentas:**
  - el alta de Usuarios es pública (usuario y contraseña) y es una capacidad genérica de `ssot2026` que se activa por configuración;
  - la sesión es la de `ssot2026`, con el token en memoria: al recargar hay que volver a entrar;
  - la recuperación usa los códigos de recuperación de `ssot2026`.
- **Lo que hace el Administrador desde el CRUD genérico:** provincias, localidades, Clubes, Encargados, y borrar Canchas.

## Convenciones de la API

Todas extienden lo que `ssot2026` ya hace (`api-errors.ts`, `readObject`, `instanceProblems`).

- **Ruta:** `POST /api/procedimientos/<nombre>`, con los parámetros como cuerpo JSON (`{}` si no tiene). La respuesta es un JSON con la forma que indica cada Procedimiento.
- **Registro:** los Procedimientos viven en `padel/` y se registran con `extraRoutes(app, pool, auth)`. Usan `requireUser` y `ApiFailure`, que exporta `ssot2026`.
- **Parámetros:** cada Procedimiento declara sus parámetros como un registro con `defineRecord` en `padel/`. Se validan con `readObject` (claves exactas) y con `instanceProblems` (tipos). Si no pasan, la respuesta es 400 con `problems`.
- **Transacciones:** cada Procedimiento que escribe corre en una sola transacción. Si falla, no deja nada escrito a medias.
- **Errores:** el formato es el que ya usa `ssot2026`, más un `codigo` estable:

  ```json
  { "error": "Ese horario ya está ocupado.", "codigo": "horario_ocupado" }
  ```

  El back arma `error` en castellano y el front lo muestra tal cual. El front y los tests deciden por `codigo`.

| Estado | `codigo` | Cuándo |
| --- | --- | --- |
| 400 | `parametros_invalidos` | Faltan o sobran claves, o un valor no cumple su tipo (por ejemplo, una hora en :15). Lleva `problems` |
| 401 | `sin_sesion` | No hay sesión iniciada |
| 403 | `no_autorizado` | El rol o el Club no corresponden |
| 403 | `no_es_titular` | `abrir_partida` lo pide alguien que no es el titular |
| 404 | `club_inexistente`, `cancha_inexistente`, `reserva_inexistente`, `partida_inexistente` | La clave no existe, por ejemplo porque se canceló la Reserva mientras tanto |
| 409 | `duracion_minima` | Menos de 2 Bloques |
| 409 | `fuera_de_horario` | Algún Bloque cae fuera del Horario del Club, o el Club está cerrado ese día |
| 409 | `fuera_de_ventana` | La fecha es anterior a hoy o posterior a hoy + 14 días |
| 409 | `ya_empezo` | La Reserva, la Partida o el Bloque ya empezó |
| 409 | `horario_ocupado` | Algún Bloque ya está reservado (la violación de la PK de `bloques_reservados` se traduce a este código) |
| 409 | `ya_tiene_partida` | La Reserva ya tiene Partida |
| 409 | `partida_llena` | La Partida ya tiene 4 Jugadores |
| 409 | `ya_anotado` | Quien llama ya está en la Partida |
| 409 | `no_anotado` | Quien llama no está en la Partida |
| 409 | `es_el_creador` | El creador intenta salir de su Partida |
| 409 | `cierre_antes_de_apertura` | En `guardar_horario`, el cierre no es posterior a la apertura |
| 409 | `horario_incompleto` | En `guardar_horario`, llega solo uno de los dos: la apertura o el cierre |

**Otras reglas:**

- **Ventana de reserva:** el front la pide a `ventana_de_reserva` y no recalcula la regla de 14 días.
- **Texto del Horario:** el back devuelve filas (`dia_semana`, `apertura`, `cierre`). Cada front arma el texto ("Lun a Vie 8 a 23") con una sola función propia.
- **Fechas en pantalla:** siempre como fecha, con hojita MIÉ / 25 / NOV o escrita ("Miércoles 25 de noviembre"), nunca solo "Hoy".

## Procedimientos

Son 17: 12 los usa el Front de Jugadores y 5 son solo del Front de Clubes. `reservar` y `cancelar_reserva` sirven para los dos. Todos exigen sesión (401 `sin_sesion`).

La **clave de una Reserva** o de una Partida es siempre `{club, cancha, fecha, hora_inicio}`, y aparece abajo como *clave*. Los parámetros con `?` son opcionales.

### Front de Jugadores

| Procedimiento | Parámetros | Devuelve | Regla | Errores |
| --- | --- | --- | --- | --- |
| `listar_localidades` | ninguno | `[{provincia, nombre_provincia, localidad, nombre}]` | Solo las localidades con al menos un Club. Solo lectura | |
| `ventana_de_reserva` | ninguno | `{desde, hasta}` (fechas) | `desde` = hoy, `hasta` = hoy + 14 días. Solo lectura | |
| `buscar_horarios` | `provincia, localidad, fecha, hora_desde?, hora_hasta?, bloques?` (2 por defecto) | `[{hora, opciones: [{club, nombre_club, cancha, nombre_cancha}]}]`, ordenado por hora | Inicios libres en todos los Clubes de la localidad, con `hora_desde` ≤ inicio < `hora_hasta`. La Reserva tiene que caber entera dentro del Horario, sin Bloques ocupados y sin haber empezado. Solo lectura | 409 `fuera_de_ventana`, `duracion_minima` |
| `listar_clubes` | `provincia, localidad` | `[{club, nombre, canchas: [{cancha, nombre}], horario: [{dia_semana, apertura, cierre}]}]` | Solo lectura | |
| `ver_club` | `club, fecha` | `{club, nombre, horario: {apertura, cierre} \| null, canchas: [{cancha, nombre, bloques: [{hora, libre}]}]}` | Los Bloques del Horario de ese día. Los que ya empezaron vuelven como ocupados (`libre: false`). Solo lectura | 404 `club_inexistente`; 409 `fuera_de_ventana` |
| `reservar` | `club, cancha, fecha, hora_inicio, bloques, a_nombre_de?` | la *clave* | El titular es quien llama. Inserta la Reserva y sus Bloques | 404 `cancha_inexistente`; 409 `duracion_minima`, `fuera_de_horario`, `fuera_de_ventana`, `ya_empezo`, `horario_ocupado` |
| `cancelar_reserva` | *clave* | `{}` | La cancela el titular o un Encargado del Club. Borra la Reserva, sus Bloques, su Partida y sus Jugadores | 404 `reserva_inexistente`; 403 `no_autorizado`; 409 `ya_empezo` |
| `mis_reservas` | ninguno | `{propias: [{…clave, bloques, nombre_club, nombre_cancha, partida: {jugadores} \| null}], unidas: [{…clave, bloques, nombre_club, nombre_cancha, creador, jugadores}]}` | `propias`: las Reservas cuyo titular es quien llama. `unidas`: las Partidas donde quien llama está anotado sin ser el titular. En los dos casos, desde hoy en adelante. Los `jugadores` son los nombres de usuario en `orden`. Solo lectura | |
| `abrir_partida` | *clave* | `{}` | Inserta la Partida y al creador con `orden` 1 | 404 `reserva_inexistente`; 403 `no_es_titular`; 409 `ya_empezo`, `ya_tiene_partida` |
| `listar_partidas_abiertas` | `provincia, localidad, fecha?` | `[{…clave, bloques, nombre_club, nombre_cancha, jugadores}]` | Las Partidas que no empezaron y tienen menos de 4 Jugadores. `jugadores` va en `orden`, así que el primero es el creador. Solo lectura | |
| `unirse` | *clave* | `{}` | Bloquea la Partida con `FOR UPDATE`, cuenta los Jugadores y recién después inserta, con `orden` = máximo + 1. Así dos Jugadores no pueden ocupar el mismo último lugar | 404 `partida_inexistente`; 409 `partida_llena`, `ya_anotado`, `ya_empezo` |
| `salir` | *clave* | `{}` | Saca a quien llama | 404 `partida_inexistente`; 409 `es_el_creador`, `no_anotado`, `ya_empezo` |

### Front de Clubes

Todos verifican que quien llama esté en `encargados_club` para ese Club. Si no está, responden 403 `no_autorizado`. `mis_clubes` no lleva Club.

| Procedimiento | Parámetros | Devuelve | Regla | Errores |
| --- | --- | --- | --- | --- |
| `mis_clubes` | ninguno | `[{club, nombre}]` | Los Clubes de los que quien llama es Encargado. Solo lectura | |
| `agenda` | `club, fecha` | `{horario: {apertura, cierre} \| null, canchas: [{cancha, nombre}], reservas: [{…clave, hora_fin, titular, a_nombre_de, partida: {anotados} \| null}]}` | El día completo de todas las Canchas. La pantalla muestra `a_nombre_de` y, si está vacío, el `usuario` del titular. Solo lectura | 403 `no_autorizado` |
| `reservar` y `cancelar_reserva` | los mismos de arriba | | El Encargado reserva a su nombre (con `a_nombre_de` si quiere) y cancela cualquier Reserva de su Club | los mismos de arriba |
| `cambiar_horario_reserva` | *clave*, `nuevo_inicio, nuevo_fin` | la *clave* nueva | Reemplaza la Reserva como dice *Reglas de dominio* | 404 `reserva_inexistente`; 403 `no_autorizado`; 409 `duracion_minima`, `fuera_de_horario`, `fuera_de_ventana`, `ya_empezo`, `horario_ocupado` |
| `guardar_cancha` | `club, cancha, nombre` | `{}` | Da de alta una Cancha o le cambia el nombre. Para borrarla hay que pedírselo a un Administrador | 403 `no_autorizado` |
| `guardar_horario` | `club, dia_semana, apertura?, cierre?` | `{}` | Crea o reemplaza el Horario de ese día. Si no llegan ni apertura ni cierre, borra la fila y el día queda cerrado. No revisa las Reservas que ya existen | 403 `no_autorizado`; 409 `cierre_antes_de_apertura`, `horario_incompleto` |

## Fronts

Los tres son TypeScript sin framework: el estado de la pantalla vive en memoria y se vuelve a dibujar desde ahí. El backend los sirve como archivos estáticos.

- **Ubicación:** `padel/front-jugadores/` y `padel/front-clubes/`. El Front de Administración es el que ya trae `ssot2026`.
- **En todos los frontends:** URL con estado y widget único de navegación ([ADR 0004](adr/0004-agenda-visual-en-front-de-clubes.md)).

**Dirección visual común (neón):**

- **Colores:** verde `#39ff14` sobre negro `#0b0c0b`, paneles `#151816` y líneas `#222722`. El rojo `#ff3b5c` es solo para cancelar.
- **Tipografía:** Bricolage Grotesque.
- **Referencia:** `src/variantE.ts` y `styles/e.css` de la rama de prototipo [`prototype/agenda-clubes`](https://github.com/fdllrs/taller_db/tree/prototype/agenda-clubes/padel/prototype-agenda-clubes).

### Front de Jugadores

Referencia: `src/main.ts` y `styles/app.css` de la rama de prototipo [`prototype/recorrido-jugadores`](https://github.com/fdllrs/taller_db/tree/prototype/recorrido-jugadores/padel/prototype-recorrido-jugadores). Las ramas de prototipo no se mergean.

- **Pestañas:** Partidas (inicio), Clubes y Mis reservas. En celular van abajo; desde 768 px pasan a una barra arriba.
- **Partidas:**
  - Arriba, el botón **Reservar una Cancha**, con el resumen de la última búsqueda.
  - Debajo, las Partidas abiertas de la localidad, con un filtro por día.
  - Cada tarjeta lleva la hojita de fecha, el Club, la Cancha, el horario, los 4 lugares con iniciales y el creador.
  - El botón cambia según el caso: Unirme, Estás anotado + Salir, o Sos el creador.
- **Búsqueda en 3 pasos** (a pantalla completa en celular, como modal en desktop). Cambiar un paso anterior borra la hora elegida.
  1. **¿Qué día?** Un calendario mensual con los días de `ventana_de_reserva`. La localidad va arriba, en un selector que llena `listar_localidades`.
  2. **¿A qué hora?**
     - Franja: Cualquier hora, Mañana 8–12, Tarde 12–18 o Noche 18–24. Se pasa como `hora_desde` / `hora_hasta`.
     - Duración: 1 h, 1 h 30 o 2 h.
     - Debajo, en vivo, los inicios libres de `buscar_horarios` en todos los Clubes, con cuántas Canchas hay libres en cada uno.
  3. **¿Dónde?** "Me da igual" reserva la primera opción libre. Debajo, las Canchas libres agrupadas por Club. Si hay una sola opción, este paso se saltea.
- **Confirmación:**
  - Es una hoja con el Club, la Cancha (se puede cambiar entre las libres), la fecha escrita, el horario y la duración.
  - Al reservar aparece "Reserva confirmada", con **Abrir Partida** o **Listo**. Las dos vuelven a Partidas.
- **Clubes:** la lista de Clubes de la localidad con su Horario. Cada Club se ve por día y por Cancha (`ver_club`), y desde ahí se reserva con la misma hoja.
- **Mis reservas:**
  - Primero, las Reservas propias, con Abrir Partida o el estado de la Partida, y Cancelar Reserva (pide confirmación).
  - Después, las Partidas a las que se sumó, con Salir.
- **Cuenta:** registro y login con usuario y contraseña.

### Front de Clubes

- **Agenda:** muestra un día por vista y una columna por Cancha, en Bloques de 40 px, con el Club y la fecha en una línea de encabezado. Si el Encargado tiene más de un Club, lo elige con `mis_clubes`.
- **Clic en un Bloque libre:** abre el formulario completo, precargado con ese Bloque. El formulario tiene la Cancha, la duración, la hora de inicio (con lo libre en verde) y el campo "a nombre de".
- **Arrastrar sobre Bloques libres:** abre un menú simple con Inicio y Fin, que se editan con − / +, y el campo "a nombre de".
- **Clic en una Reserva:** abre el mismo menú, para cambiar el horario (Guardar → `cambiar_horario_reserva`) o cancelarla (Cancelar reserva → `cancelar_reserva`).
- **Canchas y Horario:** un formulario para dar de alta o renombrar Canchas (`guardar_cancha`) y otro para el Horario de cada día (`guardar_horario`).

### Front de Administración

Es el CRUD genérico de `ssot2026`, con grillas tipo planilla. Cumple la Parte II §5:

- URL con todo el estado;
- navegación por teclado;
- widget único de navegación;
- combos con `isName` e `inComboBox` en los campos que son FK.

## Tests, despliegue y datos

- **Tests:**
  - Con `node:test` y cobertura con `c8`: 100% en los Procedimientos y sin objetivo para el resto.
  - Los Procedimientos se prueban contra PostgreSQL real, en la imagen de Node 24.21. No hay tests de navegador.
  - Las fechas de los tests se arman relativas a "ahora".
- **Despliegue:** se levanta todo con un solo `docker compose up`.
  - El backend sirve los tres frontends.
  - Los secretos tienen valores por defecto en `compose.yaml`.
  - El bind mount de `migrations/` lleva `:z`.
- **Datos de prueba:**
  - Se cargan con `loadTabData` desde archivos `.tab` (`tab-plus`).
  - Incluyen al menos dos localidades, tres Clubes con Horario (uno cerrado los domingos), un Administrador, un Encargado por Club, varios Jugadores, y Reservas y Partidas en distintos estados de cupo.

## Plan de cortes

Cada corte es un issue con la etiqueta `ready-for-agent` y entra en una sesión de agente. Termina con algo que se ve andando y con sus tests en verde. Los bloqueos se cargan como dependencias nativas de GitHub.

Para cortar los issues hay que esperar a que se mergee la PR de documentación. Cada issue usa esta plantilla:

```markdown
## Qué entrega
<el comportamiento que se ve andando al terminar>

## Secciones de la spec
<enlaces a las secciones de docs/spec.md que implementa>

## Criterios de aceptación
<tests que tienen que pasar; 100% de cobertura en los Procedimientos que toca>

## Bloqueado por
<los cortes de los que depende>
```

### Carril principal

**1. SSOT por parámetro** (`ssot2026`). *Bloqueado por:* nada.

- `ssot2026` recibe un objeto `AppSystem` con `context`, `entities`, `entityLabels`, `authenticationEntity` y `sqlMapping`.
- Fábricas: `startServer(system, opts)`, `loadTabData(system, …)` e `initializeUsers(system, …)`.
- `server.ts`, `create-admin.ts` y `load-examples.ts` pasan a ser funciones exportadas y dejan de ejecutarse al importarse.
- `startServer` acepta `extraRoutes(app, pool, auth)`, y se exportan `requireUser` y `ApiFailure`.
- `api-contract.ts` pasa a ser genérico sobre el sistema recibido, sin `any`.
- La entidad de autenticación tiene que tener `id`, `usuario` y `version_sesion`.
- Las entidades de ejemplo quedan como sistema de prueba.
- *Aceptación:*
  - los tests de `ssot2026` siguen pasando con el sistema de ejemplo;
  - se arreglan los 2 tests de `test/assessment.test.mjs` (`materias.cod_dep`);
  - un test registra una ruta con `extraRoutes`.

**2. Permisos, cuentas y zona horaria** (`ssot2026`). *Bloqueado por:* 1.

- Un `router.use` responde 403 a quien no está en la tabla de Administradores. Cubre el CRUD, delete-check y `/api/events`, y la tabla se configura en `AppSystem`.
- El alta pública de Usuarios, que se activa por configuración.
- El campo `codigo` en los errores (`ApiFailure` lo acepta y `apiErrorHandler` lo devuelve).
- La zona horaria de la base se configura y las sesiones la respetan.
- *Aceptación:* hay tests de:
  - 403 para quien no es Administrador y 200 para quien sí;
  - un alta pública;
  - un error con `codigo`;
  - que una sesión tiene la zona configurada.

**3. Tracer de pádel.** *Bloqueado por:* 2.

- `padel/` levanta con `docker compose up`.
- Tiene su `system.ts` con las **12 entidades** y los tipos `fecha` y `hora_bloque`, más sus scripts de migración y sus datos de prueba.
- Un Administrador entra al Front de Administración y carga un Club con sus Canchas, su Horario y su Encargado.
- Crear el esquema completo acá evita que un corte posterior espere tablas: los siguientes solo agregan Procedimientos y pantallas.
- *Aceptación:* hay tests de:
  - la migración desde cero;
  - la carga de datos de prueba;
  - los tipos (deserialize y mapeo a SQL);
  - que las sesiones corren en hora argentina.

**4. Ver Clubes** (Front de Jugadores). *Bloqueado por:* 3.

- Registro y login, las pestañas y el estilo neón.
- `listar_localidades`, `listar_clubes` y `ver_club`.
- Es el primer corte con Procedimientos, así que fija la convención: ruta, `defineRecord`, `readObject` + `instanceProblems` y `codigo`.
- *Aceptación:* tests de los tres Procedimientos, incluido que un Bloque que ya empezó vuelve como ocupado.

**5. Reservar y cancelar** (Front de Jugadores). *Bloqueado por:* 4.

- `reservar`, `mis_reservas` y `cancelar_reserva`.
- La hoja de confirmación desde Clubes y la pestaña Mis reservas.
- `mis_reservas` y `cancelar_reserva` ya manejan Partidas, porque las tablas existen desde el corte 3. Los tests las siembran por SQL.
- *Aceptación:*
  - un test por error de la tabla;
  - dos `reservar` concurrentes sobre el mismo Bloque, de los que solo uno gana;
  - cancelar borra Bloques, Partida y Jugadores.

**6. Búsqueda en 3 pasos** (Front de Jugadores). *Bloqueado por:* 5.

- `ventana_de_reserva` y `buscar_horarios`.
- El botón **Reservar una Cancha** con sus 3 pasos, que termina en la hoja del corte 5.
- *Aceptación:* tests de la franja, de la duración, de que la Reserva quede dentro del Horario y de `fuera_de_ventana`.

**7. Partidas** (Front de Jugadores). *Bloqueado por:* 5.

- `abrir_partida`, `listar_partidas_abiertas`, `unirse` y `salir`.
- La pestaña Partidas, con sus tarjetas, y Abrir Partida en la confirmación y en Mis reservas.
- *Aceptación:*
  - un test por error de la tabla;
  - dos `unirse` concurrentes por el último lugar, de los que solo uno gana;
  - el `orden` de llegada.

**8. Agenda del Front de Clubes.** *Bloqueado por:* 5.

- El Front de Clubes: login, `mis_clubes` y `agenda`.
- Reservar y cancelar como Encargado, con `a_nombre_de`.
- `cambiar_horario_reserva`.
- *Aceptación:*
  - 403 para quien no es Encargado de ese Club;
  - cambiar el horario de una Reserva con Partida, sembrada por SQL, la lleva entera con su `orden` a la clave nueva;
  - el solape con la propia Reserva no cuenta.

**9. Canchas y Horario** (Front de Clubes). *Bloqueado por:* 8.

- `guardar_cancha` y `guardar_horario`, con sus pantallas.
- *Aceptación:* tests del alta y el renombre de una Cancha, de crear, reemplazar y borrar un Horario, y de cada error.

### Carriles paralelos

No bloquean al carril principal. Son capacidades genéricas de `ssot2026`, y cada corte suma sus tests.

**A. Validador de SQL.** *Bloqueado por:* 1.

- Valida las consultas antes de mandarlas a la base, analizando su AST con `libpg-query`.
- La regla central es que todo JOIN cubra la PK (o un `UNIQUE NOT NULL`) de al menos un lado. Se aceptan las directivas `allow-join-no-pk`, `allow-cross-join` y `new-pk` (Parte II §3).
- Lo usan el CRUD genérico y los Procedimientos de `padel/`.
- La especificación del validador pasa a usar `libpg-query` en lugar de `pgsql-ast-parser`, que rechaza consultas que `ssot2026` ya arma ([investigación](https://github.com/fdllrs/taller_db/blob/research/herramientas-sql-cobertura/docs/research/herramientas-sql-cobertura.md)).
- *Aceptación:* hay tests de:
  - un JOIN por PK que pasa;
  - un JOIN que no cubre la PK y falla;
  - una directiva que lo habilita;
  - las consultas actuales del CRUD, que pasan.

**B. Verificación de migraciones.** *Bloqueado por:* 3.

- Genera la base en la versión N (un tag de git), aplica las migraciones hasta N+1 y compara el dump contra una base creada desde cero en N+1.
- Usa `pg_dump --restrict-key` y `pg-dump-compare -oti`, como complemento de `migration:apply`.
- Si hay diferencias, la verificación falla (Parte II §2).
- *Aceptación:* hay tests de:
  - una migración correcta, que pasa;
  - una migración que deja una diferencia, que falla.

**C. Front de Administración** (Parte II §5). Son tres cortes independientes entre sí, todos *bloqueados por:* 1.

- **C1.** URL con todo el estado (filtros, orden, foco de fila y de columna) y navegación por teclado (flechas, Tab, Enter).
- **C2.** Widget único de navegación: todo lo que cambia de pantalla se comporta igual y abre en otra pestaña con Ctrl+clic.
- **C3.** `isName` e `inComboBox`: las FK se muestran por su nombre y se editan con un combo tipeable, con filtrado dependiente en claves compuestas.

## Valores por defecto de esta spec

Estos detalles no los decidió ningún ticket. Se eligió la opción más simple y se pueden vetar en la revisión de la PR:

- **`orden`** en `partida_jugadores` para el orden de llegada, y la **duración** de la Reserva que se deriva de sus Bloques, sin columna propia.
- **`dia_semana`** de 1 (lunes) a 7 (domingo).
- **Formato en JSON:** fecha `"AAAA-MM-DD"` y hora `"HH:MM"`, con `"24:00"` como cierre válido.
- **`a_nombre_de`:** cualquiera puede mandarlo a `reservar`, aunque solo lo usa el Front de Clubes.
- **Estados de los errores:**
  - 400 cuando un valor no cumple su tipo, incluida una hora fuera de :00 o :30;
  - 409 para las reglas de dominio;
  - `no_es_titular` es un 403 con código propio.
- **`fuera_de_ventana`** también en `buscar_horarios` y `ver_club`, y `horario_incompleto` en `guardar_horario`.
- **Esquema en el tracer:** las 12 entidades entran en el corte 3.
- **Carril C:** se divide en tres cortes.
- **Ubicación de los fronts:** `padel/front-jugadores/` y `padel/front-clubes/`.

## Reemplaza a

Esta spec deja sin efecto lo siguiente de los tickets anteriores:

- **[Modelo de Reserva](https://github.com/fdllrs/taller_db/issues/7):** "sin campo 'a nombre de'". Ahora `reservas` tiene `a_nombre_de` opcional ([Plan de implementación](https://github.com/fdllrs/taller_db/issues/17)).
- **[Cancelaciones](https://github.com/fdllrs/taller_db/issues/9):** "cambiar o mover no existe". Ahora un Encargado cambia el horario con `cambiar_horario_reserva` ([Agenda visual](https://github.com/fdllrs/taller_db/issues/15)).
- **[Agenda visual](https://github.com/fdllrs/taller_db/issues/15):** la firma `cambiar_horario_reserva(club, reserva, inicio, fin)`. Ahora recibe la *clave* más `nuevo_inicio, nuevo_fin` y reemplaza la Reserva.
- **[Procedimientos de Jugadores y de Clubes](https://github.com/fdllrs/taller_db/issues/14):**
  - Ya no son 14 Procedimientos sino 17: se suman `listar_localidades`, `ventana_de_reserva` y `cambiar_horario_reserva`.
  - `buscar_horarios` recibe `hora_desde` / `hora_hasta` en lugar de `hora`.
