# Qué soporta el vocabulario SQL para impedir Reservas solapadas

Investigación del ticket [#5](https://github.com/fdllrs/taller_db/issues/5), parte del mapa [#2](https://github.com/fdllrs/taller_db/issues/2). Alimenta la decisión de representación de [#7](https://github.com/fdllrs/taller_db/issues/7), que queda en manos del equipo.

**Fuentes y cómo leer las citas**

| Forma de la cita | Dónde está |
| --- | --- |
| `archivo.ts:N` | `consumers/postgres-migrations/src/` de [`ari-dc-uba-ar/system-definition@33524072e3905b45b80891e7c9916656976449c3`](https://github.com/ari-dc-uba-ar/system-definition/tree/33524072e3905b45b80891e7c9916656976449c3/consumers/postgres-migrations/src), punta de `refactor/migrations-full` al 2026-11-04 |
| `sd:ruta:N` | La raíz del mismo commit |
| `ssot2026/...:N` | Este repo, commit `173ad7e87fab0947c637330f25c67e31b8529957` |
| PG18 §... | [Documentación de PostgreSQL 18](https://www.postgresql.org/docs/18/), la versión que exige el consumer (`postgres-support.ts:3`) |

Todo salió de leer código y documentación: no ejecuté el consumer ni probé nada contra una base. Cada sección separa lo **verificado en el código** de lo **inferido**.

## Respuesta corta

| Mecanismo | ¿Desde el SSOT? | ¿Con SQL explícito en una migración? | ¿Qué hace la verificación de drift? | ¿Impide el solapamiento? |
| --- | --- | --- | --- | --- |
| `CHECK` | Sí, con `postgresStorage.checks` | Solo si también está declarado; si no, la migración se revierte | Lo compara: si sobra o falta, bloquea | No: mira una sola fila |
| Índice independiente | Sí, con `postgresStorage.indexes` | Igual que `CHECK` | Lo compara: si sobra o falta, bloquea | No: un índice único compara igualdad |
| `EXCLUDE` | No | **Sí, pasa** | **No lo ve: ni bloquea ni protege** | Sí |
| Tipo de rango en una columna | No: hay 17 tipos escalares | No: la columna extra es drift y revierte | La compara y bloquea | Solo junto con `EXCLUDE` o `WITHOUT OVERLAPS` |
| Rango como expresión dentro de `EXCLUDE` | No | Sí, no agrega columnas | No la ve, igual que al `EXCLUDE` | Sí |
| Trigger | No | **No: revierte al verificar el destino** | **Bloquea siempre** | Sí, pero no se puede usar |
| Función o procedimiento SQL | No | No, en el schema gestionado: revierte | Lo compara y bloquea | No por sí sola |
| Una fila por Bloque | Sí: dos entidades, PK y FK | No hace falta | Compara todo y bloquea | Sí |

**Recomendación (a decidir por el equipo): una fila por Bloque.** Es la única opción en la que la garantía queda dentro del SSOT y bajo la vigilancia del drift. Su costo real es que la base no puede exigir "dos o más Bloques consecutivos". Ver [Trade-offs](#5-trade-offs) y [Recomendación](#6-recomendación).

## 1. Qué se puede expresar desde el SSOT

**Verificado en el código**

- El módulo del SSOT exporta tres cosas: `ssot`, `sqlMapping` y un `postgresStorage` opcional (`ssot.ts:8`). `postgresStorage` no es parte del modelo del núcleo, sino un descriptor del consumer. Aun así, se proyecta al esquema esperado y se guarda en los estados de cada migración (`sql-mapping.ts:5`, `sql-mapping.ts:40`, `migration-store.ts:23-30`).
- Por entidad, el descriptor acepta exactamente `columns`, `primaryKey`, `foreignKeys`, `uniqueKeys`, `checks` e `indexes` (`postgres-storage.ts:160`). Una clave desconocida, como un hipotético `exclusions`, se rechaza (`postgres-storage.ts:46-50`).
- **`CHECK`: sí.** Se declara con `{definition, columns}` (`postgres-storage.ts:14-15`, `postgres-storage.ts:128-140`) y se proyecta como constraint (`pg-schema.ts:436-447`). `constraintSql` exige que el texto empiece con `CHECK (` (`generate-create.ts:118`, `generate-create.ts:136-148`), así que no sirve para colar otra cosa. El test lo confirma rechazando `UNIQUE (slug)` (`sd:consumers/postgres-migrations/test/ssot-check-index-storage-test.ts:85`).
- **`EXCLUDE`: no.** Las variantes de constraint son solo `primaryKey`, `unique`, `foreignKey` y `check` (`pg-schema.ts:58`).
- **Tipos de rango: no.** `sqlTypes` tiene 17 escalares, ninguno de rango (`sd:src/common/sql-types.ts:4-10`), y el mapeo físico rechaza cualquier otro (`sql-mapping.ts:7-18`, `sql-mapping.ts:26`).
- **`WITHOUT OVERLAPS`: no.** Las claves se renderizan solo como lista de columnas (`pg-schema.ts:193-195`, `generate-create.ts:95-98`).
- **Triggers y rutinas: no.** `projectSchema` solo emite tablas, columnas, constraints e índices (`pg-schema.ts:306-458`). `generateCreate` rechaza vistas y rutinas (`generate-create.ts:196-202`).
- **Índices: sí, pero no alcanzan.** `indexSql` acepta `CREATE [UNIQUE] INDEX ... USING ...` (`generate-create.ts:151-174`), incluso GiST. Un índice GiST no impone exclusión por sí solo: para eso hace falta la constraint.

**Inferido**

- `CHECK` no puede impedir el solapamiento: PostgreSQL no admite `CHECK` que consulte datos de otras filas (PG18 §5.5.1). Sí sirve para reglas de una sola fila, como duración mínima o alineación a :00 y :30.

## 2. Qué se puede agregar con SQL explícito

**Verificado en el código: cómo entra el SQL**

- Hay dos comandos: `data --id --sql --contract`, con esquema sin cambios (`cli-main.ts:60`, `ssot-cli.ts:54`, `sd:consumers/postgres-migrations/LEEME-SSOT.md:484-485`), y `generate --sql --contract` sobre un borrador (`cli-main.ts:59`).
- El SQL manual corre **antes** del DDL generado de la misma migración (`compile-generated.ts:166`), y `CREATE TABLE` es parte de ese DDL generado (`generate-structure.ts:51-53`, `compile-generated.ts:147`). Por eso una constraint sobre una tabla nueva necesita dos migraciones: una que cree la tabla y otra con `data`.
- El parser solo prohíbe control de transacción, `VACUUM`, `ALTER SYSTEM`, DDL de bases y tablespaces, `CONCURRENTLY`, `nextval`/`setval` (`sql-resource.ts:230-253`) y `CASCADE` (`sql-resource.ts:310-315`). `EXCLUDE`, `CREATE TRIGGER`, `CREATE FUNCTION` y `CREATE EXTENSION` pasan el parser.
- El contrato acepta checks `before` y `after` (`authoring-cli.ts:217`, `authoring.ts:142-159`). Un check debe devolver una fila `{ok: boolean}` (`sql-resource.ts:376-386`). `writes` solo admite objetos que estén en el SSOT (`authoring.ts:196-203`), de modo que no puede nombrar al `EXCLUDE`.

**Verificado en el código: pasar el parser no alcanza**

Cada migración corre en una transacción (`execute-migration.ts:436`). Antes del commit se compara la base contra el esquema destino (`execute-migration.ts:504-505`), y cualquier diferencia revierte todo (`execute-migration.ts:339-345`, `execute-migration.ts:440-444`).

Ese esquema destino es siempre la proyección pura del SSOT. El SQL manual no puede ampliarlo: un estado guardado que difiera de la proyección se rechaza con "Saved state is not the declared SSOT projection" (`migration-store.ts:40`). El LEEME dice que las rutinas necesitan "SQL explícito y estados esperados verificables" (`sd:consumers/postgres-migrations/LEEME-SSOT.md:200-201`), pero este camino no ofrece una forma de declarar esos estados.

| SQL manual | Resultado en la verificación del destino | Citas |
| --- | --- | --- |
| `CREATE TRIGGER` | `migration.unsupportedSchemaFeature`, se revierte | `inspect-schema.ts:435-446`, `compare-schema.ts:102-108` |
| `CREATE FUNCTION` en el schema gestionado | Diferencia `add`, `migration.schemaDrift`, se revierte | `inspect-schema.ts:398-416`, `execute-migration.ts:339-345` |
| Columna de rango no declarada | Diferencia `add`, se revierte | `inspect-schema.ts:292-320`, `compare-schema.ts:124-130` |
| `CHECK` no declarado | Diferencia `add`, se revierte | `inspect-schema.ts:357`, `compare-schema.ts:124-130` |
| `ADD CONSTRAINT ... EXCLUDE` | **Pasa sin diferencias** (ver la sección 3) | `inspect-schema.ts:357`, `normalize-schema.ts:55` |

**Inferido: cómo sería el `EXCLUDE`**

```sql
-- Ilustrativo y sin ejecutar. Va en una migración `data`, posterior a la que crea `reservas`.
ALTER TABLE reservas ADD CONSTRAINT reservas_sin_solapamiento EXCLUDE USING gist (
    club WITH =,
    cancha WITH =,
    tsrange(fecha + hora_inicio, fecha + hora_fin, '[)') WITH &&
);
```

- El rango va como expresión, así que no hace falta una columna de rango. El límite `[)` deja contiguas 18:00–19:00 y 19:00–20:00.
- **Requiere `btree_gist`** para comparar `club` y `cancha` con `=` en GiST (PG18 §8.17.10 y §F.8).
- **El rol owner probablemente no pueda instalarla.** `btree_gist` es "trusted", pero exige privilegio `CREATE` sobre la base (PG18 §F.8). El owner es `NOSUPERUSER` y el aprovisionamiento no le da ese privilegio (`database-permissions.ts:17`, `database-permissions.ts:26-33`).
- **Tampoco se puede sumar al aprovisionamiento inicial.** Ese SQL debe coincidir exactamente con el generado (`database-permissions.ts:44`). Queda como precondición del entorno, que es como la documentación del propio consumer trata a las extensiones (`sd:docs/implementacion-migraciones.md:376`). Hoy `compose.yaml` no monta scripts de inicio (`ssot2026/compose.yaml:12-13`), así que habría que agregar ese paso.
- **El schema de instalación importa.** La inspección solo mira el schema gestionado (`inspect-schema.ts:264-267`, `apply-migrations.ts:21`). En `public`, la extensión queda fuera si la app usa otro schema, como `ssot` (`ssot2026/src/backend/database.ts:10`). Si la app gestionara `public`, las funciones de `btree_gist` aparecerían como rutinas y bloquearían el apply.
- **`WITHOUT OVERLAPS` no es una salida.** PostgreSQL 18 lo ofrece (PG18, `CREATE TABLE`), pero requiere una columna de rango, y esa columna revierte la migración.

## 3. Qué hace el drift con un objeto que el SSOT no describe

**Verificado en el código**

`apply` y `status` comparan la base contra el esquema guardado de la última migración aplicada (`apply-migrations.ts:23-35`, `migration-history.ts:37-42`). `apply` hace ese control antes de ejecutar nada y corta si falla (`apply-migrations.ts:103-104`, `apply-migrations.ts:121-122`). Lo repite dentro de cada migración (`execute-migration.ts:475`) y al terminar (`apply-migrations.ts:197`). La exclusión de objetos existe en la API, pero el camino de `apply` siempre pasa `excluded: []` (`apply-migrations.ts:31`, `:86`, `:153`).

El resultado depende de cómo clasifique el inventario a ese objeto. El inventario es una lista cerrada (`inspect-schema.ts:447-456`):

| Clase de objeto | Ejemplos | Qué pasa | ¿Bloquea `apply`? |
| --- | --- | --- | --- |
| Conocido y extra | `CHECK`, FK, índice independiente, vista, función, columna, tabla | Diferencia `add`, `migration.schemaDrift` (`compare-schema.ts:124-130`, `migration-history.ts:41`) | **Sí** |
| `unknown` | Trigger, agregado, función de ventana | `migration.unsupportedSchemaFeature`, antes de comparar (`inspect-schema.ts:417-446`, `compare-schema.ts:102-108`) | **Sí** |
| Fuera del inventario | **`EXCLUDE`** y toda clase que no esté en la lista, como secuencias o vistas materializadas | Nadie lo mira | **No, y tampoco lo protege** |

El caso de `EXCLUDE` sale de tres líneas combinadas:

1. El inventario de constraints trae solo `contype IN ('p','u','f','c')`, sin `x` (`inspect-schema.ts:357`).
2. Su índice de respaldo sí se inventaría, y queda ligado a su dueño porque ese join incluye `x` (`inspect-schema.ts:372-373`).
3. La normalización descarta todo índice con dueño (`normalize-schema.ts:54-55`). Se aplica en el drift (`migration-history.ts:39`), en la ejecución (`execute-migration.ts:337`) y en `assess` (`assessment.ts:17-18`).

Sobre la clasificación `unsupported` que menciona el README de `ssot2026`: es solo informativa. `classifySchemaDifference` la asigna, por ejemplo, a una rutina presente en la base y ausente del SSOT (`classify-schema.ts:21-23`), pero `apply` no la usa para decidir nada frente a la base: exige igualdad. Con un trigger, ni `assess` llega a clasificar, porque falla antes (`assessment.ts:18`, `compare-schema.ts:102-108`).

Tampoco hay reparación automática: quien corrige el drift es la persona (`ssot2026/docs/migration-assessment.md:29`, `:164`).

**Inferido**

- **Un `EXCLUDE` borrado no se detectaría.** Ni `apply` ni `status` lo notarían, porque para ellos nunca existió.
- **Puede desaparecer en silencio.** Si un cambio del SSOT quita una columna que el `EXCLUDE` usa, el DDL generado es un `DROP COLUMN` sin `CASCADE` (`generate-structure.ts:77`), y PostgreSQL elimina solas las constraints de la tabla que involucran a esa columna (PG18, `ALTER TABLE`).
- **Parece un hueco y no una función.** La documentación del propio repo dice que "un objeto extra o no comprendido es fallo bloqueante" (`sd:docs/implementacion-migraciones.md:374`, `:384`), y no encontré ningún test con una constraint `EXCLUDE`. Si alguien cierra el hueco, un `EXCLUDE` ya aplicado pasaría a bloquear el `apply`.
- **La mitigación es parcial.** Un check `after` en la migración confirma que la constraint existe, pero solo esa vez. `invariantChecks` queda vacío en este camino (`apply-migrations.ts:153`), así que el control permanente tendría que ser un test de la app.

## 4. La alternativa de una fila por Bloque

**Modelo ilustrativo** (los nombres no son una decisión):

| Entidad | Clave primaria | FK | Otros campos |
| --- | --- | --- | --- |
| `reservas` | `[club, cancha, fecha, hora_inicio]` | a la Cancha | Quién reserva y demás |
| `bloques_reservados` | `[club, cancha, fecha, hora]` | `[club, cancha, fecha, hora_inicio]` a `reservas` | `hora_inicio` de su Reserva |

**Qué garantiza la clave primaria.** No puede haber dos filas para el mismo Bloque de la misma Cancha, sin importar quién escriba: Procedimiento, CRUD genérico o SQL directo. En el caso del ticket:

| Reserva | Bloques | Resultado |
| --- | --- | --- |
| 18:00–19:30 | 18:00, 18:30, 19:00 | Se inserta |
| 19:00–20:30 | 19:00, 19:30, 20:00 | Choca en 19:00 con `23505` y se revierte entera |

**Qué no garantiza.** Que una Reserva tenga dos o más Bloques, que sean consecutivos, ni que tenga alguno. Son condiciones entre filas: `CHECK` no puede expresarlas y los triggers están bloqueados, así que quedan en el Procedimiento y sus tests. Un `CHECK` sí puede exigir que `hora` esté alineada a :00 o :30.

**Cuántas filas.** Una por cada 30 minutos de Reserva, y como máximo 48 por Cancha y por día.

| Duración de la Reserva | Filas en `bloques_reservados` |
| --- | --- |
| 1 hora (mínimo) | 2 |
| 1 hora 30 | 3 |
| 2 horas | 4 |

| Escenario, con ocupación total de 08:00 a 24:00 (32 Bloques por día) | Filas como máximo |
| --- | --- |
| 10 Clubes, 4 Canchas cada uno, 30 días | 38.400 |
| 100 Clubes, 4 Canchas cada uno, 1 año | 4.672.000 |

Para una entrega con datos de prueba, el volumen no es un factor de decisión.

**Cómo se crea la Reserva con sus Bloques.** Dentro de un Procedimiento, en una sola transacción:

```sql
-- Ilustrativo y sin ejecutar.
BEGIN;
INSERT INTO reservas (club, cancha, fecha, hora_inicio /*, ... */)
    VALUES ($1, $2, $3, $4 /*, ... */);
INSERT INTO bloques_reservados (club, cancha, fecha, hora, hora_inicio)
    SELECT $1, $2, $3, hora, $4 FROM unnest($5::time[]) AS hora ORDER BY hora;
COMMIT;  -- Si algo falla: ROLLBACK, y no queda ni la Reserva ni sus Bloques.
```

**Verificado en el código**

- Se puede expresar entero con el vocabulario: PK y FK salen del modelo (`pg-schema.ts:343-366`, `pg-schema.ts:396-434`), y las tablas nuevas reciben sus grants sin SQL manual (`database-permissions.ts:36-40`).
- El drift las cubre: si falta la PK, la comparación da una diferencia y bloquea (`compare-schema.ts:131-137`, `migration-history.ts:41`).
- El backend ya tiene el patrón de transacción con `BEGIN`, `COMMIT`, `ROLLBACK` y `release` (`ssot2026/src/backend/api.ts:122-152`).
- Hoy no hay Procedimientos en `ssot2026/src`: ese código está por escribirse, y según el mapa vive en `padel/`.
- `23505` ya se traduce a HTTP 409 con "Ya existe un registro con esa clave." (`ssot2026/src/backend/api-errors.ts:25`). `23P01`, el error de `EXCLUDE`, no está mapeado y terminaría en 500 (`ssot2026/src/backend/api-errors.ts:24-31`, `:36`).
- Las FK generadas no llevan `ON DELETE` (`pg-schema.ts:197-204`) y el borrado genérico rechaza filas con dependientes (`ssot2026/src/backend/api.ts:133-137`). Para cancelar, hay que borrar primero los Bloques.

**Inferido**

- **Concurrencia.** Con dos Reservas simultáneas sobre el mismo Bloque, la segunda espera a que la primera termine y falla si esta confirma. Vale con el aislamiento por defecto, porque la unicidad no depende de él.
- **Deadlocks.** Insertar los Bloques en orden ascendente, como en el ejemplo, los evita entre Reservas de una misma Cancha. El mensaje actual para `40P01` habla de "la cuenta" (`ssot2026/src/backend/api-errors.ts:30`), así que el Procedimiento debería dar el suyo. También conviene que traduzca `23505` a "Cancha ocupada".

## 5. Trade-offs

| Criterio | A: una fila por Reserva con `EXCLUDE` manual | B: una fila por Bloque |
| --- | --- | --- |
| Impide el solapamiento en la base | Sí | Sí |
| Dentro del SSOT | **No** | **Sí** |
| El drift lo vigila | **No: si se pierde, nadie avisa** | **Sí** |
| Piezas fuera del SSOT | `btree_gist`, paso de entorno, SQL manual, segunda migración, test de existencia | Ninguna |
| Riesgo ante cambios del consumer | Si se cierra el hueco de inspección, pasa a bloquear | Ninguno identificado |
| Duración mínima y alineación | **En la base, con `CHECK`** | Alineación sí; **duración mínima no** |
| Bloques consecutivos | **Garantizado por el modelo** | **Solo Procedimiento y tests** |
| Estados inválidos posibles | Pocos | Reserva sin Bloques o con huecos, por ejemplo desde el CRUD de Administración |
| Filas por Reserva | 1 | Duración / 30 min |
| Crear | Un `INSERT` | Transacción con dos `INSERT` |
| Cambiar la duración | Un `UPDATE` | Borrar e insertar Bloques en una transacción |
| Cancelar | Borrar la fila, o un `EXCLUDE` parcial si se conserva el estado | Borrar Bloques y después la Reserva |
| Consultar la agenda | Consultas de solapamiento de rangos | Join directo por clave, en línea con la regla de joins por PK |
| Errores en la API | Falta mapear `23P01` | `23505` ya da 409 |
| Después de medianoche ([#7](https://github.com/fdllrs/taller_db/issues/7)) | El rango lo resuelve, si la duración se guarda aparte de `hora_fin` | Cada Bloque debe llevar su fecha real; la FK a la Reserva necesita la fecha propia de la Reserva |

**Opción C: extender el consumer.** Agregar `exclusions` a `postgresStorage` y al inventario (tipos, decoder, inspección, comparación, generación y tests) daría un `EXCLUDE` declarado y vigilado. Es la versión correcta de A, y también la más cara:

- Toca el consumer, que vive en `system-definition`, fuera de lo que cubre el [ADR 0001](https://github.com/fdllrs/taller_db/blob/worktree-padel-map/docs/adr/0001-ssot2026-como-copia-propia.md).
- Sigue necesitando `btree_gist`.
- Si llegara a tocar `ssot2026`, los principios piden acordarlo antes con el programador (`DEVELOPMENT-PRINCIPLES.md`, Parte III §3).

**Sobre los principios.** A se aparta de "Estructura Declarada en Código" y de la Fuente Única de Verdad (`DEVELOPMENT-PRINCIPLES.md`, Parte I §1 y Parte II §2). B no se aparta de ninguno, pero le deja al Procedimiento una regla del glosario: que la Reserva sean "dos o más Bloques consecutivos".

## 6. Recomendación

> **Es una recomendación, no una decisión.** La elección corresponde a [#7](https://github.com/fdllrs/taller_db/issues/7).

**Elegir B, una fila por Bloque.** La regla más cara de romper, que no haya dos Reservas en el mismo Bloque, queda garantizada por una PK común que el drift vigila, y no requiere extensiones ni SQL manual. Lo que B deja afuera (mínimo de dos Bloques y consecutividad) puede cubrirse con el Procedimiento y sus tests, y un error ahí da una Reserva mal formada, no una Cancha reservada dos veces.

**Revisaría esta recomendación si:**

- El equipo exige que la base garantice también el mínimo y la consecutividad. Ahí conviene C, o A aceptando sus riesgos por escrito.
- [#7](https://github.com/fdllrs/taller_db/issues/7) define algo que haga caros los Bloques individuales. Con lo leído en los tickets no veo ningún caso así.

**Si se elige B, conviene resolver en [#7](https://github.com/fdllrs/taller_db/issues/7):**

- **No guardar `hora_fin` ni la duración en `reservas`.** Derivadas de los Bloques no pueden contradecirlos, y una Reserva con duración guardada y sin Bloques no ocuparía nada.
- **Cancelaciones.** Si la Reserva cancelada se conserva con su PK, nadie podría volver a reservar esa misma hora de inicio. Esto también afecta a A.

## 7. Qué quedó sin confirmar

1. **Nada se ejecutó.** La invisibilidad de `EXCLUDE` surge de leer el código y es el hallazgo de mayor peso. Para confirmarla, sobre PostgreSQL 18.6 de descarte: aplicar una migración `data` con el `EXCLUDE`, correr `apply` y `status` (deberían dar OK), hacer `DROP CONSTRAINT` a mano y repetir (deberían seguir dando OK).
2. **`btree_gist`.** Falta probar que el owner no pueda instalarla, que un superusuario pueda hacerlo antes de migrar, y que el owner pueda crear la constraint si la extensión está en otro schema. Solo importa si se elige A o C.
3. **Falsos positivos con `CHECK`.** La comparación normaliza el texto, pero solo reescribe casts de `text[]` (`normalize-schema.ts:17-43`), y compara `columns` respetando el orden (`compare-schema.ts:66-68`). Una expresión que PostgreSQL reescriba, o un `CHECK` de varias columnas en otro orden, podría dar drift falso y revertir la migración. Los ejemplos que vi en los tests son de una sola columna. Afecta a A y a B.
4. **Intención del upstream.** No sé si el hueco de `EXCLUDE` es conocido. La rama sigue en refactor y estas citas valen para el commit indicado, no necesariamente para los siguientes.
5. **Consumer ausente.** La copia local de `system-definition/` no tiene `consumers/`, y `ssot2026/package.json:5` depende de esa ruta. Falta definir cómo lo obtiene `padel/`.
6. **Reglas de dominio de [#7](https://github.com/fdllrs/taller_db/issues/7).** Cierre después de medianoche, historial de cancelaciones y tipo de `hora` pueden cambiar la PK de los dos modelos. La forma exacta de las tablas depende de eso.
