// Variante E — Neón: clic en un Bloque abre el formulario de C; arrastrar abre un menú simple.
// En los dos, y en una Reserva existente, el horario se puede editar con − / +.
import { BLOQUES, CANCHAS, CLUB, FECHA, cancelar, crear, duracionTxt, editar, esc, getReserva, getReservas, hora, rangoLibre, subscribe } from "./store.js";

const H = 40;

type Pop = { kind: "nueva" | "editar"; cancha: number; ini: number; fin: number; id: number; titular: string; msg: string } | null;
type Modal = { cancha: number; ini: number | null; dur: number; titular: string; msg: string } | null;

export function mount(root: HTMLElement): () => void {
  let drag: { cancha: number; a: number; b: number } | null = null;
  let pop: Pop = null;
  let modal: Modal = null;
  let focusTitular = false; // solo se enfoca al abrir, no en cada re-render

  const stepper = (k: "ini" | "fin", label: string, b: number) =>
    `<div class="e-step"><span>${label}</span><button type="button" data-step="${k}:-1" aria-label="${label} antes">−</button><b>${hora(b)}</b><button type="button" data-step="${k}:1" aria-label="${label} después">+</button></div>`;

  function popHtml(c: number): string {
    if (!pop || pop.cancha !== c) return "";
    const p = pop;
    const pos = p.fin > 22 ? `bottom:${(BLOQUES - p.ini) * H + 6}px` : `top:${p.fin * H + 6}px`;
    const titulo = p.kind === "nueva" ? "Nueva reserva" : esc(p.titular);
    const titular = p.kind === "nueva" ? `<input name="titular" value="${esc(p.titular)}" placeholder="Nombre del titular" autocomplete="off">` : "";
    const acciones = p.kind === "nueva"
      ? `<button type="button" class="e-btn e-sec" data-act="cerrar">Cerrar</button><button class="e-btn e-go">Reservar</button>`
      : `<button type="button" class="e-btn e-red" data-act="cancelar">Cancelar reserva</button><button class="e-btn e-go">Guardar</button>`;
    return `<form class="e-pop" style="${pos}">
      <div class="e-pop-h"><b>${titulo}</b><span>${duracionTxt(p.fin - p.ini)}</span></div>
      ${stepper("ini", "Inicio", p.ini)}${stepper("fin", "Fin", p.fin)}
      ${titular}
      ${p.msg ? `<p class="e-err">${esc(p.msg)}</p>` : ""}
      <div class="e-row">${acciones}</div>
    </form>`;
  }

  function modalHtml(): string {
    if (!modal) return "";
    const m = modal;
    const chips = Array.from({ length: BLOQUES - 1 }, (_, b) => {
      const ok = rangoLibre(m.cancha, b, b + m.dur - 1);
      return `<button type="button" class="e-chip${ok ? " free" : ""}${m.ini === b ? " on" : ""}" data-b="${b}" ${ok ? "" : "disabled"}>${hora(b)}</button>`;
    }).join("");
    return `<div class="e-scrim" data-act="cerrar"><form class="e-modal" role="dialog">
      <h2>Nueva reserva</h2>
      <div class="e-label">Cancha</div>
      <div class="e-pills">${CANCHAS.map((n, i) => `<button type="button" class="e-pill${m.cancha === i ? " on" : ""}" data-cancha="${i}">${n}</button>`).join("")}</div>
      <div class="e-label">Duración</div>
      <div class="e-dur"><button type="button" data-dur="-1" aria-label="Menos">−</button><b>${duracionTxt(m.dur)}</b><button type="button" data-dur="1" aria-label="Más">+</button></div>
      <div class="e-label">Hora de inicio <small>(en verde, lo libre)</small></div>
      <div class="e-chips">${chips}</div>
      <div class="e-label">Titular</div>
      <input name="titular" value="${esc(m.titular)}" placeholder="Nombre y apellido" autocomplete="off">
      ${m.msg ? `<p class="e-err">${esc(m.msg)}</p>` : ""}
      <div class="e-row e-end"><button type="button" class="e-btn e-sec" data-act="cerrar">Cerrar</button><button class="e-btn e-go">Reservar</button></div>
    </form></div>`;
  }

  function render() {
    const y = window.scrollY;
    const reservas = getReservas();
    const gutter = Array.from({ length: BLOQUES }, (_, b) => `<div class="e-t">${b % 2 ? "" : hora(b)}</div>`).join("");
    const cols = CANCHAS.map((_, c) => {
      const slots = Array.from({ length: BLOQUES }, (_, b) => `<div class="e-slot${b % 2 ? "" : " hr"}" data-c="${c}" data-b="${b}"></div>`).join("");
      const res = reservas.filter((r) => r.cancha === c).map((r) => {
        const editing = pop?.kind === "editar" && pop.id === r.id;
        return `<div class="e-res${editing ? " editing" : ""}" data-id="${r.id}" style="top:${r.inicio * H}px;height:${(r.fin - r.inicio) * H - 4}px"><b>${esc(r.titular)}</b><span>${hora(r.inicio)}–${hora(r.fin)}</span></div>`;
      }).join("");
      const draft = pop && pop.cancha === c ? `<div class="e-draft" style="top:${pop.ini * H}px;height:${(pop.fin - pop.ini) * H - 4}px"></div>` : "";
      return `<div class="e-col">${slots}${res}${draft}${popHtml(c)}</div>`;
    }).join("");
    root.innerHTML = `<div class="e-app">
      <header class="e-head"><h1>${CLUB}</h1><span>${FECHA}</span><span class="e-hint">Clic en un horario libre o arrastrá para reservar</span></header>
      <div class="e-heads"><div></div>${CANCHAS.map((n) => `<div>${n}</div>`).join("")}</div>
      <div class="e-body"><div>${gutter}</div>${cols}</div></div>${modalHtml()}`;
    window.scrollTo(0, y); // al reconstruir todo el DOM hay que restaurar el scroll a mano
    paintDrag();
    if (focusTitular) { root.querySelector<HTMLInputElement>("input[name=titular]")?.focus(); focusTitular = false; }
  }

  function paintDrag() {
    const lo = drag ? Math.min(drag.a, drag.b) : 0;
    const hi = drag ? Math.max(drag.a, drag.b) : 0;
    root.querySelectorAll<HTMLElement>(".e-slot").forEach((s) => {
      const b = Number(s.dataset.b);
      s.classList.toggle("sel", !!drag && Number(s.dataset.c) === drag.cancha && b >= lo && b <= hi);
    });
  }

  const cerrar = () => { pop = null; modal = null; render(); };

  root.addEventListener("pointerdown", (e) => {
    const slot = (e.target as HTMLElement).closest<HTMLElement>(".e-slot");
    if (!slot || (e.pointerType === "mouse" && e.button !== 0)) return;
    if (pop) { pop = null; render(); }
    const b = Number(slot.dataset.b);
    drag = { cancha: Number(slot.dataset.c), a: b, b };
    paintDrag();
    e.preventDefault();
  });
  // Con touch el puntero queda capturado por el primer elemento: se busca el Bloque bajo el dedo a mano.
  const onMove = (e: PointerEvent) => {
    if (!drag) return;
    const slot = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>(".e-slot");
    if (!slot || Number(slot.dataset.c) !== drag.cancha) return;
    const nb = Number(slot.dataset.b);
    if (rangoLibre(drag.cancha, Math.min(drag.a, nb), Math.max(drag.a, nb))) { drag.b = nb; paintDrag(); }
  };
  const onUp = () => {
    if (!drag) return;
    const lo = Math.min(drag.a, drag.b), hi = Math.max(drag.a, drag.b), cancha = drag.cancha;
    drag = null;
    focusTitular = true;
    if (lo === hi) modal = { cancha, ini: lo, dur: 2, titular: "", msg: "" }; // clic: formulario completo
    else pop = { kind: "nueva", cancha, ini: lo, fin: hi + 1, id: 0, titular: "", msg: "" }; // arrastre: menú simple
    render();
  };
  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);

  root.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    const act = t.closest<HTMLElement>("[data-act]");
    if (act?.dataset.act === "cerrar" && (act.tagName === "BUTTON" || t === act)) { cerrar(); return; }
    if (act?.dataset.act === "cancelar" && pop?.kind === "editar") { const id = pop.id; pop = null; cancelar(id); return; }
    const step = t.closest<HTMLElement>("[data-step]")?.dataset.step;
    if (step && pop) {
      const [k, d] = step.split(":");
      if (k === "ini") { const n = pop.ini + Number(d); if (n >= 0 && pop.fin - n >= 2) pop.ini = n; }
      else { const n = pop.fin + Number(d); if (n <= BLOQUES && n - pop.ini >= 2) pop.fin = n; }
      pop.msg = ""; render(); return;
    }
    if (modal) {
      const m = modal;
      const cancha = t.closest<HTMLElement>("[data-cancha]")?.dataset.cancha;
      const dur = t.closest<HTMLElement>("[data-dur]")?.dataset.dur;
      const chip = t.closest<HTMLElement>(".e-chip");
      if (cancha !== undefined) { m.cancha = Number(cancha); m.msg = ""; render(); }
      else if (dur !== undefined) { m.dur = Math.max(2, Math.min(BLOQUES, m.dur + Number(dur))); m.msg = ""; render(); }
      else if (chip) { m.ini = Number(chip.dataset.b); m.msg = ""; render(); }
      return;
    }
    const res = t.closest<HTMLElement>(".e-res");
    if (res) {
      const r = getReserva(Number(res.dataset.id))!;
      pop = { kind: "editar", cancha: r.cancha, ini: r.inicio, fin: r.fin, id: r.id, titular: r.titular, msg: "" };
      render();
    }
  });
  root.addEventListener("input", (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name !== "titular") return;
    if (modal) modal.titular = t.value; else if (pop) pop.titular = t.value;
  });
  root.addEventListener("submit", (e) => {
    e.preventDefault();
    if (modal) {
      const m = modal;
      const err = m.ini === null ? "Elegí una hora de inicio." : crear(m.cancha, m.ini, m.ini + m.dur, m.titular);
      if (err) { m.msg = err; render(); } else cerrar();
      return;
    }
    if (!pop) return;
    const p = pop;
    const err = p.kind === "nueva" ? crear(p.cancha, p.ini, p.fin, p.titular) : editar(p.id, p.ini, p.fin);
    if (err) { p.msg = err; render(); } else cerrar();
  });
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && (pop || modal)) cerrar(); };
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
