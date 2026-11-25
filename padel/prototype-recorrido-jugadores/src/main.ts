// PROTOTIPO descartable — ticket 'Recorrido del Front de Jugadores' (fdllrs/taller_db#16).
import * as S from "./store.js";
import { esc } from "./store.js";

interface Sheet { club: string; cancha: string; fecha: string; hora: string; bloques: number; paso: "confirmar" | "hecha" | "partida"; err: string }
// fr = clave de franja ("" | manana | tarde | noche); busca = panel abierto; paso = paso 1..3 de la búsqueda (hora = elegida en el 2); tocado = ya eligió algo (para el subtítulo del botón)
const ui = { tab: "partidas", loc: 0, dia: 0, fr: "", bloques: 2, busca: false, tocado: false, paso: 1, hora: "", clubSel: "", clubDia: 0, pDia: -1, confirmando: "", dbg: false, sheet: null as Sheet | null, anim: "" };
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
const locSelect = (act = "loc") => `<select data-act="${act}">${S.LOCALIDADES.map((l, i) => `<option value="${i}"${i === ui.loc ? " selected" : ""}>${esc(l.localidad + ", " + l.provincia)}</option>`).join("")}</select>`;
const slot = (club: string, cancha: string | null, fecha: string, hora: string) => `<button class="slot" data-act="slot" data-club="${esc(club)}"${cancha ? ` data-cancha="${esc(cancha)}"` : ""} data-fecha="${fecha}" data-hora="${hora}">${hora}</button>`;
// Canchas del Club libres a esa hora para esa duración (la búsqueda ya las agrupa por Cancha)
const libresEn = (club: string, fecha: string, hora: string, b: number) =>
  S.buscar_horarios(loc().provincia, loc().localidad, fecha, undefined, b).filter((r) => r.club.codigo === club && r.horas.includes(hora)).map((r) => r.cancha);
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

const TITULOS = ["¿Qué día?", "¿A qué hora?", "¿Dónde?"];
const CHEV = `<svg class="chev" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>`;
const ICONOS: Record<string, string> = {
  "": `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`, manana: `<path d="M5 17a7 7 0 0114 0M3 17h18M12 4v3M5 8l2 2M19 8l-2 2"/>`,
  tarde: `<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>`, noche: `<path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/>`,
};
// filtra por franja en el cliente (ver nota de `hora` en NOTAS.md)
function buscar() {
  const [, , a, b] = FRANJAS.find((x) => x[0] === ui.fr)!;
  return S.buscar_horarios(loc().provincia, loc().localidad, fechaDe(ui.dia), undefined, ui.bloques)
    .map((r) => ({ ...r, horas: r.horas.filter((h) => +h.slice(0, 2) >= a && +h.slice(0, 2) < b) })).filter((r) => r.horas.length);
}
// opciones (Club + Cancha) libres por hora de inicio, unión de todos los Clubes de la localidad
const porHora = (res: ReturnType<typeof buscar>) => { const m = new Map<string, { club: string; cancha: string }[]>(); for (const r of res) for (const h of r.horas) m.set(h, [...(m.get(h) ?? []), { club: r.club.codigo, cancha: r.cancha }]); return [...m].sort(([x], [y]) => (x < y ? -1 : 1)); };
const opt = (act: string, attrs: string, html: string) => `<button class="opt" data-act="${act}" ${attrs}><span>${html}</span>${CHEV}</button>`;

function calendario(): string {
  const dias = Array.from({ length: 15 }, (_, n) => fechaDe(n)), meses = [...new Set(dias.map((f) => f.slice(0, 7)))];
  return meses.map((m) => {
    const d0 = fd(m + "-01"), n = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + 1, 0)).getUTCDate();
    const lead = (d0.getUTCDay() + 6) % 7, ok = (i: number) => { const o = desde(m + "-" + String(i + 1).padStart(2, "0")); return o >= 0 && o <= 14; };
    const hab = Array.from({ length: n }, (_, i) => i).filter(ok), r0 = Math.floor((hab[0] + lead) / 7), r1 = Math.floor((hab[hab.length - 1] + lead) / 7); // solo las semanas con días habilitados
    const celdas = Array.from({ length: n }, (_, i) => i).filter((i) => Math.floor((i + lead) / 7) >= r0 && Math.floor((i + lead) / 7) <= r1).map((i) => {
      const o = desde(m + "-" + String(i + 1).padStart(2, "0"));
      return ok(i) ? `<button class="d${ui.dia === o ? " on" : ""}" data-act="s-dia" data-v="${o}">${i + 1}${o === 0 ? `<em>HOY</em>` : ""}</button>` : `<span class="d off">${i + 1}</span>`;
    });
    return `<h3 class="mes">${MESES[d0.getUTCMonth()][0].toUpperCase() + MESES[d0.getUTCMonth()].slice(1)} ${d0.getUTCFullYear()}</h3><div class="cal7">${"LMMJVSD".split("").map((l) => `<b>${l}</b>`).join("")}${'<span></span>'.repeat(r0 ? 0 : lead)}${celdas.join("")}</div>`;
  }).join("");
}

function paso(): string {
  const f = fechaDe(ui.dia), res = ui.paso >= 2 ? buscar() : [];
  if (ui.paso === 1) return `<label class="loc">Jugás en ${locSelect("s-loc")}</label>${calendario()}`;
  if (ui.paso === 2) {
    const hs = porHora(res);
    return `<div class="fgrid">${FRANJAS.map(([k, l]) => `<button class="fcard${ui.fr === k ? " on" : ""}" data-act="s-franja" data-v="${k}"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONOS[k]}</svg><b>${k ? l.split(" ")[0] : l}</b><small>${k ? l.split(" ")[1] + " h" : "Sin filtro"}</small></button>`).join("")}</div>
    <h4>Duración</h4>${durChips()}<h4>Horarios libres</h4>`
      + (hs.length ? `<div class="times g">${hs.map(([h, o]) => `<button class="slot" data-act="slot" data-fecha="${f}" data-hora="${h}">${h}<small>${o.length} ${o.length === 1 ? "Cancha" : "Canchas"}</small></button>`).join("")}</div>`
        : `<p class="muted vacio">No hay horarios libres. Probá otra franja u otro día.</p><button class="btn sec full" data-act="s-ir" data-v="1">Cambiar de día</button>`);
  }
  const o = opciones();
  return `<button class="btn go full igual" data-act="s-igual"><b>Me da igual</b><small>Te reservamos ${esc(S.nombreClub(o[0].club))} · ${esc(o[0].cancha)}</small></button>`
    + [...new Set(o.map((x) => x.club))].map((c) => `<h4>${esc(S.nombreClub(c))}</h4>` + o.filter((x) => x.club === c).map((x) => opt("s-opcion", `data-club="${esc(c)}" data-cancha="${esc(x.cancha)}"`, `<b>${esc(x.cancha)}</b><small>Libre de ${rango(ui.hora, ui.bloques)}</small>`)).join("")).join("");
}
const opciones = () => porHora(buscar()).find(([h]) => h === ui.hora)?.[1] ?? [];

function busqueda(): string {
  if (!ui.busca) return "";
  const f = FRANJAS.find((x) => x[0] === ui.fr)!, p = ui.paso;
  const resumen = [[2, loc().localidad], [2, fechaLarga(fechaDe(ui.dia))], [3, f[0] ? f[1].split(" ")[0] : f[1]], [3, DURS.find((d) => d[0] === ui.bloques)![1]], [3, ui.hora]].filter(([k]) => p >= +k).map(([, t]) => t).join(" · ");
  return `<div class="scrim pscrim" data-act="buscar-scrim"></div><div class="busqueda${ui.anim === "p" ? " in" : ""}" data-paso="${p}"><div class="phead">
    <div class="nav">${p > 1 ? `<button class="x" data-act="s-atras" aria-label="Atrás"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>` : ""}<button class="x" data-act="buscar-cerrar" aria-label="Cerrar">✕</button></div>
    <div class="prog">${[1, 2, 3].map((i) => `<i${i <= p ? ' class="on"' : ""}></i>`).join("")}</div>
    <h2>${TITULOS[p - 1]}</h2><p class="muted resumen">${esc(resumen) || "&nbsp;"}</p></div>
    <div class="pbody"><div class="pstep${ui.anim === "f" ? " sf" : ui.anim === "b" ? " sb" : ""}">${paso()}</div></div></div>`;
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
  const libres = s.paso === "confirmar" ? libresEn(s.club, s.fecha, s.hora, s.bloques) : [], // si ya no hay libres (Horario ocupado) queda la elegida
    canchas = libres.length > 1 ? `<span class="seg-c">${libres.map((c) => chip("sheet-cancha", c, c, c === s.cancha)).join("")}</span>` : esc(s.cancha);
  const res = `<dl><dt>Club</dt><dd>${esc(S.nombreClub(s.club))}</dd><dt>Cancha</dt><dd>${canchas}</dd><dt>Fecha</dt><dd>${fechaLarga(s.fecha)}</dd>
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
const ir = (n: number, dir: string) => { ui.paso = n; ui.anim = dir; reset = true; }; // cambia de paso (dir "f" adelante / "b" atrás) y vuelve arriba
const limpiar = () => { ui.hora = ""; ui.tocado = true; }; // cambiar algo anterior borra lo posterior
const abrirSheet = (club: string, cancha: string, fecha: string, hora: string) => { ui.sheet = { club, cancha, fecha, hora, bloques: ui.bloques, paso: "confirmar", err: "" }; ui.anim = "s"; };
// "Volver" deja la búsqueda en su paso; "Listo" (Reserva ya hecha) cierra el panel y deja Partidas
const cerrarSheet = () => { if (ui.sheet?.paso !== "confirmar") ui.busca = false; ui.sheet = null; };
const ACT: Record<string, (v: string, el: HTMLElement) => void> = {
  tab: (v) => { ui.tab = v; reset = true; for (const k in errs) delete errs[k]; },
  user: (v) => S.setUsuario(v),
  loc: (v) => { ui.loc = +v; ui.clubSel = ""; limpiar(); ui.paso = 1; },
  "buscar-abrir": () => { ui.busca = true; ui.anim = "p"; },
  "buscar-cerrar": () => (ui.busca = false), "buscar-scrim": () => (ui.busca = false),
  "s-atras": () => ir(ui.paso - 1, "b"), "s-ir": (v) => ir(+v, "b"),
  "s-loc": (v) => { ui.loc = +v; ui.clubSel = ""; limpiar(); }, "s-dia": (v) => { ui.dia = +v; limpiar(); ir(2, "f"); },
  "s-franja": (v) => { ui.fr = v; limpiar(); }, dur: (v) => { ui.bloques = +v; limpiar(); },
  "s-opcion": (_, el) => abrirSheet(el.dataset.club!, el.dataset.cancha!, fechaDe(ui.dia), ui.hora),
  "s-igual": () => { const o = opciones()[0]; abrirSheet(o.club, o.cancha, fechaDe(ui.dia), ui.hora); },
  "sheet-cancha": (v) => (ui.sheet!.cancha = v), cdia: (v) => (ui.clubDia = +v), pdia: (v) => (ui.pDia = +v),
  club: (v) => { ui.clubSel = v; ui.clubDia = 0; reset = true; },
  atras: () => { ui.clubSel = ""; reset = true; },
  slot: (_, el) => {
    const d = el.dataset;
    if (d.cancha) return abrirSheet(d.club!, d.cancha, d.fecha!, d.hora!); // desde Clubes
    ui.hora = d.hora!; const o = opciones(); // desde la búsqueda: una sola opción salta el paso 3
    if (o.length === 1) abrirSheet(o[0].club, o[0].cancha, d.fecha!, d.hora!); else ir(3, "f");
  },
  cerrar: () => cerrarSheet(), "cerrar-scrim": () => cerrarSheet(),
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
