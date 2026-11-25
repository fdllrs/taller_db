// Store en memoria compartido por las tres variantes. Sin persistencia.
export interface Reserva { id: number; cancha: number; inicio: number; fin: number; titular: string }
// inicio/fin son índices de Bloque (0 = 08:00). fin es exclusivo.

export const CLUB = "Club Los Aromos";
export const FECHA = "Sábado 28 de noviembre";
export const CANCHAS = ["Cancha 1", "Cancha 2", "Cancha 3", "Cancha 4"];
export const BLOQUES = 32; // 08:00 a 24:00, de a 30 min

export function hora(b: number): string {
  const m = 8 * 60 + b * 30;
  return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
}
export function duracionTxt(n: number): string {
  const m = n * 30;
  const h = Math.floor(m / 60);
  return (h ? h + " h" : "") + (m % 60 ? (h ? " " : "") + (m % 60) + " min" : "");
}
export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const SEMILLA: [number, number, number, string][] = [
  [0, 2, 4, "Martina Ibarra"], [0, 12, 16, "Joaquín Sosa"], [0, 20, 24, "Lucía Ferreyra"], [0, 26, 30, "Tomás Quiroga"],
  [1, 0, 3, "Camila Rossi"], [1, 18, 22, "Nicolás Paz"], [1, 24, 27, "Valentina Gómez"],
  [2, 8, 10, "Agustín Leiva"], [2, 20, 26, "Familia Duarte"],
  [3, 4, 6, "Sofía Benítez"], [3, 14, 18, "Matías Cabral"], [3, 22, 24, "Julieta Ortiz"], [3, 28, 32, "Franco Medina"],
];
let reservas: Reserva[] = SEMILLA.map(([cancha, inicio, fin, titular], i) => ({ id: i + 1, cancha, inicio, fin, titular }));
let nextId = reservas.length + 1;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());
export function subscribe(fn: () => void): () => void { listeners.add(fn); return () => listeners.delete(fn); }

export function getReservas(): Reserva[] { return reservas.map((r) => ({ ...r })); }
export function getReserva(id: number): Reserva | undefined { return reservas.find((r) => r.id === id); }
export function reservaEn(cancha: number, b: number): Reserva | undefined {
  return reservas.find((r) => r.cancha === cancha && b >= r.inicio && b < r.fin);
}
// true si los Bloques lo..hi (inclusive) de la Cancha están todos libres
export function rangoLibre(cancha: number, lo: number, hi: number): boolean {
  if (lo < 0 || hi >= BLOQUES) return false;
  for (let b = lo; b <= hi; b++) if (reservaEn(cancha, b)) return false;
  return true;
}
// Devuelve un mensaje de error, o null si se creó.
export function crear(cancha: number, inicio: number, fin: number, titular: string): string | null {
  if (fin - inicio < 2) return "Una Reserva necesita al menos 2 Bloques (1 hora).";
  if (!titular.trim()) return "Escribí el nombre del titular.";
  if (!rangoLibre(cancha, inicio, fin - 1)) return "Se pisa con otra Reserva de esa Cancha.";
  reservas.push({ id: nextId++, cancha, inicio, fin, titular: titular.trim() });
  emit();
  return null;
}
export function cancelar(id: number): void {
  reservas = reservas.filter((r) => r.id !== id);
  emit();
}
