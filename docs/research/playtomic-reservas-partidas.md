# Cómo funcionan las Reservas y Partidas en Playtomic

Investigación del issue #4 (mapa #2), como referencia para los tickets #7 y #8. Consultado el 2026-11-04. Pagos, niveles, torneos y clases quedan fuera, salvo cuando hacen falta para entender quién responde por una Partida.

## Respuesta corta

- **Playtomic separa la Partida de la ocupación de la Cancha.** Crear una Partida no reserva la Cancha: se reserva sola según cuántos Jugadores haya y cuánto falte. Es la diferencia más grande con nuestro mapa, donde toda Partida tiene su propia Reserva.
- **Las Reservas siguen reglas de cada Club** (duraciones, alineación, anticipación, plazo de cancelación). **Las Partidas siguen reglas de Playtomic** (cupo de 4 en dobles, 24 horas si está llena, cancelación automática una hora antes).
- **Si una Partida abierta no se completa, nadie responde:** se cancela y se devuelve el dinero. Si nació como Reserva privada y se convirtió, responde su titular.

## Cómo leer este documento

**Calidad de las fuentes.** Los dos centros de ayuda oficiales (`playerhelp.playtomic.com` y `helpmanager.playtomic.com`) respondieron HTTP 403 a la lectura directa, así que hay dos niveles de evidencia:

- **[L] Leído:** bajé y leí la página oficial. Solo aplica a las condiciones legales y a una página pública de Club.
- **[E] Extracto:** conozco el artículo oficial solo por lo que devolvió el buscador web, no por haberlo abierto. Las citas textuales vienen de ese extracto, no las pude cotejar con la página completa y puede faltar contexto. El buscador tampoco siempre indicó de qué artículo salía cada pasaje, así que algunos enlaces [E] son mi mejor atribución entre los resultados que devolvió.

**Vocabulario.** "Open match" o "public match" se traduce como Partida; "private booking" como Reserva privada; "court" como Cancha. La correspondencia no es exacta: en Playtomic una Partida puede existir sin Cancha asignada. "Titular" es el "owner" de una Reserva.

## Documentado

### Duración y alineación de horarios

- [E] Cada Club elige una o varias duraciones; las más comunes son 60, 90 y 120 minutos. [Availability: Fixed & Flexible reservations](https://helpmanager.playtomic.com/hc/en-gb/articles/20535323617425-Availability-Fixed-Flexible-reservations)
- [E] Los horarios de inicio dependen de una regla que configura el Club, con tres variantes ([mismo artículo](https://helpmanager.playtomic.com/hc/en-gb/articles/20535323617425-Availability-Fixed-Flexible-reservations)):

| Regla | Comportamiento | Ejemplo del artículo |
|---|---|---|
| Fixed | Inicios consecutivos desde la apertura. Solo debe usarse con una duración. | 90 minutos de 8:00 a 14:00: 8:00, 9:30, 11:00, 12:30 |
| Flexible, Avoid Unbookable Time | Ubica los inicios para no dejar huecos que no se puedan reservar. | Apertura 9:00 con 60 y 90 minutos: 9:00, 10:00, 10:30, pero no 9:30 |
| Flexible, Allow Unbookable Time | Inicios cada 30 minutos para cualquier duración. Da más opciones, pero puede dejar huecos. | |

- [E] Con Fixed y con Avoid, un horario solo aparece si la Reserva entera entra antes de que termine la regla. [Mismo artículo](https://helpmanager.playtomic.com/hc/en-gb/articles/20535323617425-Availability-Fixed-Flexible-reservations)
- [E] El artículo sugiere combinar reglas por parte del día: Allow en horas tranquilas (10:00 a 15:00) y Avoid en horas pico (15:00 a 22:30). [Mismo artículo](https://helpmanager.playtomic.com/hc/en-gb/articles/20535323617425-Availability-Fixed-Flexible-reservations)
- [E] Después de medianoche, el sistema no lee bien los horarios con tramos de 90 minutos; Playtomic recomienda rangos de precio separados. [Setting the time reservation after midnight](https://helpmanager.playtomic.com/hc/en-gb/articles/20535206048913-Setting-the-time-reservation-after-midnight)
- [E] Una Partida dura 90 minutos por defecto, y baja a 60 solo si la disponibilidad no permite más: "the default duration is 90 minutes. It shortens to 60 minutes only if availability allows 60 minutes only". [How to configure Open Matches](https://helpmanager.playtomic.com/hc/en-gb/articles/20535035123473-How-to-configure-Open-Matches-at-your-Club)
- [E] Al reservar, el Jugador elige ubicación, fecha y hora, y después Cancha y duración. [How to make a reservation](https://playerhelp.playtomic.com/hc/en-gb/articles/19831881490449-How-to-make-a-reservation-in-Playtomic-app)

### Anticipación máxima

- [E] La fija cada Club en días, con el ajuste "Book Ahead Limit" (Settings > Venue > Booking). No encontré un valor por defecto. [Reservation rules](https://helpmanager.playtomic.com/hc/en-gb/articles/20535321953297-Reservation-rules)
- [E] El mismo artículo incluye un tope de Reservas futuras activas por Jugador; vacío significa sin límite. [Reservation rules](https://helpmanager.playtomic.com/hc/en-gb/articles/20535321953297-Reservation-rules)
- [E] La versión alemana agrega un tope de Reservas por día, que la inglesa no menciona. [Reservierungsregeln](https://helpmanager.playtomic.com/hc/de/articles/20535321953297-Reservierungsregeln)
- [L] Ejemplo real de un Club: con membresía, 14 días de anticipación y hasta 5 Reservas; sin membresía, 3 días y hasta 2. Los datos de la página incluyen `days_of_booking_ahead`, `max_number_of_active_bookings` y `max_number_of_bookings_per_day`. [Padel X Miami](https://playtomic.com/clubs/padel-x-miami)

### Cancelación de una Reserva

- [L] Cada Club define su política, visible al reservar. Vencido el plazo, el Jugador ya no puede cancelar y Playtomic no hace excepciones; solo puede hacerlas el Club. [Condiciones legales, sección 9](https://playtomic.com/legal-conditions)
- [L] El Club puede cancelar una Reserva por su cuenta sin avisar: "Clubs can cancel unilaterally a reservation without prior notification to the user". [Condiciones legales, sección 9](https://playtomic.com/legal-conditions)
- [L] Un servicio ya usado no se puede cancelar. [Condiciones legales, sección 9](https://playtomic.com/legal-conditions)
- [E] El plazo se configura en horas ("Cancellation Time"). [Reservation rules](https://helpmanager.playtomic.com/hc/en-gb/articles/20535321953297-Reservation-rules) Hay Clubes que permiten cancelar siempre, otros con un día de aviso y otros que no lo permiten. [FAQ Players](https://playerhelp.playtomic.com/hc/en-gb/articles/19831519179281-FAQ-Players-Playtomic)
- [L] Ejemplo real: 12 horas con membresía y 24 sin ella. [Padel X Miami](https://playtomic.com/clubs/padel-x-miami)
- [E] El titular cancela la Reserva entera y se les devuelve el dinero a todos; no puede quitarse a sí mismo. [How to remove players from a reservation](https://playerhelp.playtomic.com/hc/en-gb/articles/19831783889425-How-to-remove-players-from-a-reservation)
- [E] Una vez hecha la Reserva, el Jugador no puede cambiarla desde la app. [How to modify a reservation](https://playerhelp.playtomic.com/hc/en-gb/articles/19832144958225-How-to-modify-a-reservation)
- [E] Una Reserva privada no se cancela sola aunque no se sume nadie. [Private Bookings vs Open Matches](https://playerhelp.playtomic.com/hc/en-gb/articles/19831958258193-Private-Bookings-vs-Open-Matches)

### Cupo de una Partida

- [E] Son 4 lugares en dobles: con menos de cuatro inscriptos el sistema cancela. "If all four players are not enrolled, the system automatically cancels and refunds the players". [Private Bookings vs Open Matches](https://playerhelp.playtomic.com/hc/en-gb/articles/19831958258193-Private-Bookings-vs-Open-Matches)
- [L] Un resultado solo vale si incluye a los cuatro Jugadores. [Condiciones legales, sección 4](https://playtomic.com/legal-conditions)
- [E] Un Club configura sus Partidas como dobles o singles. [How to configure Open Matches](https://helpmanager.playtomic.com/hc/en-gb/articles/20535035123473-How-to-configure-Open-Matches-at-your-Club)

### Crear una Partida y ocupar la Cancha

- [E] El Jugador crea la Partida y queda como primer inscripto; se publica para la comunidad. [How to book a court or a spot](https://playerhelp.playtomic.com/hc/en-gb/articles/19831715222929-How-to-book-a-court-or-a-spot-in-a-match-in-your-favourite-Club)
- [E] Crearla no reserva la Cancha: "A court is not reserved immediately when a player creates an Open Match". [How to configure Open Matches](https://helpmanager.playtomic.com/hc/en-gb/articles/20535035123473-How-to-configure-Open-Matches-at-your-Club)
- [E] La Cancha se reserva según estos umbrales ([Understanding When Open Matches Occupy Club Calendar Slots](https://helpmanager.playtomic.com/hc/en-gb/articles/20535700374929-Understanding-When-Open-Matches-Occupy-Club-Calendar-Slots)):

| Jugadores | ¿Se reserva la Cancha? |
|---|---|
| 1 | Nunca. En algunos países, se mantiene reservada hasta 48 horas antes. |
| 2 | Solo si faltan más de 12 horas |
| 3 | Solo si faltan más de 4 horas |
| 4 | Siempre, de inmediato, y la Partida queda confirmada |

- [E] La lista de países con la excepción de 1 Jugador incluye Reino Unido, Francia, México, Chile, Colombia y Brasil, entre otros. En el extracto no aparecen Argentina ni España. [Mismo artículo](https://helpmanager.playtomic.com/hc/en-gb/articles/20535700374929-Understanding-When-Open-Matches-Occupy-Club-Calendar-Slots)
- [E] Si no se cumple el umbral, la Cancha se libera, pero la Partida sigue visible y se puede unir gente. [Mismo artículo](https://helpmanager.playtomic.com/hc/en-gb/articles/20535700374929-Understanding-When-Open-Matches-Occupy-Club-Calendar-Slots)
- [E] La Partida se cancela sola si no queda Cancha libre en ese horario, por ejemplo porque otra Partida se llenó primero o alguien hizo una Reserva privada. [Mismo artículo](https://helpmanager.playtomic.com/hc/en-gb/articles/20535700374929-Understanding-When-Open-Matches-Occupy-Club-Calendar-Slots) Las condiciones legales también contemplan la cancelación automática por "insufficient players or unavailable courts". [L] [Sección 7](https://playtomic.com/legal-conditions)

### Cómo se une un Jugador

- [E] Busca desde "Find a match" por deporte, lugar y hora, o desde la pestaña de Partidas del Club. Necesita cuenta y se une solo, sin equipo. [How to sign up for an Open Match](https://playerhelp.playtomic.com/hc/en-gb/articles/19832151055121-How-to-sign-up-for-an-Open-Match)
- [E] Para unirse con un compañero necesita al menos 2 lugares libres. [Add My Partner](https://playerhelp.playtomic.com/hc/en-gb/articles/19831380139793-Add-My-Partner)
- [E] Para unirse hay que pagar online, y el lugar se confirma con el pago. [How to sign up for an Open Match](https://playerhelp.playtomic.com/hc/en-gb/articles/19832151055121-How-to-sign-up-for-an-Open-Match)
- [E] La única aprobación que encontré es para el Jugador con nivel fuera del rango: pide lugar y deben aceptarlo todos los inscriptos. [How to request a spot](https://playerhelp.playtomic.com/hc/en-gb/articles/19832027031569-How-to-request-a-spot-in-a-open-match)
- [E] El Club también puede agregar Jugadores desde su agenda. [How to add/remove players](https://helpmanager.playtomic.com/hc/en-gb/articles/20535085001361-How-to-add-remove-players-in-an-Open-Match)

### Cómo se va un Jugador

- [E] Si la Partida no está llena, puede irse en cualquier momento antes del inicio. Si está llena, hasta 24 horas antes. [Cancellation Policy for Open Matches](https://playerhelp.playtomic.com/hc/en-gb/articles/19831672824465-Cancellation-Policy-for-Open-Matches-Padel-Tennis)
- [E] Dentro de esas 24 horas, solo el Club puede sacarlo o resolver un reemplazo: "Playtomic can't cancel a spot in a open match, only the Club can do it". [Misma política](https://playerhelp.playtomic.com/hc/en-gb/articles/19831672824465-Cancellation-Policy-for-Open-Matches-Padel-Tennis)
- [E] El Club puede quitar Jugadores, incluso pasado ese plazo. [How to add/remove players](https://helpmanager.playtomic.com/hc/en-gb/articles/20535085001361-How-to-add-remove-players-in-an-Open-Match)
- [L] No presentarse activa el procedimiento "No-Show", que también alcanza a quien llega 10 minutos tarde o más, se va 10 minutos antes o más, se retira antes de los 90 minutos de juego, avisa una lesión antes de empezar o es reemplazado. No se aplica si hay un resultado final cargado, si la lesión ocurre durante la Partida o si el problema es de la Cancha o las instalaciones. [Condiciones legales, sección 4](https://playtomic.com/legal-conditions)
- [L] Si alguien llega tarde, el grupo elige entre esperar y jugar, sin devolución, o declarar No-Show. [Condiciones legales, sección 4](https://playtomic.com/legal-conditions)

### Quién responde si la Partida no se completa

| Caso | Qué pasa | Quién responde | Fuente |
|---|---|---|---|
| Partida abierta con 1 a 3 Jugadores, una hora antes | Se cancela sola y se devuelve el dinero | Nadie | [E] [How to add/remove players](https://helpmanager.playtomic.com/hc/en-gb/articles/20535085001361-How-to-add-remove-players-in-an-Open-Match), [Private Bookings vs Open Matches](https://playerhelp.playtomic.com/hc/en-gb/articles/19831958258193-Private-Bookings-vs-Open-Matches) |
| Reserva privada convertida en Partida | No se cancela. A la hora de jugar se cobran los lugares vacíos, y a quienes se sumaron se les devuelve el dinero 2 horas después del horario previsto | El titular | [E] [How to convert a Private Booking](https://playerhelp.playtomic.com/hc/en-gb/articles/39545442764945-How-to-convert-a-Private-Booking-to-a-Public-Match) |
| Partida con Cancha asignada a mano por el Club | No se cancela sola | No documentado | [E] [How to manually book a court](https://helpmanager.playtomic.com/hc/en-gb/articles/20535050634769-How-to-manually-book-a-court-for-a-Open-Match) |
| Partida con un Jugador ausente | Se devuelve el dinero a los presentes y se le cobra al ausente | El ausente | [L] [Condiciones legales, sección 4](https://playtomic.com/legal-conditions) |

- [E] Además, el ausente queda con una deuda que debe pagar para seguir usando la app, y el resultado de la Partida se anula. [What happens if a player doesn't show up?](https://playerhelp.playtomic.com/hc/en-gb/articles/43240624037393-What-happens-if-a-player-doesn-t-show-up)
- [E] Convertir es irreversible, y solo se puede si todos los invitados tienen cuenta, nivel y pagaron su parte. Después de convertir, el titular no puede cancelar sin pagar la Cancha, y faltando menos de 24 horas para una Partida llena no puede irse nadie. [How to convert a Private Booking](https://playerhelp.playtomic.com/hc/en-gb/articles/39545442764945-How-to-convert-a-Private-Booking-to-a-Public-Match)
- [E] El Club puede aprobar a mano la cancelación de una Reserva convertida. [Convert a private booking into an open match](https://helpmanager.playtomic.com/hc/en-gb/articles/46236279793425-Convert-a-private-booking-into-an-open-match)

### Qué ve un Club en su agenda

- [E] Cada entrada de Reserva o Partida en la agenda muestra el título o, si no tiene, el nombre del titular, las horas de inicio y fin, una marca de pago y un punto si hay notas. Al pasar el cursor se ve estado de pago, precio y notas. [Schedule basics](https://helpmanager.playtomic.com/hc/en-gb/articles/20560058451985-Schedule-basics)
- [E] Los colores van por tipo de evento (Reserva, Partida, clase), no por Jugador. Buscar a un Jugador por nombre resalta sus Reservas y deja el resto en gris. [Schedule basics](https://helpmanager.playtomic.com/hc/en-gb/articles/20560058451985-Schedule-basics)
- [E] Una Partida ocupa la agenda solo mientras tiene la Cancha reservada; sin ella, sigue en la lista de Partidas. [Understanding When Open Matches Occupy Club Calendar Slots](https://helpmanager.playtomic.com/hc/en-gb/articles/20535700374929-Understanding-When-Open-Matches-Occupy-Club-Calendar-Slots)
- [E] Esa lista está en la sección Matches y se filtra por Club, tipo, estado y tipo de Cancha. [How to manage Open Matches](https://helpmanager.playtomic.com/hc/en-gb/articles/20534737902353-How-to-manage-Open-Matches-in-Playtomic-Manager)
- [E] Desde la agenda el Club abre una Partida, agrega o quita Jugadores y la arrastra a otra Cancha. [How to add/remove players](https://helpmanager.playtomic.com/hc/en-gb/articles/20535085001361-How-to-add-remove-players-in-an-Open-Match), [How to manually book a court](https://helpmanager.playtomic.com/hc/en-gb/articles/20535050634769-How-to-manually-book-a-court-for-a-Open-Match)
- [E] En una Reserva puede extender la duración arrastrando, moverla de fecha y Cancha, y cancelarla; al titular no lo puede quitar. [General Rules to modify a reservation](https://helpmanager.playtomic.com/hc/en-gb/articles/20534894210833-General-Rules-to-modify-a-reservation), [How to cancel a reservation](https://helpmanager.playtomic.com/hc/en-gb/articles/20535256445969-How-to-cancel-a-reservation)
- [E] Si el Club cancela una Partida, sale de la agenda pero vuelve a su lista de Partidas. [How to cancel an Open Match](https://helpmanager.playtomic.com/hc/en-gb/articles/20535128515601-How-to-cancel-an-Open-Match)

## Inferido

Estas conclusiones son mías; ninguna fuente las afirma así.

1. **El reparto de reglas sigue a quien asume el costo.** Lo que afecta al negocio del Club (duración, anticipación, plazo) lo decide el Club. Lo que afecta a la coordinación entre Jugadores desconocidos lo fija Playtomic.
2. **Los umbrales de 12 y 4 horas protegen la ocupación del Club.** Una Partida con poca gente y poco margen no bloquea la Cancha, y una Reserva privada puede ganarle el lugar.
3. **El plazo de 24 horas protege a los otros tres Jugadores.** Por eso aplica solo a la Partida llena: una que no está llena todavía puede cancelarse sin perjudicar a nadie.
4. **En singles, el cupo probablemente sea 2.** Lo sugiere la existencia del formato, pero los extractos solo hablan de cuatro.
5. **La parte de "quién responde" no se puede copiar tal cual.** En Playtomic se resuelve cobrando online, y nuestro mapa deja los pagos fuera porque se paga en el Club. Sin cobro, una consecuencia como "se le cobra al ausente" necesita otro mecanismo.
6. **"Toda Partida tiene su propia Reserva" es un apartamiento de Playtomic.** Con nuestra regla, la Cancha queda ocupada desde que se crea la Partida, algo que Playtomic evita salvo en los países de la excepción, y aun ahí solo hasta 48 horas antes. Esto aparece como pregunta abierta para #8 y no es una recomendación.
7. **La regla Allow de Playtomic equivale a nuestro Bloque de 30 minutos**, aunque allí sea una opción del Club y no una unidad del sistema.

## Qué no pude confirmar

**Páginas que no pude leer:**

- Respondieron 403 a la lectura directa: todos los artículos que probé de `playerhelp.playtomic.com` y `helpmanager.playtomic.com`. No reintenté el resto de esos sitios ni falseé el cliente. Todo lo marcado [E] depende de esto.
- Respondieron 404: `https://playtomic.com/terms-and-conditions` y los artículos de `intercom.help/getplaytomic` que probé.
- No resolvieron por DNS: `help.playtomic.com` y `blog.playtomic.io`, aunque el buscador los lista. El post de blog sobre cancelación de Partidas quedó sin leer.
- No se pudo usar `web.archive.org` como alternativa.
- De [No-Show Policy for Open Matches: what clubs need to know](https://helpmanager.playtomic.com/hc/en-gb/articles/50702064570513-No-Show-Policy-for-Open-Matches-what-clubs-need-to-know) solo vi el título.

**Contradicciones entre fuentes:**

- **Irse de una Partida no llena.** La [política para Jugadores](https://playerhelp.playtomic.com/hc/en-gb/articles/19831672824465-Cancellation-Policy-for-Open-Matches-Padel-Tennis) dice que se puede en cualquier momento. El [artículo sobre ausencias](https://playerhelp.playtomic.com/hc/en-gb/articles/43240624037393-What-happens-if-a-player-doesn-t-show-up) y el de [cómo cancelar una Partida](https://helpmanager.playtomic.com/hc/en-gb/articles/20535128515601-How-to-cancel-an-Open-Match) hablan de 24 horas sin distinguir. Tomé como válida la política para Jugadores por ser la más específica, pero no está verificado.
- **Hora de la cancelación automática.** [Un artículo](https://helpmanager.playtomic.com/hc/en-gb/articles/20535700374929-Understanding-When-Open-Matches-Occupy-Club-Calendar-Slots) dice "alrededor de" una hora antes y [otro](https://helpmanager.playtomic.com/hc/en-gb/articles/20535085001361-How-to-add-remove-players-in-an-Open-Match), una hora exacta.
- **Partidas de 60 minutos y No-Show.** Las condiciones legales penalizan retirarse antes de los 90 minutos de juego, pero existen Partidas de 60 minutos. No encontré cómo se resuelve.

**Sin dato en lo que pude ver:**

- Valores por defecto de la anticipación y del plazo de cancelación de un Club. Tampoco si la anticipación limita también a las Partidas.
- Duración máxima de una Reserva, y si puede haber duraciones que no sean múltiplos de 30 minutos.
- Quién responde por una Partida con Cancha asignada a mano por el Club que no se completa.
- Qué pasa cuando se va el creador de una Partida abierta. Solo está documentado para el titular de una Reserva privada o convertida.
- Si la entrada de una Partida en la agenda muestra todos los Jugadores o los lugares libres, y no solo el título o el titular.
- Qué pasa cuando dos Jugadores toman el último lugar al mismo tiempo (pedido en #8).
- Si un Club puede reservar para alguien sin cuenta (pedido en #7).
- Cómo se declaran los feriados en el horario de un Club (pedido en #7).
- Si la lista actual de países con excepción incluye a Argentina. El extracto no la nombra, pero no vi la página completa.
- Vigencia. Las condiciones legales no muestran fecha de actualización (solo "© 2010-2026"), y según el buscador algunos artículos tienen cerca de 750 días y otros 34, así que el producto actual puede diferir.

**Tampoco se verificó:** no usé la app ni Playtomic Manager, y las páginas de Club que abrí no mostraron horarios reservables (indicaban "No slots available" o "Loading…"). Ningún comportamiento se comprobó en el producto.
