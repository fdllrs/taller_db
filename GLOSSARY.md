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

**Bloque**:
Unidad mínima de tiempo de una Cancha: 30 minutos.
_Avoid_: Slot, franja

**Reserva**:
Ocupación de una Cancha durante dos o más Bloques consecutivos.
_Avoid_: Booking, alquiler

**Partida**:
Encuentro de pádel que un Jugador crea sobre una Reserva y al que otros Jugadores pueden unirse.
_Avoid_: Partido, match, juego

**Procedimiento**:
Operación del dominio con parámetros propios que hace más que guardar una fila, como reservar o unirse a una Partida.
_Avoid_: Endpoint custom, acción, función de negocio

### Frontends

**Front de Jugadores**:
Interfaz con la que un Jugador se registra, busca Clubes, Canchas y Partidas, reserva y se une a Partidas.
_Avoid_: Front de usuario, app de usuario

**Front de Clubes**:
Interfaz con la que un Encargado de Club gestiona las Canchas y Reservas de sus Clubes.
_Avoid_: Front de cancha, panel de cancha

**Front de Administración**:
Interfaz con la que un Administrador opera sobre todos los datos de la plataforma.
_Avoid_: Backoffice, front de SSOT
