// Variante A — Calendario claro: arrastrar sobre Bloques libres, popover para el titular.
import { BLOQUES, CANCHAS, CLUB, FECHA, cancelar, crear, esc, getReserva, getReservas, hora, rangoLibre, subscribe } from "./store.js";

const H = 30; // alto de un Bloque en px

type Pop = { kind: "nueva"; cancha: number; lo: number; hi: number } | { kind: "ver"; id: number } | null;

export function mount(root: HTMLElement): () => void {
  let drag: { cancha: number; a: number; b: number } | null = null;
  let pop: Pop = null;
  let msg = "";

  function popoverHtml(cancha: number): string {
    if (!pop) return "";
    if (pop.kind === "nueva" && pop.cancha === cancha) {
      const top = pop.hi > 24 ? `bottom:${(BLOQUES - pop.lo) * H}px` : `top:${(pop.hi + 1) * H}px`;
      return `<form class="a-pop" style="${top}" data-form="nueva">
        <strong>${CANCHAS[cancha]}, ${hora(pop.lo)} a ${hora(pop.hi + 1)}</strong>
        <input name="titular" placeholder="Nombre del titular" autocomplete="off">
        ${msg ? `<p class="a-err">${esc(msg)}</p>` : ""}
        <div class="a-row"><button type="button" data-act="cerrar" class="a-ghost">Cancelar</button><button class="a-main">Reservar</button></div>
      </form>`;
    }
    if (pop.kind === "ver") {
      const r = getReserva(pop.id);
      if (r && r.cancha === cancha) {
        const top = r.fin > 24 ? `bottom:${(BLOQUES - r.inicio) * H}px` : `top:${r.fin * H}px`;
        return `<div class="a-pop" style="${top}">
          <strong>${esc(r.titular)}</strong>
          <span>${CANCHAS[r.cancha]}, ${hora(r.inicio)} a ${hora(r.fin)}</span>
          <div class="a-row"><button data-act="cerrar" class="a-ghost">Cerrar</button><button data-act="cancelar" data-id="${r.id}" class="a-danger">Cancelar Reserva</button></div>
        </div>`;
      }
    }
    return "";
  }

  function render() {
    const reservas = getReservas();
    const horas = Array.from({ length: BLOQUES / 2 }, (_, i) => `<div class="a-hora" style="height:${H * 2}px"><span>${hora(i * 2)}</span></div>`).join("");
    const cols = CANCHAS.map((_, c) => {
      const slots = Array.from({ length: BLOQUES }, (_, b) => `<div class="a-slot${b % 2 ? "" : " hr"}" data-c="${c}" data-b="${b}"></div>`).join("");
      const res = reservas.filter((r) => r.cancha === c).map((r) =>
        `<div class="a-res a-t${c}${pop && pop.kind === "ver" && pop.id === r.id ? " on" : ""}" data-id="${r.id}" style="top:${r.inicio * H}px;height:${(r.fin - r.inicio) * H - 2}px">
          <b>${esc(r.titular)}</b><span>${hora(r.inicio)} a ${hora(r.fin)}</span></div>`).join("");
      const draft = pop && pop.kind === "nueva" && pop.cancha === c
        ? `<div class="a-draft" style="top:${pop.lo * H}px;height:${(pop.hi - pop.lo + 1) * H - 2}px">(sin título)</div>` : "";
      return `<div class="a-col" data-c="${c}">${slots}${res}${draft}${popoverHtml(c)}</div>`;
    }).join("");
    root.innerHTML = `<div class="a-wrap">
      <header class="a-head"><div><h1>${CLUB}</h1><p>${FECHA}</p></div>
        <p class="a-hint">Arrastrá sobre horarios libres para crear una Reserva (mínimo 1 hora).</p></header>
      ${msg && !pop ? `<p class="a-toast">${esc(msg)}</p>` : ""}
      <div class="a-cal">
        <div class="a-heads"><div></div>${CANCHAS.map((n) => `<div>${n}</div>`).join("")}</div>
        <div class="a-body"><div class="a-gutter">${horas}</div>${cols}</div>
      </div></div>`;
    paintDrag();
    root.querySelector<HTMLInputElement>("input[name=titular]")?.focus();
  }

  function paintDrag() {
    const lo = drag ? Math.min(drag.a, drag.b) : 0;
    const hi = drag ? Math.max(drag.a, drag.b) : 0;
    root.querySelectorAll<HTMLElement>(".a-slot").forEach((s) => {
      s.classList.toggle("sel", !!drag && Number(s.dataset.c) === drag.cancha && Number(s.dataset.b) >= lo && Number(s.dataset.b) <= hi);
    });
  }

  root.addEventListener("mousedown", (e) => {
    const t = e.target as HTMLElement;
    const slot = t.closest<HTMLElement>(".a-slot");
    if (!slot || e.button !== 0) return;
    const c = Number(slot.dataset.c), b = Number(slot.dataset.b);
    if (pop || msg) { pop = null; msg = ""; render(); }
    drag = { cancha: c, a: b, b };
    paintDrag();
    e.preventDefault();
  });
  root.addEventListener("mouseover", (e) => {
    if (!drag) return;
    const slot = (e.target as HTMLElement).closest<HTMLElement>(".a-slot");
    if (!slot || Number(slot.dataset.c) !== drag.cancha) return;
    const nb = Number(slot.dataset.b);
    if (rangoLibre(drag.cancha, Math.min(drag.a, nb), Math.max(drag.a, nb))) { drag.b = nb; paintDrag(); }
  });
  const onUp = () => {
    if (!drag) return;
    const lo = Math.min(drag.a, drag.b), hi = Math.max(drag.a, drag.b);
    const cancha = drag.cancha;
    drag = null;
    if (hi - lo + 1 < 2) msg = "Una Reserva necesita al menos 2 Bloques (1 hora). Arrastrá más.";
    else { pop = { kind: "nueva", cancha, lo, hi }; msg = ""; }
    render();
  };
  document.addEventListener("mouseup", onUp);

  root.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    const act = t.closest<HTMLElement>("[data-act]");
    if (act?.dataset.act === "cerrar") { pop = null; msg = ""; render(); return; }
    if (act?.dataset.act === "cancelar") { const id = Number(act.dataset.id); pop = null; cancelar(id); return; }
    const res = t.closest<HTMLElement>(".a-res");
    if (res) { pop = { kind: "ver", id: Number(res.dataset.id) }; msg = ""; render(); }
  });
  root.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!pop || pop.kind !== "nueva") return;
    const titular = new FormData(e.target as HTMLFormElement).get("titular") as string;
    const err = crear(pop.cancha, pop.lo, pop.hi + 1, titular);
    if (err) { msg = err; render(); }
    else { pop = null; msg = ""; render(); }
  });
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && pop) { pop = null; msg = ""; render(); } };
  document.addEventListener("keydown", onKey);

  const unsub = subscribe(render);
  render();
  return () => { unsub(); document.removeEventListener("mouseup", onUp); document.removeEventListener("keydown", onKey); };
}
