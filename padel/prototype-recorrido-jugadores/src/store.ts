// Store en memoria + un stub por Procedimiento (lado Jugador). Sin persistencia.
export const AHORA = { fecha: "2026-11-25", min: 10 * 60 }; // miércoles 10:00 fijo
export const USUARIOS = ["Martina Ibarra", "Joaquín Sosa", "Lucía Ferreyra"];
export const LOCALIDADES = [
  { localidad: "Palermo", provincia: "CABA" }, { localidad: "Belgrano", provincia: "CABA" },
  { localidad: "Vicente López", provincia: "Buenos Aires" },
];
export interface Club { codigo: string; nombre: string; provincia: string; localidad: string; canchas: string[]; horario: ([number, number] | null)[] } // horario[0] = domingo, en minutos
export interface Reserva { club: string; cancha: string; fecha: string; hora: string; bloques: number; titular: string }
export interface Partida { clave: string; creador: string; jugadores: string[] }
export type Bloque = { hora: string; libre: boolean };

export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const toMin = (h: string) => +h.slice(0, 2) * 60 + +h.slice(3);
export const toHora = (m: number) => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
export const finDe = (hora: string, bloques: number) => toHora(toMin(hora) + bloques * 30);
export const sumarDias = (f: string, n: number) => new Date(Date.parse(f + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const diasEntre = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
const dow = (f: string) => new Date(f + "T00:00:00Z").getUTCDay();
const empezo = (f: string, h: string) => f < AHORA.fecha || (f === AHORA.fecha && toMin(h) <= AHORA.min);
export const clave = (r: { club: string; cancha: string; fecha: string; hora: string }) => [r.club, r.cancha, r.fecha, r.hora].join("|");

// ---------- datos semilla ----------
const T: [number, number] = [480, 1440];
const clubes: Club[] = [
  { codigo: "palermo", nombre: "Palermo Pádel", provincia: "CABA", localidad: "Palermo", canchas: ["Cancha 1", "Cancha 2", "Cancha 3", "Cancha 4"], horario: Array(7).fill(T) },
  { codigo: "soho", nombre: "Soho Pádel Club", provincia: "CABA", localidad: "Palermo", canchas: ["Cancha 1", "Cancha 2", "Cancha 3"], horario: [null, ...Array(6).fill([540, 1380])] },
  { codigo: "belgrano", nombre: "Belgrano Pádel", provincia: "CABA", localidad: "Belgrano", canchas: ["Cancha 1", "Cancha 2", "Cancha 3"], horario: Array(7).fill(T) },
  { codigo: "vicente", nombre: "Vicente López Pádel", provincia: "Buenos Aires", localidad: "Vicente López", canchas: ["Cancha 1", "Cancha 2"], horario: Array(7).fill(T) },
];
let usuario = USUARIOS[0];
export const usuarioActual = () => usuario;
const reservas: Reserva[] = [];
const partidas: Partida[] = [];
const R = (club: string, cancha: string, dia: number, hora: string, bloques: number, titular: string) => {
  const r = { club, cancha, fecha: sumarDias(AHORA.fecha, dia), hora, bloques, titular };
  reservas.push(r); return r;
};
const P = (r: Reserva, js: string[]) => partidas.push({ clave: clave(r), creador: js[0], jugadores: js });
P(R("soho", "Cancha 1", 0, "19:00", 2, "Tomás Quiroga"), ["Tomás Quiroga", "Camila Rossi", "Nicolás Paz"]); // 3/4, hoy a la noche
P(R("palermo", "Cancha 2", 1, "20:00", 3, "Valentina Gómez"), ["Valentina Gómez", "Lucía Ferreyra"]); // 2/4
P(R("palermo", "Cancha 1", 2, "18:30", 2, "Joaquín Sosa"), ["Joaquín Sosa"]); // 1/4
P(R("soho", "Cancha 2", 1, "21:00", 2, "Agustín Leiva"), ["Agustín Leiva", "Sofía Benítez", "Matías Cabral", "Julieta Ortiz"]); // 4/4 (no se lista)
R("palermo", "Cancha 3", 3, "10:00", 2, "Martina Ibarra");
R("belgrano", "Cancha 1", 0, "20:00", 2, "Lucía Ferreyra");
let seed = 7;
const rnd = (n: number) => ((seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff) >> 8) % n;
const POOL = ["Camila Rossi", "Nicolás Paz", "Valentina Gómez", "Agustín Leiva", "Sofía Benítez", "Matías Cabral", "Franco Medina", "Tomás Quiroga", "Familia Duarte"];
for (const c of clubes) for (let d = 0; d <= 8; d++) for (const cancha of c.canchas) {
  const h = c.horario[dow(sumarDias(AHORA.fecha, d))]; if (!h) continue;
  for (let i = 0; i < 2 + rnd(3); i++) {
    const hora = toHora(h[0] + 30 * rnd((h[1] - h[0]) / 30 - 4)), bloques = 2 + rnd(3), fecha = sumarDias(AHORA.fecha, d);
    if (libre(c.codigo, cancha, fecha, toMin(hora), bloques)) reservas.push({ club: c.codigo, cancha, fecha, hora, bloques, titular: POOL[rnd(POOL.length)] });
  }
}
function libre(club: string, cancha: string, fecha: string, min: number, bloques: number): boolean {
  return !reservas.some((r) => r.club === club && r.cancha === cancha && r.fecha === fecha && toMin(r.hora) < min + bloques * 30 && min < toMin(r.hora) + r.bloques * 30);
}

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());
export const subscribe = (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); };
export const setUsuario = (u: string) => { usuario = u; emit(); };
export const estado = () => ({ usuario, reservas, partidas });

// ---------- helpers que NO son Procedimientos (la pantalla los necesitó, ver NOTAS.md) ----------
export const jugadoresDe = (k: string): string[] => partidas.find((p) => p.clave === k)?.jugadores ?? [];
export const nombreClub = (codigo: string): string => clubes.find((c) => c.codigo === codigo)?.nombre ?? codigo;

// ---------- Procedimientos ----------
function horasLibres(c: Club, cancha: string, fecha: string, bloques: number): string[] {
  const h = c.horario[dow(fecha)], n = diasEntre(AHORA.fecha, fecha), out: string[] = [];
  if (!h || n < 0 || n > 14) return out;
  for (let m = h[0]; m + bloques * 30 <= h[1]; m += 30) if (!empezo(fecha, toHora(m)) && libre(c.codigo, cancha, fecha, m, bloques)) out.push(toHora(m));
  return out;
}
// hora (opcional, "HH:MM"): devuelve solo inicios a ±1 h de esa hora.
export function buscar_horarios(provincia: string, localidad: string, fecha: string, hora?: string, bloques = 2): { club: Club; cancha: string; horas: string[] }[] {
  return clubes.filter((c) => c.provincia === provincia && c.localidad === localidad).flatMap((club) =>
    club.canchas.map((cancha) => ({ club, cancha, horas: horasLibres(club, cancha, fecha, bloques).filter((h) => !hora || Math.abs(toMin(h) - toMin(hora)) <= 60) })).filter((x) => x.horas.length));
}
export function listar_clubes(provincia: string, localidad: string): Club[] {
  return clubes.filter((c) => c.provincia === provincia && c.localidad === localidad);
}
export function ver_club(club: string, fecha: string): string | { club: Club; canchas: { cancha: string; bloques: Bloque[] }[] } {
  const c = clubes.find((x) => x.codigo === club); if (!c) return "Club inexistente";
  const h = c.horario[dow(fecha)];
  return { club: c, canchas: c.canchas.map((cancha) => {
    const bloques: Bloque[] = [];
    if (h) for (let m = h[0]; m < h[1]; m += 30) bloques.push({ hora: toHora(m), libre: !empezo(fecha, toHora(m)) && libre(club, cancha, fecha, m, 1) });
    return { cancha, bloques };
  }) };
}
export function reservar(club: string, cancha: string, fecha: string, hora_inicio: string, bloques: number): string | null {
  const c = clubes.find((x) => x.codigo === club); if (!c || !c.canchas.includes(cancha)) return "Club o Cancha inexistente";
  const m = toMin(hora_inicio);
  if (bloques < 2) return "La Reserva necesita al menos 2 Bloques (1 hora)";
  if (m % 30) return "El inicio tiene que ser en :00 o :30";
  if (empezo(fecha, hora_inicio)) return "Ese Bloque ya empezó";
  if (diasEntre(AHORA.fecha, fecha) > 14) return "Solo se puede reservar hasta 14 días adelante";
  const h = c.horario[dow(fecha)]; if (!h || m < h[0] || m + bloques * 30 > h[1]) return "Fuera del Horario del Club";
  if (!libre(club, cancha, fecha, m, bloques)) return "Ese Horario ya está ocupado";
  reservas.push({ club, cancha, fecha, hora: hora_inicio, bloques, titular: usuario }); emit(); return null;
}
const reservaDe = (k: string) => reservas.find((r) => clave(r) === k);
export function cancelar_reserva(k: string): string | null {
  const r = reservaDe(k); if (!r) return "Reserva inexistente";
  if (r.titular !== usuario) return "No autorizado: solo el titular cancela la Reserva";
  if (empezo(r.fecha, r.hora)) return "La Reserva ya empezó";
  reservas.splice(reservas.indexOf(r), 1);
  const i = partidas.findIndex((p) => p.clave === k); if (i >= 0) partidas.splice(i, 1);
  emit(); return null;
}
export function mis_reservas() {
  const futura = (r: Reserva) => r.fecha >= AHORA.fecha, orden = (a: Reserva, b: Reserva) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora);
  return {
    propias: reservas.filter((r) => r.titular === usuario && futura(r)).sort(orden).map((r) => ({ reserva: r, partida: partidas.find((p) => p.clave === clave(r)) })),
    unidas: partidas.filter((p) => p.creador !== usuario && p.jugadores.includes(usuario)).map((partida) => ({ partida, reserva: reservaDe(partida.clave)! }))
      .filter((x) => futura(x.reserva)).sort((a, b) => orden(a.reserva, b.reserva)),
  };
}
export function abrir_partida(k: string): string | null {
  const r = reservaDe(k); if (!r) return "Reserva inexistente";
  if (r.titular !== usuario) return "No sos el titular de la Reserva";
  if (empezo(r.fecha, r.hora)) return "La Reserva ya empezó";
  if (partidas.some((p) => p.clave === k)) return "La Reserva ya tiene una Partida";
  partidas.push({ clave: k, creador: usuario, jugadores: [usuario] }); emit(); return null;
}
// Devuelve solo cuántos Jugadores hay (no quiénes): ver NOTAS.md.
export function listar_partidas_abiertas(provincia: string, localidad: string, fecha?: string) {
  const ok = new Set(clubes.filter((c) => c.provincia === provincia && c.localidad === localidad).map((c) => c.codigo));
  return partidas.map((p) => ({ p, r: reservaDe(p.clave)! })).filter(({ p, r }) => ok.has(r.club) && p.jugadores.length < 4 && !empezo(r.fecha, r.hora) && (!fecha || r.fecha === fecha))
    .sort((a, b) => (a.r.fecha + a.r.hora).localeCompare(b.r.fecha + b.r.hora))
    .map(({ p, r }) => ({ club: r.club, cancha: r.cancha, fecha: r.fecha, hora: r.hora, bloques: r.bloques, jugadores: p.jugadores.length }));
}
export function unirse(k: string): string | null {
  const p = partidas.find((x) => x.clave === k), r = reservaDe(k); if (!p || !r) return "Partida inexistente";
  if (p.jugadores.length >= 4) return "La Partida está llena";
  if (p.jugadores.includes(usuario)) return "Ya estás anotado en esta Partida";
  if (empezo(r.fecha, r.hora)) return "La Partida ya empezó";
  p.jugadores.push(usuario); emit(); return null;
}
export function salir(k: string): string | null {
  const p = partidas.find((x) => x.clave === k), r = reservaDe(k); if (!p || !r) return "Partida inexistente";
  if (p.creador === usuario) return "El creador no puede salir: cancelá la Reserva";
  if (!p.jugadores.includes(usuario)) return "No estás anotado en esta Partida";
  if (empezo(r.fecha, r.hora)) return "La Partida ya empezó";
  p.jugadores.splice(p.jugadores.indexOf(usuario), 1); emit(); return null;
}
