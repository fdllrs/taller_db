# Herramientas para validar SQL, medir cobertura y verificar migraciones

Investigación del issue [#6](https://github.com/fdllrs/taller_db/issues/6), parte del mapa [#2](https://github.com/fdllrs/taller_db/issues/2). Responde cómo cumplir II.2, II.3 y II.4 de `DEVELOPMENT-PRINCIPLES.md`. Fecha: 2026-11-04.

Cada afirmación lleva una marca:

- **[V]** verificado: lo leí en una fuente primaria o lo ejecuté.
- **[I]** inferido: es una conclusión mía a partir de lo verificado.

Los experimentos corrieron en directorios temporales nuevos, fuera del repo, y en contenedores `node:24.21.0-bookworm-slim` (la imagen del `Dockerfile` de `ssot2026`) y `postgres:18.6-bookworm` (la de su `compose.yaml`). No se instaló nada en el repo. El prototipo y los scripts de prueba no se versionaron.

## Respuesta corta

| Principio | ¿Existe la herramienta? | Recomendación |
| --- | --- | --- |
| II.3, validador de joins | No hay implementación: solo la especificación. | Construirlo sobre `libpg-query`, no sobre `pgsql-ast-parser` como dice la especificación. |
| II.4, cobertura | Sí. | `c8` sobre `node --test`. La cobertura nativa de Node 24 puede dar un falso 100%. |
| II.2, comparar dumps | Sí: `pg_dump` más `codenautas/pg-dump-compare`. | Usarlos en un test nuevo. Detecta 12 tipos de diferencia que `migration:apply` deja pasar. |

## Alertas antes de decidir

Son contradicciones que encontré. Según II.4 hay que detenerse y avisar, así que las dejo a la vista.

1. **`ssot2026` no compila con el `system-definition` de este repo. [V]** `ssot2026/package.json` depende de `file:../system-definition/consumers/postgres-migrations`, pero `system-definition/consumers/` no existe acá ni en la rama `main` de upstream. El paso del `Dockerfile` que lo compila falla con `ENOENT`. El consumidor está en la rama [`refactor/migrations-full`](https://github.com/ari-dc-uba-ar/system-definition/tree/33524072e3905b45b80891e7c9916656976449c3/consumers/postgres-migrations) de upstream, y también hay una versión en la rama `migrations`, sin `pg-ast.ts`. Mis pruebas usaron `refactor/migrations-full`, commit `33524072`: con él compilaron todo y `migration:apply` corrió las 5 migraciones. Sus dependencias coinciden con las de `ssot2026/package-lock.json` (`pgsql-parser` 18.2.10, `pg` 8.23.1, `esbuild` 0.28.2). **[I]** Es el commit correcto o uno muy cercano, pero hay que confirmarlo y traer esa carpeta al repo.
2. **Dos tests de `ssot2026` fallan. [V]** Al correr la suite, sin el navegador, pasaron 81 de 83. Los dos que fallan están en `test/assessment.test.mjs` (líneas 22 y 68). Insertan en `ssot.materias` sin `cod_dep` y sin `cod_mat`, y esas columnas son `NOT NULL`. **[I]** Es un dato de prueba desactualizado y no tiene que ver con la cobertura.
3. **La especificación del validador y el consumidor eligen parsers distintos. [V]** La especificación pide `pgsql-ast-parser`, y el consumidor de migraciones ya usa [`pgsql-parser`](https://github.com/ari-dc-uba-ar/system-definition/blob/33524072e3905b45b80891e7c9916656976449c3/consumers/postgres-migrations/src/pg-ast.ts), que se apoya en `libpg-query`.
4. **`migration:apply` rechaza los triggers en el esquema que administra. [V]** Un trigger en `ssot` lo hace salir con código 3 y `migration.unsupportedSchemaFeature`. Esto limita al modelo de `padel/`, y además la regla `trigger-name-mismatch` de la especificación no tendría a qué aplicarse en ese esquema.
5. **Parte de lo recomendado toca `ssot2026`. [I]** Medir bien la cobertura del servidor y validar sus consultas requiere cambios ahí, y III.3 exige acordarlos antes con el programador.

## II.3: validador de joins por PK

### ¿Existe una implementación usable?

No, solo existe la idea. **[V]**

- La búsqueda de código en GitHub de `constructed-sql-validator` y `allow-join-no-pk` solo devuelve la [especificación](https://github.com/codenautas/ideas/blob/master/src/constructed-sql-validator.md) y la [conversación de diseño](https://github.com/codenautas/ideas/blob/master/conversaciones/constructed-sql-validator-conversacion.md) en `codenautas/ideas`, más nuestras copias de la especificación.
- `validateSql` tampoco aparece como código en `codenautas` ni en `ari-dc-uba-ar`, y `allow-cross-join` no da resultados en `ari-dc-uba-ar`.
- Revisé por nombre los repos de las dos organizaciones. [`codenautas/sql-tools`](https://github.com/codenautas/sql-tools) es de OLAP, según su descripción. La rama `claude/parser-y-validador` de `system-definition` trata de filas y entidades, no de SQL.
- La búsqueda general de repos en GitHub (`sql validator join primary key`, `sql lint join cardinality postgres`) no dio resultados. En npm, [`squawk-cli`](https://www.npmjs.com/package/squawk-cli) se describe como un linter enfocado en migraciones.

El último commit sobre la especificación es del 2026-07-09. La búsqueda de código de GitHub no cubre todas las ramas, de modo que podría haber algo que no indexa. **[I]**

### Parsers

Probé 35 sentencias válidas en Node 24.21 y compilé cada paquete con TypeScript 7.0.2, usando las opciones estrictas de `ssot2026/src/backend/tsconfig.json` con `skipLibCheck: false`. **[V]**

| | [`libpg-query`](https://www.npmjs.com/package/libpg-query) 18.2.2 | [`pgsql-ast-parser`](https://www.npmjs.com/package/pgsql-ast-parser) 12.0.2 |
| --- | --- | --- |
| Motor | [Parser de PostgreSQL compilado a WASM](https://github.com/constructive-io/libpg-query-node), sin compilación nativa | [Gramática propia que cubre "the most common syntaxes"](https://github.com/oguimbal/pgsql-ast-parser) |
| Node 24.21 | Funciona | Funciona |
| TypeScript 7.0.2 | Compila sin errores | Compila sin errores |
| `npm ci --ignore-scripts` | Sin scripts de instalación | Sin scripts de instalación |
| Sentencias válidas aceptadas | 35 de 35 | 16 de 35 |
| Sintaxis de PostgreSQL 18 (7 casos) | 7 de 7 | 1 de 7 |
| `SELECT * FROM a JOIN b`, que es inválido | Lo rechaza | Lo acepta |
| Comentarios | No están en el AST; se obtienen con `scanSync` | `parseWithComments()` |
| Posiciones | Bytes UTF-8 | `_location`, sin probar con texto no ASCII |
| Inicialización | `await loadModule()` antes de `parseSync` | Ninguna |
| Última publicación | 2026-10-29 | 2026-01-27; la anterior es de 2024-01-08 |
| Issues y PRs abiertos | 8 | 48 |
| Descargas de la última semana | 2.768.079 | 1.861.576 |

Lo que `pgsql-ast-parser` rechaza pesa por tres motivos. **[V]**

- **Consultas que `ssot2026` ya arma:** `COLLATE "C"` en `ORDER BY` (`src/backend/entity-query.ts:36`) e `IS NOT DISTINCT FROM` (`entity-query.ts:30`). Esta última la probé dentro de un `ON`. La forma completa de la consulta de `entity-query.ts` también falla.
- **El alcance de la propia especificación:** `CREATE TRIGGER` y `DELETE ... USING`.
- **Otras sintaxis:** `NATURAL JOIN`, `JOIN ... USING (...) AS j`, FK `DEFERRABLE`, `GRANT`, `CREATE TABLE AS`, `MERGE` y `JSON_TABLE`. Coincide con lo que piden sus issues abiertos, como [#174](https://github.com/oguimbal/pgsql-ast-parser/issues/174).

El motivo original para elegir `pgsql-ast-parser` ya no aplica. La [conversación de diseño](https://github.com/codenautas/ideas/blob/master/conversaciones/constructed-sql-validator-conversacion.md) lo prefirió por la compilación nativa de `libpg-query` en Windows y por `parseWithComments()`. Hoy `libpg-query` es [solo WASM](https://github.com/constructive-io/libpg-query-node), y desde PG 18 [trae `scan`](https://github.com/constructive-io/libpg-query-node/tree/main/versions/18). **[V]**

Otros candidatos, descartados sin probarlos:

- [`@supabase/pg-parser`](https://github.com/supabase-community/pg-parser) solo admite PostgreSQL 15 a 17. **[V]**
- `@libpg-query/parser` tiene `latest` en 17.6.10 y `pg18` en 18.0.0, según npm. **[V]**
- `pg-query-emscripten` no se publica desde 2024-09, según npm. **[V]**
- `sql-parser-cst` es GPL, según npm, y haría falta evaluar si eso es aceptable. **[I]**
- No evalué `node-sql-parser`.

### Detalles de `libpg-query` a tener en cuenta

- **Gramática de PostgreSQL 18.4, no 18.6. [V]** El campo `version` devuelve `180004`, y el paquete compila [un fork](https://github.com/constructive-io/libpg-query-node/blob/main/versions/18/Makefile) (`constructive-io/libpg_query`, tag `18-constructive`). El [`libpg_query` original 18.1.0](https://github.com/pganalyze/libpg_query/blob/18-latest/CHANGELOG.md) ya está en 18.6. **[I]** No debería afectar, porque las versiones menores no suelen cambiar la gramática. No lo comprobé.
- **Versiones duplicadas. [V]** `pgsql-parser` fija una versión exacta de `libpg-query`: la 18.3.2 instala la 18.2.1, y la 18.2.10 del consumidor pide la 18.1.5. Instalar `libpg-query` 18.2.2 aparte deja dos copias del WASM. La 18.1.5 también expone `scanSync` y devuelve `180004`, así que conviene alinearse con la versión del consumidor.
- **Tipos. [V]** En `@pgsql/types`, `latest` es 17.6.2. Para PG 18 hay que pedir `@pgsql/types@pg18`, que hoy es la 18.0.0.
- **Posiciones en bytes. [V]** En `SELECT 'ñandú ñandú' AS año ...`, `scanSync` ubica el comentario en 40, mientras que `indexOf` da 35. El AST usa la misma unidad, de modo que comparar posiciones funciona. Lo que falla es cortar un string de JS con esos números, y esto importa porque el dominio está en castellano.
- **`JoinExpr` no tiene `location`. [V]** Para asociar una directiva a su join hay que usar las posiciones de `rarg` y de las columnas del `ON`.
- **`CROSS JOIN` no tiene tipo propio. [V]** Es un `JOIN_INNER` sin `quals` ni `usingClause`, y `isNatural` lo distingue de `NATURAL JOIN`.
- **Errores. [V]** `parseSync` lanza `SqlError`. La especificación dice que `validateSql` no lanza excepciones, así que hay que capturarlo.
- **Costo. [V]** `parseSync` tardó unos 35 µs por consulta en una de cuatro tablas. Es una sola medición en esta máquina.

### Qué haría falta construir

Escribí un prototipo descartable de unas 100 líneas sobre `libpg-query`. Con los tres ejemplos de la especificación dio la PK esperada (`p.pedido`; `e.empleado, t.trimestre`; `a.id, b.id`). También rechazó join sin PK, `CROSS JOIN` sin allow, PK compuesta parcial y allow sin `new-pk`, y aceptó el join por `UNIQUE`. **[V]** Muestra que el AST alcanza para la regla central, pero no es una base para el código final.

Falta lo siguiente. **[I]**

1. **Recorrido completo:** todos los `SelectStmt`, `InsertStmt`, `UpdateStmt` y `DeleteStmt`, incluidos los anidados. Hace falta porque `ssot2026/src/backend/api.ts:91-93` tiene un `JOIN` dentro de un CTE.
2. **Fuentes que no son tablas:** subconsultas (`RangeSubselect`), funciones (`RangeFunction`), `LATERAL` y referencias a CTE.
3. **Joins implícitos:** `FROM a, b`, `UPDATE ... FROM`, `DELETE ... USING`.
4. **Directivas:** extraerlas con `scanSync`, parsearlas y asociarlas a su join de forma robusta. El prototipo usa una heurística simple.
5. **Catálogo:** un adaptador desde el esquema proyectado (`projectSsotSchema`), que ya trae las restricciones y la nulabilidad de las columnas ([`pg-schema.ts`](https://github.com/ari-dc-uba-ar/system-definition/blob/33524072e3905b45b80891e7c9916656976449c3/consumers/postgres-migrations/src/pg-schema.ts)). Así se respeta I.1 y no se duplican PKs a mano. El tipo `Catalog` de la especificación no distingue `UNIQUE` de `UNIQUE NOT NULL`, por lo que el adaptador debe filtrar.
6. **Regla `trigger-name-mismatch`:** sobre `CreateTrigStmt`, que tiene `trigname` y `funcname`. Ver la alerta 4.
7. **Integración:** un envoltorio de `pool.query`. El backend de `ssot2026` llama a `pool.query` directamente, y tocarlo requiere el acuerdo de III.3.
8. **Tests:** una colección con las consultas reales de `ssot2026` y `padel/`.

La especificación deja abiertas estas decisiones: `RIGHT` y `FULL JOIN`, subconsultas y CTE, y la simetría de nombres entre regla y allow. Yo agrego tres: si `FROM a, b` cuenta como `CROSS JOIN`, si `a.x = $1` cubre una columna de la PK, y qué pasa con un `OR` en el `ON`.

## II.4: cobertura con `node:test` sobre TypeScript compilado

Comparé `c8` 12.0.0 con la cobertura nativa en Node 24.21, con una muestra compilada por TypeScript 7 y con la suite real de `ssot2026`. **[V]**

| | [`c8`](https://github.com/bcoe/c8) 12.0.0 | Cobertura nativa de Node 24.21 |
| --- | --- | --- |
| Estado | Publicado, admite `>=23` según npm | [`Experimental`](https://nodejs.org/docs/latest-v24.x/api/test.html#collecting-code-coverage) |
| Reporta sobre `.ts` | Sí, sin opciones extra | Solo con [`--enable-source-maps`](https://github.com/nodejs/node/commit/b9200c33ae) |
| Filtrar archivos con source maps | `--src` y `--exclude` funcionan | **`--test-coverage-include` deja el reporte vacío** |
| Umbral del 100% con cobertura incompleta | `--check-coverage` sale con 1, lo correcto | **Con ese filtro sale con 0** |
| Archivos nunca cargados | `--all` los cuenta con 0% | No aparecen; [`--test-coverage-include-all`](https://github.com/nodejs/node/blob/main/doc/api/cli.md) es de v26.7.0 y en 24.21 da `bad option` |
| Líneas de comentario | No las marca | Marcó como sin cubrir la línea 1 de `logic.ts`, que es un comentario |
| Subprocesos con salida normal | Los cuenta | Los cuenta |
| Subprocesos con `SIGTERM` | Se pierden | Se pierden |
| Uso en el ecosistema | [`system-definition`](https://github.com/ari-dc-uba-ar/system-definition/blob/main/.c8rc.json), [`sql-tools`](https://github.com/codenautas/sql-tools) | No lo busqué |

El falso 100% es lo más grave. Con `--enable-source-maps` y `--test-coverage-include`, probé `src/**`, `dist/**`, `/w/src/**` y `**/*.ts`. Las cuatro variantes dieron un reporte sin archivos y `all files 100.00`. Con `--test-coverage-lines=100` y `src/**` el proceso salió con 0, aunque la función `nuncaLlamada` no se ejecutaba. Sin `--test-coverage-include`, el mismo umbral salió con 1, que es lo correcto. **[V]** No encontré un issue de Node que describa este caso, y solo lo probé en 24.21.

Otros reportes sobre la cobertura con source maps en Node, que no reproduje: [#67099](https://github.com/nodejs/node/issues/67099) y [#67077](https://github.com/nodejs/node/issues/67077), sobre v26, y [#65946](https://github.com/nodejs/node/issues/65946), sobre v24.19 y v26.8 con hooks de módulos fuera del hilo principal.

### El servidor de los tests no reporta cobertura

`NODE_V8_COVERAGE` [se propaga a los subprocesos](https://nodejs.org/docs/latest-v24.x/api/cli.html#node_v8_coveragedir), pero un proceso que muere por `SIGTERM` sin manejador no llega a escribir su cobertura. **[V]** Lo comprobé en la muestra con las dos herramientas.

En `ssot2026` pasa exactamente eso: `test/crud.integration.test.mjs` arranca el servidor en la línea 14 y lo mata con `child.kill()` en la línea 131, y `src/backend/server.ts` no maneja señales. En la corrida real, `server.ts` quedó con 0% aunque el servidor atendió los tests. **[V]**

Hay dos arreglos posibles:

- Lanzar el servidor en los tests con `--import` de un archivo que haga `process.on('SIGTERM', () => process.exit(143))`. Lo probé en la muestra y funcionó sin tocar el código de producción. **[V]**
- Agregar un cierre ordenado a `server.ts`. **[I]** Es una mejora genérica, pero toca más código.

Cualquiera de los dos cambia archivos de `ssot2026`, así que requiere el aviso de III.3.

### Línea de base de `ssot2026`

Corrí `c8 --all --src dist --exclude "test/**"` sobre 13 archivos de test, sin los del navegador y con 2 tests fallando (alerta 2). **[V]**

| Alcance | Líneas | Ramas | Funciones |
| --- | --- | --- | --- |
| Todo | 45,12% | 87,92% | 63,93% |
| `src/backend` | 85,65% | 86,52% | 90% |
| `dist/frontend` | 16,75% | 90,21% | 38,7% |

Sobre estos números:

- **Archivos solo de tipos:** `api-contract.ts` y `browser-contract.ts` figuran con 0% por `--all`. **[V]** Hay que excluirlos o nunca se llegará al 100%. **[I]**
- **Frontend:** `src/frontend/tsconfig.json` tiene `sourceMap: false`, por lo que se reporta sobre `.js`. **[V]** Los módulos que solo corren en el navegador figuran con 0%, y V8 en Node no los puede ver. **[I]** Medirlos necesita otra solución, que no investigué.
- **Objetivo:** el umbral por archivo existe ([`--per-file`](https://github.com/bcoe/c8)) y sirve para el 100% en lógica crítica. **[V]** Qué módulos entran es una decisión de la estrategia de tests del mapa.

## II.2: comparar una base migrada contra una limpia

### Cómo comparar

La receta que funcionó sobre la `ssot2026` real, con PostgreSQL 18.6: **[V]**

1. **Base migrada:** `migration:apply` sobre una base vacía aplica todo el catálogo.
2. **Base limpia:** crear el esquema `ssot` en otra base y ejecutar `generateCreate(projectSsotSchema(...))`, como hace `test/helpers/database.mjs`.
3. **Volcar las dos:**
   ```sh
   pg_dump -s --schema=ssot --restrict-key=fixed --no-owner --no-privileges -d <base>
   ```
4. **Normalizar y comparar** con [`pg-dump-compare`](https://github.com/codenautas/pg-dump-compare):
   ```sh
   pg-dump-compare clean.sql migrated.sql -oti
   ```

Sobre esta receta:

- **`--restrict-key` es obligatorio. [V]** Sin él, dos dumps de la misma base difieren en las líneas `\restrict` y `\unrestrict`, porque la clave es aleatoria. Con una clave fija dan iguales. La [documentación](https://www.postgresql.org/docs/18/app-pgdump.html) lo describe para este uso y no lo recomienda para uso general, de modo que es solo para el test. `pg-dump-compare` no elimina esas líneas.
- **`-oti` es necesario en `ssot2026`. [V]** Comparando con `diff` los archivos canónicos, hay 34 líneas de diferencia sin `-oti` y 0 con él. Las 6 tablas que difieren solo cambian el orden de las columnas: en la base limpia quedan en orden alfabético, y en la migrada no. Con las migraciones actuales, entonces, un `diff` directo da falso positivo. `-oti` ordena las columnas, y a cambio deja de ver ese orden.
- **`pg-dump-compare` necesita `git` para el diff. [V]** En `node:24.21.0-bookworm-slim` escribió los archivos canónicos y después falló con `git exited with code null`, por lo que no llegué a ver su `only.diff` real. `--canonical` no lo necesita, y el resultado se puede comparar con `diff`. La versión de npm es la 0.1.1, y `main` tiene un commit posterior (2026-04-26).
- **`--schema=ssot` oculta las extensiones. [V]** `CREATE EXTENSION btree_gist SCHEMA ssot` no dejó diferencia en el dump, mientras que `migration:apply` sí lo detectó. **[I]** `--exclude-schema=ssot_migrations` debería evitarlo, pero no lo probé.
- **Sin permisos ni dueños. [I]** El helper de tests agrega los `GRANT` aparte de `generateCreate`, y yo creé la base limpia con otro rol. Por eso corrí la comparación con `--no-owner --no-privileges`, y con esas opciones dio 0. No probé qué pasa sin ellas. Para comparar también los permisos, habría que aplicar los mismos en la base limpia.
- **Dónde correrlo. [V]** La imagen del backend no trae `pg_dump`, pero la de `postgres:18.6-bookworm` sí, igual que esta máquina.

**[I]** Como cada migración queda fija por su hash, repetir el catálogo cubre todos los pasos de N a N+1 sin depender de tags de git. Los tags que pide la [nota de migraciones](https://github.com/fdllrs/taller_db/blob/aa63cfa/ideas/mantener-actualizada-estructura-db.md) solo harían falta para probar desde una versión instalada específica.

### Qué agrega sobre `migration:apply`

`migration:apply` compara otra cosa. **[V]**

- Compara la base contra el esquema esperado guardado en la migración ([`execute-migration.ts:335-337`](https://github.com/ari-dc-uba-ar/system-definition/blob/33524072e3905b45b80891e7c9916656976449c3/consumers/postgres-migrations/src/execute-migration.ts#L335-L337), [`apply-migrations.ts:29-34`](https://github.com/ari-dc-uba-ar/system-definition/blob/33524072e3905b45b80891e7c9916656976449c3/consumers/postgres-migrations/src/apply-migrations.ts#L29-L34)). Nunca construye una base limpia.
- Su inventario solo cubre tablas, columnas, restricciones, índices, vistas y rutinas, más triggers, agregados y funciones de ventana como no admitidos ([`inspect-schema.ts`](https://github.com/ari-dc-uba-ar/system-definition/blob/33524072e3905b45b80891e7c9916656976449c3/consumers/postgres-migrations/src/inspect-schema.ts)).
- Existe [`verifyUpgrade`](https://github.com/ari-dc-uba-ar/system-definition/blob/33524072e3905b45b80891e7c9916656976449c3/consumers/postgres-migrations/src/verify.ts#L403), que sí arma una base limpia, pero compara la migrada contra la proyección del esquema y no contra esa base. Fuera de su propio archivo, solo la llaman tests del consumidor.

Para medir la diferencia, copié la base migrada, hice un cambio manual en cada copia y corrí el CLI real de `apply` y `pg_dump`. Un `apply` con salida 0 significa que no vio nada. **[V]**

| Cambio manual | `apply` (salida) | Diferencia en el dump |
| --- | --- | --- |
| Sin cambios (control) | 0 | No |
| Columna extra, tipo o default distinto | 3 | Sí |
| Índice, índice parcial o `CHECK` extra | 3 | Sí |
| Vista o función extra | 3 | Sí |
| Trigger | 3 (no admitido) | Sí |
| Quitarle el `SELECT` al rol de la app | 3 | Sí |
| Cambio de dueño | 3 | Sí |
| Extensión en el esquema | 3 | No (ver `--schema`) |
| Fila nueva | 0 | No |
| **Restricción `EXCLUDE`** | **0** | **Sí** |
| **Secuencia** | **0** | **Sí** |
| **Tipo enum** | **0** | **Sí** |
| **Dominio** | **0** | **Sí** |
| **Vista materializada** | **0** | **Sí** |
| **RLS y policy** | **0** | **Sí** |
| **Regla (`RULE`)** | **0** | **Sí** |
| **Comentario** | **0** | **Sí** |
| **Opción de tabla (`fillfactor`)** | **0** | **Sí** |
| **`STORAGE` de columna** | **0** | **Sí** |
| **`STATISTICS` de columna** | **0** | **Sí** |
| **`GRANT` extra a `PUBLIC`** | **0** | **Sí** |

Dos aclaraciones sobre esta tabla. **[V]**

- Cada dump se comparó contra la copia sin cambios de la misma base migrada, y no contra la base limpia. Estos dumps incluían dueños y permisos, a diferencia de la receta de arriba. Con `--no-privileges`, el `GRANT` extra no se vería, así que la receta detecta 11 de los 12.
- Los 12 casos en negrita conservan su diferencia después de `pg-dump-compare --canonical -oti`.

En resumen, comparar dumps agrega:

- **Los 12 tipos de objeto o propiedad en negrita.** **[I]** Una migración escrita a mano con errores dejaría el mismo estado que estos cambios manuales, aunque yo los probé contra la verificación con la que arranca `apply` y no contra una migración pendiente. Lo importante para `padel/` es `EXCLUDE`, si se usa para impedir Reservas superpuestas.
- **Un punto de comparación independiente:** la base limpia sale del SSOT actual, y no del esquema guardado en la migración. **[I]**
- **El orden de columnas, si se decide no usar `-oti`.** El inventario no guarda la posición. **[V]**

Y no reemplaza a `migration:apply`, que verifica lo que un dump estructural no ve: hashes e historial, datos requeridos, permisos, bloqueos y rollback ([`migration-assessment.md`](../../ssot2026/docs/migration-assessment.md), puntos 12 a 22). Tampoco prueba la conversión de datos: una fila nueva no cambia el dump (tabla anterior), y la nota de migraciones ya advierte que probar en una base en blanco no alcanza si hay cambios de datos.

## Recomendación

**Esto es una recomendación, no un hecho verificado, y necesita tu decisión.**

1. **II.3:** cambiar la especificación de `pgsql-ast-parser` a `libpg-query`, en la misma versión que use el consumidor de migraciones. El validador vive fuera de `ssot2026` y recibe el catálogo por parámetro. Empezar con `SELECT` y CTE, porque `ssot2026` ya los usa.
2. **II.4:** usar `c8` con `--all` y un `.c8rc.json` por paquete, excluyendo los archivos solo de tipos. No usar la cobertura nativa mientras se esté en Node 24. Arreglar el `SIGTERM` de los tests antes de fijar cualquier umbral.
3. **II.2:** agregar un test que aplique el catálogo en una base vacía, construya la limpia, compare con `pg-dump-compare --canonical -oti` y falle ante cualquier diferencia. `-oti` deja el orden de columnas fuera; me parece bien porque el backend usa nombres de columna, pero conviene confirmarlo.
4. **Antes de todo:** resolver las alertas 1 y 2. Sin el consumidor en el repo, `ssot2026` no compila.

## Sin confirmar

- Si `refactor/migrations-full` en `33524072` es el commit exacto que corresponde a nuestra copia de `ssot2026`.
- Si la gramática de 18.4 acepta todo lo de 18.6. No corrí la suite de regresión de PostgreSQL contra el parser.
- `libpg-query` en Windows: la documentación dice que funciona, pero no lo probé.
- La causa del reporte vacío con `--test-coverage-include`, y si ocurre en otras versiones de Node 24.
- Cómo medir la cobertura del código que corre en el navegador.
- Si el orden de `pg_dump` se mantiene con funciones y vistas que dependen entre sí. En `ssot2026` hoy las bases se crearon en distinto orden y solo difirió el orden de columnas, pero el esquema no tiene ese tipo de dependencias. La documentación de `pg_dump` no promete un orden estable.
- `--exclude-schema=ssot_migrations` como alternativa a `--schema=ssot`.
- Si `padel/` va a necesitar triggers o `EXCLUDE`, porque `padel/` todavía no existe.
- El prototipo solo cubre la regla central. No validé con él las consultas reales de `ssot2026`: solo comprobé que se parsean.
