// PROTOTIPO descartable — ticket 'Recorrido del Front de Jugadores' (fdllrs/taller_db#16).
import * as S from "./store.js";
import { esc } from "./store.js";

interface Sheet { club: string; cancha: string; fecha: string; hora: string; bloques: number; paso: "confirmar" | "hecha" | "partida"; err: string }
// fr = clave de franja ("" | manana | tarde | noche); busca = panel de búsqueda abierto; tocado = ya eligió algo (para el subtítulo del botón)
const ui = { tab: "partidas", loc: 0, dia: 0, fr: "", bloques: 2, busca: false, tocado: false, clubSel: "", clubDia: 0, pDia: -1, confirmando: "", dbg: false, sheet: null as Sheet | null, anim: "" };
const errs: Record<string, string> = {}; // error inline por clave de Reserva/Partida
let reset = false; // true = volver arriba al re-renderizar
const $app = document.getElementById("app")!;

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIASL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const FRANJAS: [string, string, number, number][] = [["", "Cualquier hora", 0, 24], ["manana", "Mañana 8–12", 8, 12], ["tarde", "Tarde 12–18", 12, 18], ["noche", "Noche 18–24", 18, 24]]; // franja = filtro del cliente sobre las horas devueltas
const DURS: [number, string][] = [[2, "1 h"], [3, "1 h 30"], [4, "2 h"]];
const fechaDe = (n: number) => S.sumarDias(S.AHORA.fecha, n);
const fd = (f: string) => new Date(f + "T00:00:00Z");
const desde = (f: string) => Math.round((fd(f).getTime() - fd(S.AHORA.fecha).getTime()) / 864e5);
const fechaCorta = (f: string) => `${DIAS[fd(f).getUTCDay()]} ${fd(f).getUTCDate()} ${MESES[fd(f).getUTCMonth()].slice(0, 3)}`;
const fechaLarga = (f: string) => `${DIASL[fd(f).getUTCDay()]} ${fd(f).getUTCDate()} de ${MESES[fd(f).getUTCMonth()]}`;
const rango = (hora: string, b: number) => hora + " – " + S.finDe(hora, b);
const ini = (n: string) => n.split(" ").slice(0, 2).map((w) => w[0]).join("");
const loc = () => S.LOCALIDADES[ui.loc];

const chip = (act: string, v: string | number, label: string, on: boolean) => `<button class="chip${on ? " on" : ""}" data-act="${act}" data-v="${v}">${esc(label)}</button>`;
// tile de calendario: DÍA SEMANA / número grande / mes (+ "HOY")
const calParts = (f: string) => `<i>${DIAS[fd(f).getUTCDay()].toUpperCase()}</i><b>${fd(f).getUTCDate()}</b><i>${MESES[fd(f).getUTCMonth()].slice(0, 3).toUpperCase()}</i>`;
const fechaTile = (f: string) => `<span class="cal st">${calParts(f)}</span>`;
const diaTiles = (act: string, sel: number, todas = false) =>
  `<div class="hs days">${todas ? `<button class="cal todas${sel === -1 ? " on" : ""}" data-act="${act}" data-v="-1"><b>Todas</b></button>` : ""}${Array.from({ length: 15 }, (_, n) =>
    `<button class="cal${sel === n ? " on" : ""}" data-act="${act}" data-v="${n}">${calParts(fechaDe(n))}${n === 0 ? `<em>HOY</em>` : ""}</button>`).join("")}</div>`;
const tag = (f: string) => (desde(f) === 0 ? `<span class="tag">Hoy</span>` : desde(f) === 1 ? `<span class="tag">Mañana</span>` : "");
const durChips = () => `<div class="seg">${DURS.map(([b, l]) => chip("dur", b, l, ui.bloques === b)).join("")}</div>`;
const locSelect = () => `<select data-act="loc">${S.LOCALIDADES.map((l, i) => `<option value="${i}"${i === ui.loc ? " selected" : ""}>${esc(l.localidad + ", " + l.provincia)}</option>`).join("")}</select>`;
const slot = (club: string, cancha: string, fecha: string, hora: string) => `<button class="slot" data-act="slot" data-club="${esc(club)}" data-cancha="${esc(cancha)}" data-fecha="${fecha}" data-hora="${hora}">${hora}</button>`;
const err = (k: string) => (errs[k] ? `<p class="err">${esc(errs[k])}</p>` : "");
const circulos = (js: string[]) => `<div class="lugares">${[0, 1, 2, 3].map((i) => (js[i] ? `<span class="lug on" title="${esc(js[i])}">${esc(ini(js[i]))}</span>` : `<span class="lug"></span>`)).join("")}<b>${js.length}/4</b></div>`;
// cabecera de card: tile de fecha a la izquierda, Club / Cancha / hora a la derecha
const fila = (r: { club: string; cancha: string; fecha: string; hora: string; bloques: number }) =>
  `<div class="top">${fechaTile(r.fecha)}<div class="inf"><h3>${esc(S.nombreClub(r.club))}</h3><p>${esc(r.cancha)} · ${rango(r.hora, r.bloques)}</p><p class="muted">${fechaCorta(r.fecha)} ${tag(r.fecha)}</p></div></div>`;

function horarioTxt(c: S.Club): string {
  const ord = [1, 2, 3, 4, 5, 6, 0], t = (d: number) => (c.horario[d] ? S.toHora(c.horario[d]![0]) + "–" + S.toHora(c.horario[d]![1]) : "cerrado"), runs: string[] = [];
  for (let i = 0, j = 0; i < 7; i = j + 1) {
    for (j = i; j + 1 < 7 && t(ord[j + 1]) === t(ord[i]); j++);
    runs.push((i === j ? DIAS[ord[i]] : DIAS[ord[i]] + "–" + DIAS[ord[j]]) + " " + t(ord[i]));
  }
  return runs.join(" · ");
}

// ---------- pantallas ----------
const LUPA = `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>`;
function cta(): string {
  const f = FRANJAS.find((x) => x[0] === ui.fr)!, sub = ui.tocado ? [loc().localidad, fechaCorta(fechaDe(ui.dia)), f[0] ? f[1].split(" ")[0] : f[1], DURS.find((d) => d[0] === ui.bloques)![1]].join(" · ") : "Elegí dónde y cuándo";
  return `<button class="cta" data-act="buscar-abrir">${LUPA}<span><b>Reservar una Cancha</b><small>${esc(sub)}</small></span><svg class="arrow" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg></button>`;
}

function busqueda(): string {
  if (!ui.busca) return "";
  const f = fechaDe(ui.dia), [, , a, b] = FRANJAS.find((x) => x[0] === ui.fr)!;
  const res = S.buscar_horarios(loc().provincia, loc().localidad, f, undefined, ui.bloques)
    .map((r) => ({ ...r, horas: r.horas.filter((h) => +h.slice(0, 2) >= a && +h.slice(0, 2) < b) })).filter((r) => r.horas.length);
  const clubes = [...new Set(res.map((r) => r.club.codigo))];
  const lista = clubes.map((c) => `<section class="card"><h3>${esc(S.nombreClub(c))}</h3>${res.filter((r) => r.club.codigo === c).map((r) =>
    `<div class="cancha"><b>${esc(r.cancha)}</b><div class="times">${r.horas.map((h) => slot(c, r.cancha, f, h)).join("")}</div></div>`).join("")}</section>`).join("")
    || `<p class="muted vacio">No hay Horarios libres para esa búsqueda. Probá con otro día u horario.</p>`;
  return `<div class="scrim pscrim" data-act="buscar-scrim"></div><div class="busqueda${ui.anim === "p" ? " in" : ""}"><div class="phead"><button class="x" data-act="buscar-cerrar" aria-label="Cerrar">✕</button><h2>Reservar Cancha</h2></div>
    <div class="pbody"><h4>Localidad</h4>${locSelect()}
    <h4>Fecha</h4>${diaTiles("s-dia", ui.dia)}<p class="fechatxt">${fechaLarga(f)}</p>
    <h4>Horario</h4><div class="franjas">${FRANJAS.map(([k, l]) => chip("s-franja", k, l, ui.fr === k)).join("")}</div>
    <h4>Duración</h4>${durChips()}
    <h4>Horarios libres</h4>${lista}</div></div>`;
}

function clubes(): string {
  if (!ui.clubSel) return `<h1>Clubes</h1>${locSelect()}${S.listar_clubes(loc().provincia, loc().localidad).map((c) =>
    `<button class="card tap" data-act="club" data-v="${esc(c.codigo)}"><h3>${esc(c.nombre)}</h3><p class="muted">${c.canchas.length} Canchas</p><p class="muted">${horarioTxt(c)}</p></button>`).join("")}`;
  const f = fechaDe(ui.clubDia), r = S.ver_club(ui.clubSel, f);
  if (typeof r === "string") return `<p class="err">${esc(r)}</p>`;
  const inicios = (bs: S.Bloque[]) => bs.filter((_, i) => bs.slice(i, i + ui.bloques).length === ui.bloques && bs.slice(i, i + ui.bloques).every((x) => x.libre)).map((b) => b.hora);
  return `<button class="back" data-act="atras">‹ Clubes</button><h1>${esc(r.club.nombre)}</h1><p class="muted">${horarioTxt(r.club)}</p>
    <h4>Fecha</h4>${diaTiles("cdia", ui.clubDia)}<p class="fechatxt">${fechaLarga(f)}</p><h4>Duración</h4>${durChips()}
    ${r.canchas.map((c) => `<section class="card"><h3>${esc(c.cancha)}</h3><div class="times">${inicios(c.bloques).map((h) => slot(r.club.codigo, c.cancha, f, h)).join("") || `<span class="muted">Sin Horarios libres</span>`}</div></section>`).join("")}`;
}

function partidas(): string {
  const lista = S.listar_partidas_abiertas(loc().provincia, loc().localidad, ui.pDia >= 0 ? fechaDe(ui.pDia) : undefined);
  const yo = S.usuarioActual();
  return `${cta()}<h4 class="sec">Partidas abiertas</h4>${locSelect()}<div class="gap">${diaTiles("pdia", ui.pDia, true)}</div>
    ${lista.map((p) => {
      const k = S.clave(p), js = S.jugadoresDe(k);
      const accion = js[0] === yo ? `<p class="muted">Sos el creador</p>` : js.includes(yo) ? `<p class="ok">Estás anotado</p><button class="btn red" data-act="salir" data-v="${esc(k)}">Salir</button>`
        : `<button class="btn go" data-act="unirse" data-v="${esc(k)}">Unirme</button>`;
      return `<section class="card">${fila(p)}${circulos(js)}<p class="muted">Creada por ${esc(js[0])}</p>${accion}${err(k)}</section>`;
    }).join("") || `<p class="muted vacio">No hay Partidas abiertas${ui.pDia >= 0 ? " ese día" : ""}.</p>`}`;
}

function reservas(): string {
  const m = S.mis_reservas();
  const propias = m.propias.map(({ reserva: r, partida }) => {
    const k = S.clave(r);
    const abajo = ui.confirmando === k
      ? `<p class="err">¿Cancelar esta Reserva? También se borra la Partida y se anota a todos afuera.</p><div class="row"><button class="btn red fill" data-act="cancelar" data-v="${esc(k)}">Sí, cancelar</button><button class="btn sec" data-act="no" data-v="">No</button></div>`
      : `<button class="btn red" data-act="pedir" data-v="${esc(k)}">Cancelar Reserva</button>`;
    return `<section class="card">${fila(r)}
      ${partida ? `<p class="muted">Partida ${partida.jugadores.length}/4</p>${circulos(partida.jugadores)}` : `<button class="btn go" data-act="abrir" data-v="${esc(k)}">Abrir Partida</button>`}${abajo}${err(k)}</section>`;
  }).join("") || `<p class="muted vacio">Todavía no tenés Reservas.</p>`;
  const unidas = m.unidas.map(({ partida: p, reserva: r }) => `<section class="card">${fila(r)}${circulos(p.jugadores)}
    <p class="muted">Creada por ${esc(p.creador)}</p><button class="btn red" data-act="salir" data-v="${esc(p.clave)}">Salir</button>${err(p.clave)}</section>`).join("") || `<p class="muted vacio">No estás anotado en ninguna Partida.</p>`;
  return `<h1>Mis reservas</h1>${propias}<h4>Partidas a las que me sumé</h4>${unidas}`;
}

function sheet(): string {
  const s = ui.sheet; if (!s) return "";
  const res = `<dl><dt>Club</dt><dd>${esc(S.nombreClub(s.club))}</dd><dt>Cancha</dt><dd>${esc(s.cancha)}</dd><dt>Fecha</dt><dd>${fechaLarga(s.fecha)}</dd>
    <dt>Horario</dt><dd>${rango(s.hora, s.bloques)}</dd><dt>Duración</dt><dd>${DURS.find((d) => d[0] === s.bloques)![1]}</dd></dl>`;
  const e = s.err ? `<p class="err">${esc(s.err)}</p>` : "";
  const cuerpo = s.paso === "confirmar" ? `<h2>Confirmá tu Reserva</h2>${res}${e}<div class="row"><button class="btn sec" data-act="cerrar">Volver</button><button class="btn go" data-act="reservar">Reservar</button></div>`
    : s.paso === "hecha" ? `<h2>Reserva confirmada</h2>${res}<p class="muted">Abrí una Partida y se suman otros 3 Jugadores.</p>${e}<button class="btn go full" data-act="abrir-sheet">Abrir Partida</button><button class="btn sec full" data-act="cerrar">Listo</button>`
    : `<h2>Partida abierta</h2>${res}<p class="muted">Ya la ven los otros Jugadores en Partidas. Falta sumar 3.</p><button class="btn go full" data-act="cerrar">Listo</button>`;
  return `<div class="scrim" data-act="cerrar-scrim"></div><div class="sheet${ui.anim === "s" ? " in" : ""}">${cuerpo}</div>`;
}

function chrome(): string {
  const u = S.usuarioActual();
  return `<aside class="chrome"><label>Jugando como: <select data-act="user">${S.USUARIOS.map((n) => `<option${n === u ? " selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
    <details${ui.dbg ? " open" : ""}><summary>Estado (debug)</summary><pre>${esc(JSON.stringify(S.estado(), null, 1))}</pre></details></aside>`;
}

function render(): void {
  const tops = [".scroll", ".pbody"].map((q) => $app.querySelector(q)?.scrollTop ?? 0), lefts = [...$app.querySelectorAll(".hs")].map((e) => e.scrollLeft);
  const pantalla = { clubes, partidas, reservas }[ui.tab as "clubes"]();
  const TABS = [["partidas", "Partidas"], ["clubes", "Clubes"], ["reservas", "Mis reservas"]];
  $app.innerHTML = `<div class="app"><div class="scroll"><div class="page">${pantalla}</div></div>
    <nav class="tabs"><b class="brand">Pádel</b>${TABS.map(([id, l]) => `<button class="${ui.tab === id ? "on" : ""}" data-act="tab" data-v="${id}">${l}</button>`).join("")}</nav>${busqueda()}${sheet()}</div>${chrome()}`;
  ui.anim = "";
  if (!reset) {
    [".scroll", ".pbody"].forEach((q, i) => { const e = $app.querySelector(q); if (e) e.scrollTop = tops[i]; });
    $app.querySelectorAll(".hs").forEach((e, i) => { if (i < lefts.length) e.scrollLeft = lefts[i]; });
  }
  reset = false;
}

// ---------- acciones (delegación) ----------
const ACT: Record<string, (v: string, el: HTMLElement) => void> = {
  tab: (v) => { ui.tab = v; reset = true; for (const k in errs) delete errs[k]; },
  user: (v) => S.setUsuario(v),
  loc: (v) => { ui.loc = +v; ui.clubSel = ""; ui.tocado = true; },
  "buscar-abrir": () => { ui.busca = true; ui.anim = "p"; },
  "buscar-cerrar": () => (ui.busca = false), "buscar-scrim": () => (ui.busca = false),
  "s-dia": (v) => { ui.dia = +v; ui.tocado = true; }, "s-franja": (v) => { ui.fr = v; ui.tocado = true; },
  dur: (v) => { ui.bloques = +v; ui.tocado = true; }, cdia: (v) => (ui.clubDia = +v), pdia: (v) => (ui.pDia = +v),
  club: (v) => { ui.clubSel = v; ui.clubDia = 0; reset = true; },
  atras: () => { ui.clubSel = ""; reset = true; },
  slot: (_, el) => { const d = el.dataset; ui.sheet = { club: d.club!, cancha: d.cancha!, fecha: d.fecha!, hora: d.hora!, bloques: ui.bloques, paso: "confirmar", err: "" }; ui.anim = "s"; },
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
  if (el.classList.contains("scrim") && e.target !== el) return;
  ACT[el.dataset.act!](el.dataset.v ?? (el as HTMLSelectElement).value, el);
  render();
}
$app.addEventListener("click", onEvent);
$app.addEventListener("change", onEvent);
$app.addEventListener("toggle", (e) => { ui.dbg = (e.target as HTMLDetailsElement).open; }, true);
S.subscribe(render);
render();
