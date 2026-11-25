# Decisiones pendientes para el grupo

Pertenece al [Mapa: plataforma de pádel](https://github.com/fdllrs/taller_db/issues/2).

## Ya decididas (2026-11-25)

Se aceptaron las 6 recomendaciones:

1. **Clave de Club:** un código corto, asignado por el Administrador y que no cambia nunca.
2. **Partida:** una tabla propia, con la misma clave que su Reserva. El cupo de 4 lo controla el Procedimiento de unirse.
3. **Cancelar:** borra las filas de la Reserva y no queda historial.
4. **Lista de entidades:** se aprobó tal como estaba. Ver [Entidades y claves del SSOT de pádel](https://github.com/fdllrs/taller_db/issues/10).
5. **CRUD genérico:** queda solo para Administradores. Clubes y Jugadores usan Procedimientos. Ver [ADR 0006](adr/0006-crud-generico-solo-administradores.md).
6. **`api-contract.ts`:** pasa a genéricos estrictos, sin `any`.

## Pendientes: Agenda visual del Front de Clubes ([ticket](https://github.com/fdllrs/taller_db/issues/15))

Primero se arma un prototipo rápido de la agenda de un día, con una columna por Cancha. Con el prototipo a la vista, el grupo decide:

7. **Dirección visual:** colores, tipografía y densidad. El Front de Jugadores usa la misma.
8. **Framework:** si alcanza con TypeScript sin framework o si conviene uno liviano.
