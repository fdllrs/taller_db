# `ssot2026` es una copia propia del repo y recibe las entidades por parámetro

La API de `ssot2026` lee sus entidades de un archivo fijo (`src/backend/system.ts`), y la Parte III de los principios prohíbe poner dominio de pádel adentro. Decidimos cambiar nuestra copia una vez, para que el backend reciba las entidades por parámetro, y que `padel/` la use como dependencia (`file:../ssot2026`). No mandamos PRs al repo original: aceptamos que las copias diverjan a cambio de no depender de otro equipo. Todo cambio en `ssot2026/` sigue siendo una capacidad genérica, sin nada de pádel.

## Considered Options

- Copiar SSOT dentro de `padel/` y reemplazar `system.ts`: es lo más rápido, pero deja dos copias del mismo código.
- Usar SSOT solo como referencia y escribir otra API: es lo que más trabajo da y no reutiliza nada.
