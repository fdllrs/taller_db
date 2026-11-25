// Variante C — Deportivo: botón "Nueva Reserva" abre un modal con horarios libres resaltados.
import { BLOQUES, CANCHAS, CLUB, FECHA, cancelar, crear, duracionTxt, esc, getReserva, getReservas, hora, rangoLibre, subscribe } from "./store.js";

const H = 44;

type Modal =
  | { kind: "nueva"; cancha: number; inicio: number | null; dur: number; titular: string; msg: string }
  | { kind: "ver"; id: number }
  | null;

// "Ahora" simulado: la hora real si cae dentro del horario del Club, si no 18:10 (para que se vea la línea).
function ahoraBloques(): number {
  const d = new Date();
  let min = d.getHours() * 60 + d.getMinutes();
  if (min < 480 || min >= 1440) min = 18 * 60 + 10;
  return (min - 480) / 30;
}

export function mount(root: HTMLElement): () => void {
  let modal: Modal = null;

  function modalHtml(): string {
    if (!modal) return "";
    if (modal.kind === "ver") {
      const r = getReserva(modal.id);
      if (!r) return "";
      return `<div class="c-scrim" data-act="cerrar"><div class="c-modal" role="dialog">
        <h2>${esc(r.titular)}</h2>
        <p class="c-big">${CANCHAS[r.cancha]} · ${hora(r.inicio)} a ${hora(r.fin)}</p>
        <p>${duracionTxt(r.fin - r.inicio)} (${r.fin - r.inicio} bloques)</p>
        <div class="c-actions"><button class="c-btn c-sec" data-act="cerrar">Volver</button><button class="c-btn c-red" data-act="cancelar" data-id="${r.id}">Cancelar reserva</button></div>
      </div></div>`;
    }
    const m = modal;
    const chips = Array.from({ length: BLOQUES }, (_, b) => {
      const ok = rangoLibre(m.cancha, b, b + m.dur - 1);
      return `<button class="c-chip${ok ? " free" : ""}${m.inicio === b ? " on" : ""}" data-b="${b}" ${ok ? "" : "disabled"}>${hora(b)}</button>`;
    }).join("");
    return `<div class="c-scrim" data-act="cerrar"><form class="c-modal" role="dialog">
      <h2>Nueva reserva</h2>
      <div class="c-label">Cancha</div>
      <div class="c-pills">${CANCHAS.map((n, i) => `<button type="button" class="c-pill${m.cancha === i ? " on" : ""}" data-cancha="${i}">${n}</button>`).join("")}</div>
      <div class="c-label">Duración</div>
      <div class="c-step"><button type="button" data-dur="-1" aria-label="Menos">−</button><b>${duracionTxt(m.dur)}</b><button type="button" data-dur="1" aria-label="Más">+</button><span>${m.dur} bloques</span></div>
      <div class="c-label">Hora de inicio <small>(en verde, lo que está libre)</small></div>
      <div class="c-chips">${chips}</div>
      <div class="c-label">Titular</div>
      <input name="titular" value="${esc(m.titular)}" placeholder="Nombre y apellido" autocomplete="off">
      ${m.msg ? `<p class="c-err">${esc(m.msg)}</p>` : ""}
      <div class="c-actions"><button type="button" class="c-btn c-sec" data-act="cerrar">Cancelar</button><button class="c-btn c-go">Confirmar reserva</button></div>
    </form></div>`;
  }

  function render() {
    const y = window.scrollY;
    const reservas = getReservas();
    const gutter = Array.from({ length: BLOQUES }, (_, b) => `<div class="c-t">${b % 2 ? "" : hora(b)}</div>`).join("");
    const cols = CANCHAS.map((_, c) => {
      const cells = Array.from({ length: BLOQUES }, (_, b) => `<div class="c-cell${b % 2 ? "" : " hr"}" data-c="${c}" data-b="${b}"></div>`).join("");
      const res = reservas.filter((r) => r.cancha === c).map((r) =>
        `<button class="c-res" data-id="${r.id}" style="top:${r.inicio * H}px;height:${(r.fin - r.inicio) * H - 4}px"><b>${esc(r.titular)}</b><span>${hora(r.inicio)} a ${hora(r.fin)}</span></button>`).join("");
      return `<div class="c-col">${cells}${res}</div>`;
    }).join("");
    const now = ahoraBloques();
    root.innerHTML = `<div class="c-app">
      <header class="c-hero"><div><h1>${CLUB}</h1><p>${FECHA}</p></div><button class="c-btn c-go c-new" data-act="nueva">Nueva Reserva</button></header>
      <div class="c-board">
        <div class="c-heads"><div></div>${CANCHAS.map((n) => `<div>${n}</div>`).join("")}</div>
        <div class="c-body"><div class="c-gutter">${gutter}</div>${cols}
          <div class="c-now" style="top:${now * H}px"><span>ahora</span></div></div>
      </div></div>${modalHtml()}`;
    window.scrollTo(0, y); // hay que restaurar el scroll a mano al reconstruir todo el DOM
    root.querySelector<HTMLInputElement>("input[name=titular]")?.focus();
  }

  root.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    const inModal = !!t.closest(".c-modal");
    const act = t.closest<HTMLElement>("[data-act]");
    if (act?.dataset.act === "cancelar") { const id = Number(act.dataset.id); modal = null; cancelar(id); return; }
    if (act?.dataset.act === "cerrar" && (!inModal || act.tagName === "BUTTON")) { modal = null; render(); return; }
    if (act?.dataset.act === "nueva") { modal = { kind: "nueva", cancha: 0, inicio: null, dur: 2, titular: "", msg: "" }; render(); return; }
    if (modal?.kind === "nueva") {
      const m = modal;
      const cancha = t.closest<HTMLElement>("[data-cancha]")?.dataset.cancha;
      const dur = t.closest<HTMLElement>("[data-dur]")?.dataset.dur;
      const chip = t.closest<HTMLElement>(".c-chip");
      if (cancha !== undefined) { m.cancha = Number(cancha); m.inicio = null; m.msg = ""; render(); }
      else if (dur !== undefined) { m.dur = Math.max(2, m.dur + Number(dur)); m.inicio = null; m.msg = ""; render(); }
      else if (chip) { m.inicio = Number(chip.dataset.b); m.msg = ""; render(); }
      return;
    }
    if (inModal) return;
    const res = t.closest<HTMLElement>(".c-res");
    if (res) { modal = { kind: "ver", id: Number(res.dataset.id) }; render(); return; }
    const cell = t.closest<HTMLElement>(".c-cell");
    if (cell) { modal = { kind: "nueva", cancha: Number(cell.dataset.c), inicio: Number(cell.dataset.b), dur: 2, titular: "", msg: "" }; render(); }
  });
  root.addEventListener("input", (e) => {
    const t = e.target as HTMLInputElement;
    if (modal?.kind === "nueva" && t.name === "titular") modal.titular = t.value;
  });
  root.addEventListener("submit", (e) => {
    e.preventDefault();
    if (modal?.kind !== "nueva") return;
    const m = modal;
    if (m.inicio === null) { m.msg = "Elegí una hora de inicio."; render(); return; }
    const err = crear(m.cancha, m.inicio, m.inicio + m.dur, m.titular);
    if (err) { m.msg = err; render(); } else { modal = null; render(); }
  });
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && modal) { modal = null; render(); } };
  document.addEventListener("keydown", onKey);

  const unsub = subscribe(render);
  render();
  return () => { unsub(); document.removeEventListener("keydown", onKey); };
}
