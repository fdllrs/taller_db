// Variante D — Deportivo simple: paleta y tipografía de C, creación por arrastre como A, popover mínimo.
import { BLOQUES, CANCHAS, CLUB, FECHA, cancelar, crear, duracionTxt, esc, getReserva, getReservas, hora, rangoLibre, subscribe } from "./store.js";

const H = 40;

type Pop = { kind: "nueva"; cancha: number; lo: number; hi: number } | { kind: "ver"; id: number } | null;

export function mount(root: HTMLElement): () => void {
  let drag: { cancha: number; a: number; b: number } | null = null;
  let pop: Pop = null;
  let msg = "";

  function popoverHtml(cancha: number): string {
    if (!pop) return "";
    if (pop.kind === "nueva" && pop.cancha === cancha) {
      const pos = pop.hi > 22 ? `bottom:${(BLOQUES - pop.lo) * H + 6}px` : `top:${(pop.hi + 1) * H + 6}px`;
      return `<form class="d-pop" style="${pos}">
        <b>${hora(pop.lo)} a ${hora(pop.hi + 1)} · ${duracionTxt(pop.hi - pop.lo + 1)}</b>
        <input name="titular" placeholder="Nombre del titular" autocomplete="off">
        ${msg ? `<p class="d-err">${esc(msg)}</p>` : ""}
        <div class="d-row"><button type="button" class="d-btn d-sec" data-act="cerrar">Cancelar</button><button class="d-btn d-go">Confirmar</button></div>
      </form>`;
    }
    if (pop.kind === "ver") {
      const r = getReserva(pop.id);
      if (r && r.cancha === cancha) {
        const pos = r.fin > 22 ? `bottom:${(BLOQUES - r.inicio) * H + 6}px` : `top:${r.fin * H + 6}px`;
        return `<div class="d-pop" style="${pos}">
          <b>${esc(r.titular)}</b><span>${hora(r.inicio)} a ${hora(r.fin)} · ${duracionTxt(r.fin - r.inicio)}</span>
          <div class="d-row"><button class="d-btn d-sec" data-act="cerrar">Cerrar</button><button class="d-btn d-red" data-act="cancelar" data-id="${r.id}">Cancelar reserva</button></div>
        </div>`;
      }
    }
    return "";
  }

  function render() {
    const reservas = getReservas();
    const gutter = Array.from({ length: BLOQUES }, (_, b) => `<div class="d-t">${b % 2 ? "" : hora(b)}</div>`).join("");
    const cols = CANCHAS.map((_, c) => {
      const slots = Array.from({ length: BLOQUES }, (_, b) => `<div class="d-slot${b % 2 ? "" : " hr"}" data-c="${c}" data-b="${b}"></div>`).join("");
      const res = reservas.filter((r) => r.cancha === c).map((r) =>
        `<div class="d-res${pop && pop.kind === "ver" && pop.id === r.id ? " on" : ""}" data-id="${r.id}" style="top:${r.inicio * H}px;height:${(r.fin - r.inicio) * H - 4}px"><b>${esc(r.titular)}</b><span>${hora(r.inicio)} a ${hora(r.fin)}</span></div>`).join("");
      const draft = pop && pop.kind === "nueva" && pop.cancha === c
        ? `<div class="d-draft" style="top:${pop.lo * H}px;height:${(pop.hi - pop.lo + 1) * H - 4}px"></div>` : "";
      return `<div class="d-col">${slots}${res}${draft}${popoverHtml(c)}</div>`;
    }).join("");
    root.innerHTML = `<div class="d-app">
      <header class="d-head"><h1>${CLUB}</h1><span>${FECHA}</span>
        <span class="d-hint">${msg && !pop ? `<em>${esc(msg)}</em>` : "Arrastrá sobre los horarios libres para reservar"}</span></header>
      <div class="d-heads"><div></div>${CANCHAS.map((n) => `<div>${n}</div>`).join("")}</div>
      <div class="d-body"><div>${gutter}</div>${cols}</div></div>`;
    paintDrag();
    root.querySelector<HTMLInputElement>("input[name=titular]")?.focus();
  }

  function paintDrag() {
    const lo = drag ? Math.min(drag.a, drag.b) : 0;
    const hi = drag ? Math.max(drag.a, drag.b) : 0;
    root.querySelectorAll<HTMLElement>(".d-slot").forEach((s) => {
      const b = Number(s.dataset.b);
      s.classList.toggle("sel", !!drag && Number(s.dataset.c) === drag.cancha && b >= lo && b <= hi);
    });
  }

  root.addEventListener("pointerdown", (e) => {
    const slot = (e.target as HTMLElement).closest<HTMLElement>(".d-slot");
    if (!slot || (e.pointerType === "mouse" && e.button !== 0)) return;
    const c = Number(slot.dataset.c), b = Number(slot.dataset.b);
    if (pop || msg) { pop = null; msg = ""; render(); }
    drag = { cancha: c, a: b, b };
    paintDrag();
    e.preventDefault();
  });
  // Con touch el puntero queda capturado por el primer elemento: se busca el Bloque bajo el dedo a mano.
  const onMove = (e: PointerEvent) => {
    if (!drag) return;
    const slot = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>(".d-slot");
    if (!slot || Number(slot.dataset.c) !== drag.cancha) return;
    const nb = Number(slot.dataset.b);
    if (rangoLibre(drag.cancha, Math.min(drag.a, nb), Math.max(drag.a, nb))) { drag.b = nb; paintDrag(); }
  };
  const onUp = () => {
    if (!drag) return;
    const lo = Math.min(drag.a, drag.b), hi = Math.max(drag.a, drag.b);
    const cancha = drag.cancha;
    drag = null;
    if (hi - lo + 1 < 2) msg = "Mínimo 2 bloques (1 hora): arrastrá un poco más.";
    else { pop = { kind: "nueva", cancha, lo, hi }; msg = ""; }
    render();
  };
  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);

  root.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    const act = t.closest<HTMLElement>("[data-act]");
    if (act?.dataset.act === "cerrar") { pop = null; msg = ""; render(); return; }
    if (act?.dataset.act === "cancelar") { const id = Number(act.dataset.id); pop = null; cancelar(id); return; }
    const res = t.closest<HTMLElement>(".d-res");
    if (res) { pop = { kind: "ver", id: Number(res.dataset.id) }; msg = ""; render(); }
  });
  root.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!pop || pop.kind !== "nueva") return;
    const err = crear(pop.cancha, pop.lo, pop.hi + 1, new FormData(e.target as HTMLFormElement).get("titular") as string);
    if (err) { msg = err; render(); } else { pop = null; msg = ""; render(); }
  });
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && pop) { pop = null; msg = ""; render(); } };
  document.addEventListener("keydown", onKey);

  const unsub = subscribe(render);
  render();
  return () => {
    unsub();
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("keydown", onKey);
  };
}
