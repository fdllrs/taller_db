// PROTOTIPO descartable — ticket 'Recorrido del Front de Jugadores' (fdllrs/taller_db#16).
import * as S from "./store.js";
import { esc } from "./store.js";

interface Sheet { club: string; cancha: string; fecha: string; hora: string; bloques: number; paso: "confirmar" | "hecha" | "partida"; err: string }
const ui = { tab: "buscar", loc: 0, dia: 0, bloques: 2, w: { paso: 1, loc: false, dia: false, fr: -1 }, clubSel: "", clubDia: 0, pDia: -1, confirmando: "", dbg: false, sheet: null as Sheet | null };
const errs: Record<string, string> = {}; // error inline por clave de Reserva/Partida
let reset = false; // true = volver arriba al re-renderizar
const $app = document.getElementById("app")!;

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const FRANJAS: [string, number, number][] = [["Cualquier hora", 0, 24], ["Mañana (08–12)", 8, 12], ["Tarde (12–18)", 12, 18], ["Noche (18–24)", 18, 24]]; // franja = filtro del cliente sobre las horas devueltas
const DURS: [number, string][] = [[2, "1 h"], [3, "1 h 30"], [4, "2 h"]];
const fechaDe = (n: number) => S.sumarDias(S.AHORA.fecha, n);
const diaTxt = (f: string) => { const d = new Date(f + "T00:00:00Z"); return DIAS[d.getUTCDay()] + " " + d.getUTCDate(); };
const diaLabel = (n: number) => (n === 0 ? "Hoy" : diaTxt(fechaDe(n)));
const rango = (hora: string, b: number) => hora + " – " + S.finDe(hora, b);
const ini = (n: string) => n.split(" ").slice(0, 2).map((w) => w[0]).join("");
const loc = () => S.LOCALIDADES[ui.loc];

const chip = (act: string, v: string | number, label: string, on: boolean) => `<button class="chip${on ? " on" : ""}" data-act="${act}" data-v="${v}">${esc(label)}</button>`;
const diaChips = (act: string, sel: number, todas = false) =>
  `<div class="hs">${todas ? chip(act, -1, "Todas", sel === -1) : ""}${Array.from({ length: 15 }, (_, n) => chip(act, n, diaLabel(n), sel === n)).join("")}</div>`;
const durChips = () => `<div class="hs">${DURS.map(([b, l]) => chip("dur", b, l, ui.bloques === b)).join("")}</div>`;
const locSelect = () => `<select data-act="loc">${S.LOCALIDADES.map((l, i) => `<option value="${i}"${i === ui.loc ? " selected" : ""}>${esc(l.localidad + ", " + l.provincia)}</option>`).join("")}</select>`;
const slot = (club: string, cancha: string, fecha: string, hora: string) => `<button class="slot" data-act="slot" data-club="${esc(club)}" data-cancha="${esc(cancha)}" data-fecha="${fecha}" data-hora="${hora}">${hora}</button>`;
const err = (k: string) => (errs[k] ? `<p class="err">${esc(errs[k])}</p>` : "");
const circulos = (js: string[]) => `<div class="lugares">${[0, 1, 2, 3].map((i) => (js[i] ? `<span class="lug on" title="${esc(js[i])}">${esc(ini(js[i]))}</span>` : `<span class="lug"></span>`)).join("")}<b>${js.length}/4</b></div>`;
const cuando = (r: { cancha: string; fecha: string; hora: string; bloques: number }) => `${esc(r.cancha)} · ${diaLabel(Math.round((Date.parse(r.fecha) - Date.parse(S.AHORA.fecha)) / 864e5))} · ${rango(r.hora, r.bloques)}`;

function horarioTxt(c: S.Club): string {
  const ord = [1, 2, 3, 4, 5, 6, 0], t = (d: number) => (c.horario[d] ? S.toHora(c.horario[d]![0]) + "–" + S.toHora(c.horario[d]![1]) : "cerrado"), runs: string[] = [];
  for (let i = 0, j = 0; i < 7; i = j + 1) {
    for (j = i; j + 1 < 7 && t(ord[j + 1]) === t(ord[i]); j++);
    runs.push((i === j ? DIAS[ord[i]] : DIAS[ord[i]] + "–" + DIAS[ord[j]]) + " " + t(ord[i]));
  }
  return runs.join(" · ");
}

// ---------- pantallas ----------
const tile = (act: string, v: string | number, label: string, on: boolean, big = false) => `<button class="tile${on ? " on" : ""}${big ? " big" : ""}" data-act="${act}" data-v="${v}">${esc(label)}</button>`;
function buscar(): string {
  const w = ui.w, f = fechaDe(ui.dia);
  const pill = (n: number, label: string, ok: boolean) => `<button class="pill${ok ? "" : " dim"}${w.paso === n ? " cur" : ""}" data-act="w-paso" data-v="${n}">${esc(label)}</button>`;
  const franja = w.fr >= 0 ? FRANJAS[w.fr][0].split(" (")[0] + " · " + DURS.find((d) => d[0] === ui.bloques)![1] : "Hora";
  const tira = `<div class="hs strip">${pill(1, w.loc ? loc().localidad : "Lugar", w.loc)}${pill(2, w.dia ? diaLabel(ui.dia) : "Día", w.dia)}${pill(3, franja, w.fr >= 0)}</div>
    <div class="stepbar">${w.paso > 1 ? `<button class="back" data-act="w-atras">‹ Atrás</button>` : "<span></span>"}<span class="muted">Paso ${w.paso} de 4</span></div>`;
  let cuerpo: string;
  if (w.paso === 1) cuerpo = `<h1>¿Dónde jugás?</h1>${S.LOCALIDADES.map((l, i) => tile("w-loc", i, l.localidad + ", " + l.provincia, w.loc && ui.loc === i, true)).join("")}`;
  else if (w.paso === 2) cuerpo = `<h1>¿Qué día?</h1><div class="grid">${Array.from({ length: 15 }, (_, n) => tile("w-dia", n, diaLabel(n), w.dia && ui.dia === n)).join("")}</div>`;
  else if (w.paso === 3) cuerpo = `<h1>¿A qué hora?</h1><div class="grid g2">${FRANJAS.map(([l], i) => tile("w-hora", i, l, w.fr === i)).join("")}</div>
    <h4>Duración</h4><div class="seg">${DURS.map(([b, l]) => chip("dur", b, l, ui.bloques === b)).join("")}</div>
    <button class="btn go full" data-act="w-ver"${w.fr < 0 ? " disabled" : ""}>Ver horarios libres</button>`;
  else {
    const [, a, b] = FRANJAS[w.fr];
    const res = S.buscar_horarios(loc().provincia, loc().localidad, f, undefined, ui.bloques)
      .map((r) => ({ ...r, horas: r.horas.filter((h) => +h.slice(0, 2) >= a && +h.slice(0, 2) < b) })).filter((r) => r.horas.length);
    const clubes = [...new Set(res.map((r) => r.club.codigo))];
    cuerpo = `<h1>Horarios libres</h1>` + (clubes.map((c) => `<section class="card"><h3>${esc(S.nombreClub(c))}</h3>${res.filter((r) => r.club.codigo === c).map((r) =>
      `<div class="cancha"><b>${esc(r.cancha)}</b><div class="times">${r.horas.map((h) => slot(c, r.cancha, f, h)).join("")}</div></div>`).join("")}</section>`).join("")
      || `<p class="muted">No hay Horarios libres para esa búsqueda.</p><button class="btn go full" data-act="w-paso" data-v="2">Cambiar día u hora</button>`);
  }
  return `${tira}<div data-paso="${w.paso}">${cuerpo}</div>`;
}

function clubes(): string {
  if (!ui.clubSel) return `<h1>Clubes</h1>${locSelect()}${S.listar_clubes(loc().provincia, loc().localidad).map((c) =>
    `<button class="card tap" data-act="club" data-v="${esc(c.codigo)}"><h3>${esc(c.nombre)}</h3><p class="muted">${c.canchas.length} Canchas</p><p class="muted">${horarioTxt(c)}</p></button>`).join("")}`;
  const f = fechaDe(ui.clubDia), r = S.ver_club(ui.clubSel, f);
  if (typeof r === "string") return `<p class="err">${esc(r)}</p>`;
  const inicios = (bs: S.Bloque[]) => bs.filter((_, i) => bs.slice(i, i + ui.bloques).length === ui.bloques && bs.slice(i, i + ui.bloques).every((x) => x.libre)).map((b) => b.hora);
  return `<button class="back" data-act="atras">‹ Clubes</button><h1>${esc(r.club.nombre)}</h1><p class="muted">${horarioTxt(r.club)}</p>
    <h4>Fecha</h4>${diaChips("cdia", ui.clubDia)}<h4>Duración</h4>${durChips()}
    ${r.canchas.map((c) => `<section class="card"><h3>${esc(c.cancha)}</h3><div class="times">${inicios(c.bloques).map((h) => slot(r.club.codigo, c.cancha, f, h)).join("") || `<span class="muted">Sin Horarios libres</span>`}</div></section>`).join("")}`;
}

function partidas(): string {
  const lista = S.listar_partidas_abiertas(loc().provincia, loc().localidad, ui.pDia >= 0 ? fechaDe(ui.pDia) : undefined);
  const yo = S.usuarioActual();
  return `<h1>Partidas abiertas</h1>${locSelect()}<h4>Día</h4>${diaChips("pdia", ui.pDia, true)}
    ${lista.map((p) => {
      const k = S.clave(p), js = S.jugadoresDe(k);
      const accion = js[0] === yo ? `<p class="muted">Sos el creador</p>` : js.includes(yo) ? `<p class="ok">Estás anotado</p><button class="btn red" data-act="salir" data-v="${esc(k)}">Salir</button>`
        : `<button class="btn go" data-act="unirse" data-v="${esc(k)}">Unirme</button>`;
      return `<section class="card"><h3>${esc(S.nombreClub(p.club))}</h3><p>${cuando(p)}</p>${circulos(js)}<p class="muted">Creada por ${esc(js[0])}</p>${accion}${err(k)}</section>`;
    }).join("") || `<p class="muted">No hay Partidas abiertas${ui.pDia >= 0 ? " ese día" : ""}.</p>`}`;
}

function reservas(): string {
  const m = S.mis_reservas();
  const propias = m.propias.map(({ reserva: r, partida }) => {
    const k = S.clave(r);
    const abajo = ui.confirmando === k
      ? `<p class="err">¿Cancelar esta Reserva? También se borra la Partida y se anota a todos afuera.</p><div class="row"><button class="btn red fill" data-act="cancelar" data-v="${esc(k)}">Sí, cancelar</button><button class="btn sec" data-act="no" data-v="">No</button></div>`
      : `<button class="btn red" data-act="pedir" data-v="${esc(k)}">Cancelar Reserva</button>`;
    return `<section class="card"><h3>${esc(S.nombreClub(r.club))}</h3><p>${cuando(r)}</p>
      ${partida ? `<p class="muted">Partida ${partida.jugadores.length}/4</p>${circulos(partida.jugadores)}` : `<button class="btn go" data-act="abrir" data-v="${esc(k)}">Abrir Partida</button>`}${abajo}${err(k)}</section>`;
  }).join("") || `<p class="muted">Todavía no tenés Reservas.</p>`;
  const unidas = m.unidas.map(({ partida: p, reserva: r }) => `<section class="card"><h3>${esc(S.nombreClub(r.club))}</h3><p>${cuando(r)}</p>${circulos(p.jugadores)}
    <p class="muted">Creada por ${esc(p.creador)}</p><button class="btn red" data-act="salir" data-v="${esc(p.clave)}">Salir</button>${err(p.clave)}</section>`).join("") || `<p class="muted">No estás anotado en ninguna Partida.</p>`;
  return `<h1>Mis reservas</h1>${propias}<h4>Partidas a las que me sumé</h4>${unidas}`;
}

function sheet(): string {
  const s = ui.sheet; if (!s) return "";
  const res = `<dl><dt>Club</dt><dd>${esc(S.nombreClub(s.club))}</dd><dt>Cancha</dt><dd>${esc(s.cancha)}</dd><dt>Fecha</dt><dd>${diaTxt(s.fecha)}/${s.fecha.slice(5, 7)}</dd>
    <dt>Horario</dt><dd>${rango(s.hora, s.bloques)}</dd><dt>Duración</dt><dd>${DURS.find((d) => d[0] === s.bloques)![1]}</dd></dl>`;
  const e = s.err ? `<p class="err">${esc(s.err)}</p>` : "";
  const cuerpo = s.paso === "confirmar" ? `<h2>Confirmá tu Reserva</h2>${res}${e}<div class="row"><button class="btn sec" data-act="cerrar">Volver</button><button class="btn go" data-act="reservar">Reservar</button></div>`
    : s.paso === "hecha" ? `<h2>Reserva confirmada</h2>${res}<p class="muted">Abrí una Partida y se suman otros 3 Jugadores.</p>${e}<button class="btn go full" data-act="abrir-sheet">Abrir Partida</button><button class="btn sec full" data-act="cerrar">Listo</button>`
    : `<h2>Partida abierta</h2>${res}<p class="muted">Ya la ven los otros Jugadores en Partidas. Falta sumar 3.</p><button class="btn go full" data-act="cerrar">Listo</button>`;
  return `<div class="scrim" data-act="cerrar-scrim"></div><div class="sheet">${cuerpo}</div>`;
}

function chrome(): string {
  const u = S.usuarioActual();
  return `<aside class="chrome"><label>Jugando como: <select data-act="user">${S.USUARIOS.map((n) => `<option${n === u ? " selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
    <details${ui.dbg ? " open" : ""}><summary>Estado (debug)</summary><pre>${esc(JSON.stringify(S.estado(), null, 1))}</pre></details></aside>`;
}

function render(): void {
  const top = $app.querySelector(".scroll")?.scrollTop ?? 0, lefts = [...$app.querySelectorAll(".hs")].map((e) => e.scrollLeft);
  const pantalla = { buscar, clubes, partidas, reservas }[ui.tab as "buscar"]();
  const TABS = [["buscar", "Buscar"], ["clubes", "Clubes"], ["partidas", "Partidas"], ["reservas", "Mis reservas"]];
  $app.innerHTML = `<div class="app"><div class="scroll"><div class="page">${pantalla}</div></div>
    <nav class="tabs"><b class="brand">Pádel</b>${TABS.map(([id, l]) => `<button class="${ui.tab === id ? "on" : ""}" data-act="tab" data-v="${id}">${l}</button>`).join("")}</nav>${sheet()}</div>${chrome()}`;
  const sc = $app.querySelector(".scroll")!, hs = [...$app.querySelectorAll(".hs")];
  if (!reset) { sc.scrollTop = top; if (hs.length === lefts.length) hs.forEach((e, i) => (e.scrollLeft = lefts[i])); }
  reset = false;
}

// ---------- acciones (delegación) ----------
const ACT: Record<string, (v: string, el: HTMLElement) => void> = {
  tab: (v) => { ui.tab = v; reset = true; for (const k in errs) delete errs[k]; },
  user: (v) => S.setUsuario(v),
  loc: (v) => { ui.loc = +v; ui.clubSel = ""; reset = true; },
  "w-loc": (v) => { ui.loc = +v; ui.w.loc = true; ui.w.paso = 2; reset = true; },
  "w-dia": (v) => { ui.dia = +v; ui.w.dia = true; ui.w.paso = 3; reset = true; },
  "w-hora": (v) => { ui.w.fr = +v; },
  "w-ver": () => { if (ui.w.fr >= 0) { ui.w.paso = 4; reset = true; } },
  "w-atras": () => { ui.w.paso--; reset = true; },
  "w-paso": (v) => { const w = ui.w; w.paso = +v === 4 && !(w.loc && w.dia && w.fr >= 0) ? (!w.loc ? 1 : !w.dia ? 2 : 3) : +v; reset = true; },
  dur: (v) => (ui.bloques = +v), cdia: (v) => (ui.clubDia = +v), pdia: (v) => (ui.pDia = +v),
  club: (v) => { ui.clubSel = v; ui.clubDia = 0; reset = true; },
  atras: () => { ui.clubSel = ""; reset = true; },
  slot: (_, el) => { const d = el.dataset; ui.sheet = { club: d.club!, cancha: d.cancha!, fecha: d.fecha!, hora: d.hora!, bloques: ui.bloques, paso: "confirmar", err: "" }; },
  cerrar: () => (ui.sheet = null), "cerrar-scrim": () => (ui.sheet = null),
  reservar: () => { const s = ui.sheet!; s.err = S.reservar(s.club, s.cancha, s.fecha, s.hora, s.bloques) ?? ""; if (!s.err) s.paso = "hecha"; },
  "abrir-sheet": () => { const s = ui.sheet!; s.err = S.abrir_partida(S.clave(s)) ?? ""; if (!s.err) s.paso = "partida"; },
  abrir: (v) => { errs[v] = S.abrir_partida(v) ?? ""; },
  pedir: (v) => (ui.confirmando = v), no: () => (ui.confirmando = ""),
  cancelar: (v) => { errs[v] = S.cancelar_reserva(v) ?? ""; ui.confirmando = ""; },
  unirse: (v) => { errs[v] = S.unirse(v) ?? ""; },
  salir: (v) => { errs[v] = S.salir(v) ?? ""; },
};
function onEvent(e: Event): void {
  const el = (e.target as HTMLElement).closest<HTMLElement>("[data-act]");
  if (!el || (e.type === "click") === (el.tagName === "SELECT")) return; // selects solo por "change", el resto por "click"
  if (el.dataset.act === "cerrar-scrim" && e.target !== el) return;
  ACT[el.dataset.act!](el.dataset.v ?? (el as HTMLSelectElement).value, el);
  render();
}
$app.addEventListener("click", onEvent);
$app.addEventListener("change", onEvent);
$app.addEventListener("toggle", (e) => { ui.dbg = (e.target as HTMLDetailsElement).open; }, true);
S.subscribe(render);
render();
