# Plataforma de Pádel

Sistema multi-tenant para reservar canchas de pádel, organizar partidas entre jugadores y administrar clubes.

## Language

**Usuario**:
Cuenta de acceso de una persona registrada en la plataforma.
_Avoid_: Cuenta, cliente, credencial

**Administrador**:
Operador interno dueño de la plataforma con acceso global a todos los clubes y datos del sistema.
_Avoid_: Superusuario, dueño de app, root

**Club**:
Establecimiento deportivo (tenant) que agrupa un conjunto de canchas de pádel y administra su disponibilidad.
_Avoid_: Sede, complejo, organización, tenant

**Encargado de Club**:
Persona vinculada a un Club que gestiona sus canchas y reservas.
_Avoid_: Dueño de cancha, operador de club, cancha (como rol)

**Cancha**:
Pista física individual de pádel perteneciente a un Club.
_Avoid_: Pista, court, terreno

**Jugador**:
Persona que busca disponibilidad, reserva canchas, crea partidas o se une a partidas existentes para jugar al pádel.
_Avoid_: Cliente, deportista, participante
