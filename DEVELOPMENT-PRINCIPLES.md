# Principios y Estándares de Desarrollo

> Estos estándares deben seguirse de manera estricta durante el desarrollo del sistema sin excepción. Cualquier decisión de diseño o implementación que se aparte de estos principios debe evitarse o, como mínimo, someterse a discusión y acuerdo previo.

El proyecto se rige por tres pilares fundamentales:
1. **Principios del Framework `system-definition`**: Enfocados en la capa descriptiva del SSOT (*Single Source of Truth*), el sistema de tipos en TypeScript, la serializabilidad y la separación entre definición y comportamiento.
2. **Principios de Arquitectura, Modelado y Metodología (`ideas/`)**: Enfocados en el diseño relacional de bases de datos (claves naturales, normalización), validación de SQL, verificación de migraciones y experiencia de usuario (UI isomórfica/grillas).
3. **Desacoplamiento y Uso del Proyecto SSOT (`ssot2026`) como Framework DBA**: Criterio de uso de `ssot2026` como framework general de DBA para nuestra aplicación, manteniendo el dominio del negocio totalmente aislado.

---

## Parte I: Principios del Framework `system-definition` (SSOT Descriptivo)

### 1. Fuente Única de Verdad (SSOT - Single Source of Truth)
- **Definición centralizada**: Toda entidad, tipo de dominio, campo, relación y procedimiento se describe en un único lugar formal, fuertemente tipado. De esa definición se derivan automáticamente las tablas SQL, validadores, endpoints CRUD, interfaces de usuario y serializadores.
- **Evitar la reimplementación de la verdad**: Lógicas operativas de dominio (como `deserialize` de una fecha o chequeos de tipo) no deben reescribirse de forma aislada en backend, frontend o base de datos. Si se reescribe afuera, deja de ser una fuente única.

### 2. Separación Estricta entre Descripción y Comportamiento
- **Las descripciones NO llevan funciones**: Las definiciones (`TypeDef`, `RecordDef`, `EntityDef`) son valores puros, fuertemente tipados y **serializables a JSON plano**.
- **El comportamiento reside en el contexto**: Las funciones operativas (`deserialize`, `serialize`, `check`, `parse`, `format`, completadores) viven en los contextos del sistema (`SystemTypeContext`, `SystemEntityContext`), nunca embebidas dentro de las estructuras de descripción.

### 3. Convención Dual `XxxDef` vs `XxxInfo`
- **`XxxDef` (Definition)**: Lo que escribe el desarrollador. Contiene exclusivamente el mínimo con significado semántico; cualquier atributo con un valor por defecto sensato se omite.
- **`XxxInfo`**: Lo que produce el framework al completar la `Def` con sus valores por defecto. Es totalmente explícito, determinístico y serializable; es la estructura que consumen los generadores y herramientas.
- **Autocontención**: La `Def` en mapas no repite su clave; la `Info` incluye su propio `name` para poder serializarse como array y reindexarse en cualquier plataforma sin depender del orden de claves en JSON.

### 4. Metodología TDD y Rigor en Tipos
- **TDD en pasos cortos (*baby steps*)**: Primero se escribe el test que falla o evidencia la necesidad; luego la implementación mínima.
- **Tests de tipos bidireccionales**: Se valida la asignabilidad en ambos sentidos (que el tipo obtenido y el esperado sean mutuamente asignables).
- **Criterio estricto de `@ts-expect-error`**:
  - Prohibido en código productivo (`src` y `examples`).
  - En tests se reserva para validar llamadas inválidas o literales rechazados. Una sola construcción por línea marcada para no tapar errores colaterales.
  - Para relaciones de tipos estáticos se prefieren helpers (ej. `IsAssignable<A, B>`) antes que directivas que silencien el compilador.

### 5. Tipado Estricto de Punta a Punta (Cero `any`)
- **Preservación estática/dinámica**: Del valor en runtime de una definición se deduce automáticamente el tipo TypeScript en compilación (`RecordInstanceType`, `EntityInstanceType`) sin duplicar definiciones de campos.
- **Validación en tiempo de compilación**: Claves foráneas, claves primarias y campos inexistentes se controlan en el sistema de tipos.
- **Sin parámetros de tipo con defaults silenciosos**: Todo requiere su contexto explícito; si no se especifica contra qué contexto se define una estructura, no compila.

### 6. Pares de Conversión: Máquina vs. Humano
- **Máquina (`deserialize` / `serialize`)**: Determinístico, estricto, unívoco e insensible a idioma/locale (para URLs, bases de datos, APIs y JSON).
- **Humano (`parse` / `format`)**: Orientado a la interacción con personas; recibe el `locale` por parámetro (manejo de formatos de fecha, puntuación de miles/decimales).
- **Conversión temprana**: La entrada externa se valida y convierte en el punto de ingreso; el resto del sistema opera únicamente con valores tipados de dominio.

### 7. Composición y No Repetición de Claves
- **Redundancia lineal controlada**: Permitir el doble chequeo entre definición y fuente (1 a 1), pero evitar copias N-arias.
- **Herencia tipada de claves**: Se utilizan utilitarios como `extractPk` (para heredar claves primarias entre entidades vía spread) y `mergePk` (para combinar claves compuestas deduplicando campos a nivel de valor y de tipos).

### 8. Convenciones de Nomenclatura
- **No diferenciar identificadores solo por *case***: Para evitar colisiones en entornos *case-insensitive* (Windows, SQL, etc.), no usar funciones como `entityDef` junto al tipo `EntityDef`; usar verbos como `defineEntity` y `defineRecord`.
- **Código en inglés, documentación en castellano**.
- **Entidades en plural, registros en singular** (ej. entidad `docentes`, registro `docente`).

---

## Parte II: Principios de Arquitectura, Modelado y Metodología (Directorio `ideas/`)

### 1. Modelado de Datos y Claves Primarias (`no-usar-auto-id.md`, `como-elegir-pk.md`)
- **Priorizar Claves Naturales sobre IDs Autonuméricos**:
  - Siempre que exista un dato o conjunto de datos del dominio que identifique unívocamente a una entidad (ej. código ISO de país, CUIT, código de materia, legajo), debe usarse como clave primaria.
  - Introducir un `id` sintético añade una clave candidata redundante, complica el modelo y oculta la semántica de negocio.
  - Las claves naturales facilitan la integración ágil, la consolidación de bases distribuidas/sucursales, la escritura directa de fixtures/pruebas y la inspección directa de datos sin joins innecesarios.
- **Claves Compuestas y Jerarquías**:
  - Modelar relaciones de pertenencia usando claves primarias compuestas (ej. `[pais, provincia]`, `[factura, nro_renglon]`, `[profesor, materia]`).
  - Permite filtrar y particionar datos respetando la jerarquía (seguridad por filas, multi-tenancy) sin violar la Tercera Forma Normal (evita desnormalizar agregando IDs artificiales redundantes).
- **Requisitos de una Clave Primaria**:
  1. Inconcebible que se repita (en el presente y en el futuro).
  2. Obligatoria (todos los registros deben poseerla).
  3. Conocida al momento de la inserción.
  4. Inmutable a lo largo del tiempo.
- **Claves Artificiales como Excepción**:
  - Solo se utilizan cuando es imposible hallar una clave natural viable.
  - Preferir secuencias ordenadas o secuencias estrictas por renglón/agrupador en tablas dependientes.

### 2. Mantenimiento y Migración de la Estructura de BD (`mantener-actualizada-estructura-db.md`)
- **Estructura Declarada en Código**: Toda la definición de tablas, restricciones, vistas y procedimientos se define dentro del código fuente de la aplicación.
- **Verificación Automática de Migraciones**:
  - Al evolucionar la base de datos de una versión a otra, no alcanza con asumir que los scripts de migración son correctos.
  - Se debe verificar automáticamente que:
    1. Se genera la base en una versión previa $N$.
    2. Se aplican los scripts de actualización hacia $N+1$.
    3. Se extrae el dump resultante y se compara contra el dump de una base creada limpiamente desde cero en $N+1$.
  - Si hay discrepancias estructurales, el sistema debe alertar y bloquear el release.
  - Versionar mediante tags de git y verificar las migraciones durante el ciclo de desarrollo continuo.

### 3. Validación Estricta de Sentencias SQL (`constructed-sql-validator.md`)
- **Regla Central de JOINs por PK**:
  - En cualquier `INNER JOIN` o `LEFT JOIN`, la condición `ON` (o `USING`) debe cubrir la clave primaria completa (o `UNIQUE NOT NULL`) de al menos uno de los dos lados que participan del join.
  - Un join que no cubre la PK de ningún lado produce multiplicación no controlada de cardinalidad (casi siempre un bug).
- **Directivas Explícitas de Excepción**:
  - Si intencionalmente se realiza un join no-PK o un producto cartesiano, debe documentarse en SQL con una directiva explícita (ej. `/* allow-join-no-pk "razón" */`, `/* allow-cross-join "razón" */`) y declarar la nueva clave resultante (`/* new-pk col1, col2 */`).
- **Validación Previa a la Ejecución**: Validar las consultas SQL construidas mediante análisis de AST antes de enviarlas al motor de base de datos.

### 4. Metodología de Ingeniería de Software Codenautas (`codenautificación.md`)
- **Cambios en fases y humanamente revisables**: Diffs atómicos, claros y testeados. No realizar reformateos masivos ni cambios de estilo arbitrarios que enturbien la revisión.
- **No fallar en silencio (*Fail Fast*)**: Prohibido el uso de bloques `catch` vacíos, promesas sin capturar o ignorar errores. Todo error debe propagarse o reportarse con claridad.
- **Verificación empírica real**: Toda funcionalidad y corrección debe validarse ejecutando tests reales con métricas de cobertura (apuntando al 100% en lógica crítica).
- **Contradicciones = detenerse y alertar**: Ante inconsistencias entre herramientas, documentación o comportamientos inesperados, no improvisar parches ciegos ni *workarounds* ocultos; detenerse, diagnosticar y advertir.

### 5. Experiencia de Usuario y Modelo Isomórfico SSOTIGAD (`SSOTIGAD.md`, `SSOTIGAD-details/`)
- **Minimizar Repetición Técnica**: Los conceptos de negocio se declaran el mínimo número de veces necesarias. Mappers, DTOs y validadores redundantes quedan prohibidos si pueden derivarse.
- **Campos `isName` e `inComboBox`**:
  - Cada código de entidad define su descriptor legible (`isName`). Toda grilla o combo que referencie ese código muestra automáticamente dicho nombre.
  - Los campos referenciados por FK se renderizan automáticamente como combo-boxes tipeables con autocompletado y filtrado dependiente en claves compuestas.
- **Navegación tipo Planilla de Cálculo**: Grillas con edición inline, desplazamiento por teclado (flechas, Tab, Enter) y URLs con estado completo preservado (filtros, orden, foco de fila y columna).
- **Widget Único de Navegación**: Todos los elementos que cambian de pantalla (botones, ítems de menú, acciones de fila) comparten un comportamiento uniforme (navegación fluida y apertura garantizada en nueva pestaña con Ctrl+click).

---

## Parte III: Desacoplamiento y Uso del Proyecto SSOT (`ssot2026`) como Framework DBA

### 1. `ssot2026` como Framework y Herramienta DBA
- Se debe utilizar el proyecto `ssot2026` como framework de referencia y como la herramienta de administración de bases de datos (DBA) para la aplicación (generación y evaluación de esquemas, migraciones, CRUD genérico e inspección visual de datos).

### 2. Desacoplamiento Total de la Lógica de Negocio
- El desarrollo de nuestra aplicación (plataforma de pádel: reservas, canchas, jugadores, clubes, etc.) debe mantenerse **totalmente desacoplado** de `ssot2026`.
- `ssot2026` es un proyecto generalizado para un DBA y **no debe editarse ni agregársele código propio** que rompa su cohesión. Está terminantemente prohibido incorporar dentro de `ssot2026` modelos de dominio, reglas de negocio o endpoints específicos de la aplicación de pádel.

### 3. Modificaciones a `ssot2026` bajo Enfoque Upstream / PR
- Cualquier funcionalidad o mejora que se necesite incorporar en `ssot2026` para construir nuestra aplicación debe concebirse estrictamente como una **capacidad genérica de DBA**, tratándola conceptualmente como si fuera un Pull Request (PR) destinado al proyecto base general `ssot2026`.
- **Aviso y acuerdo previo obligatorio**: Antes de realizar cualquier tipo de modificación o agregado dentro de `ssot2026`, es obligatorio **avisar y acordar previamente con el programador**.

---

## Matriz Comparativa: `system-definition` vs. `ideas/` vs. `ssot2026`

| Dimensión | Framework `system-definition` | Directorio `ideas/` (Codenautas / SSOTIGAD) | Framework `ssot2026` |
| :--- | :--- | :--- | :--- |
| **Foco principal** | **Vocabulario y tipado**: cómo describir entidades, tipos, registros y relaciones en TypeScript de forma serializable. | **Arquitectura y diseño**: cómo modelar el negocio, diseñar la BD, validar SQL y organizar el trabajo de ingeniería. | **Framework DBA**: motor de migraciones, evaluación de esquemas, CRUD de backoffice y UI de administración. |
| **Nivel de abstracción** | Capa descriptiva formal (código TypeScript, inferencia de tipos, serialización pura). | Modelo relacional, base de datos relacional, interacción de usuario y metodología de equipo. | Infraestructura de persistencia PostgreSQL, servidor backend y cliente de administración. |
| **Reglas sobre datos** | `XxxDef` vs `XxxInfo`, separación de descripción y contexto, tipado sin `any`. | Claves naturales compuestas, no usar autonuméricos, 3FN, verificación de dumps en migraciones. | Aislamiento de la lógica de negocio; exclusivo para tareas y componentes de DBA genéricos. |
| **Operación sobre consultas** | Especificación de entidades, campos y tipos derivados. | Validación de AST de SQL (`validateSql`), joins garantizados por PK (`constructed-sql-validator`). | Generación de DDL, mapeos de tipos SQL y ejecución de transacciones seguras. |
| **Forma de trabajo** | TDD guiado por asignabilidad de tipos y `@ts-expect-error` disciplinado. | Diffs chicos revisables, no fallar en silencio, `qa-control`, docs con `multilang`. | Modular, desacoplado; modificaciones requieren aviso previo y diseño como PR genérico. |
