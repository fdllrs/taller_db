// Variante B — Tablero denso: clic en Bloque inicial, clic en Bloque final, panel lateral con formulario / detalle.
import { BLOQUES, CANCHAS, CLUB, FECHA, cancelar, crear, duracionTxt, esc, getReserva, getReservas, hora, rangoLibre, subscribe } from "./store.js";

const H = 17;

interface Draft { cancha: number; inicio: number; fin: number | null } // fin exclusivo

export function mount(root: HTMLElement): () => void {
  let draft: Draft | null = null;
  let sel: number | null = null;
  let titular = "";
  let msg = "";

  const opts = (from: number, to: number, cur: number | null, label: (n: number) => string) => {
    let s = cur === null ? `<option value="">elegí…</option>` : "";
    for (let i = from; i <= to; i++) s += `<option value="${i}"${i === cur ? " selected" : ""}>${label(i)}</option>`;
    return s;
  };

  function panel(): string {
    if (sel !== null) {
      const r = getReserva(sel);
      if (r) return `<h2>Reserva #${r.id}</h2>
        <dl><dt>titular</dt><dd>${esc(r.titular)}</dd><dt>cancha</dt><dd>${CANCHAS[r.cancha]}</dd>
        <dt>desde</dt><dd>${hora(r.inicio)}</dd><dt>hasta</dt><dd>${hora(r.fin)}</dd><dt>duración</dt><dd>${duracionTxt(r.fin - r.inicio)} (${r.fin - r.inicio} bloques)</dd></dl>
        <button data-act="cancelar" class="b-danger">Cancelar reserva</button>`;
    }
    if (!draft) return `<h2>Nueva reserva</h2><p class="b-dim">Clic en un bloque libre para el inicio, otro clic para el final. Clic en una reserva para ver el detalle.</p>${msg ? `<p class="b-err">${esc(msg)}</p>` : ""}`;
    const d = draft;
    return `<h2>Nueva reserva</h2><form>
      <label>cancha<select name="cancha">${opts(0, 3, d.cancha, (i) => CANCHAS[i])}</select></label>
      <label>desde<select name="inicio">${opts(0, BLOQUES - 2, d.inicio, hora)}</select></label>
      <label>hasta<select name="fin">${opts(d.inicio + 2, BLOQUES, d.fin, hora)}</select></label>
      <label>titular<input name="titular" value="${esc(titular)}" autocomplete="off"></label>
      ${d.fin !== null ? `<p class="b-dim">${duracionTxt(d.fin - d.inicio)} · ${d.fin - d.inicio} bloques</p>` : `<p class="b-dim">Falta elegir el bloque final.</p>`}
      ${msg ? `<p class="b-err">${esc(msg)}</p>` : ""}
      <div class="b-row"><button type="button" data-act="limpiar">Descartar</button><button class="b-ok">Confirmar</button></div></form>`;
  }

  function render() {
    const reservas = getReservas();
    const ocupados = reservas.reduce((n, r) => n + r.fin - r.inicio, 0);
    const pct = Math.round((ocupados * 100) / (BLOQUES * CANCHAS.length));
    const gutter = Array.from({ length: BLOQUES }, (_, b) => `<div class="b-t">${b % 2 ? "" : hora(b)}</div>`).join("");
    const cols = CANCHAS.map((_, c) => {
      const cells = Array.from({ length: BLOQUES }, (_, b) => `<div class="b-cell${b % 2 ? "" : " hr"}" data-c="${c}" data-b="${b}"></div>`).join("");
      const res = reservas.filter((r) => r.cancha === c).map((r) =>
        `<div class="b-res${sel === r.id ? " on" : ""}" data-id="${r.id}" style="top:${r.inicio * H}px;height:${(r.fin - r.inicio) * H - 1}px">${esc(r.titular)} <i>${hora(r.inicio)}-${hora(r.fin)}</i></div>`).join("");
      const dr = draft && draft.cancha === c && draft.fin !== null
        ? `<div class="b-draft" style="top:${draft.inicio * H}px;height:${(draft.fin - draft.inicio) * H - 1}px"></div>` : "";
      return `<div class="b-col" data-c="${c}">${cells}${res}${dr}</div>`;
    }).join("");
    root.innerHTML = `<div class="b-app">
      <header class="b-top"><b>${CLUB}</b><span>${FECHA}</span><span class="b-grow"></span><span>${reservas.length} reservas</span><span>ocupación ${pct}%</span></header>
      <div class="b-main">
        <div class="b-grid"><div class="b-heads"><div></div>${CANCHAS.map((n) => `<div>${n}</div>`).join("")}</div>
          <div class="b-body"><div class="b-gutter">${gutter}</div>${cols}</div></div>
        <aside class="b-side">${panel()}</aside>
      </div></div>`;
    paintPreview(null);
  }

  // Marca el rango entre el inicio elegido y el Bloque sobre el que está el mouse.
  function paintPreview(hover: number | null) {
    root.querySelectorAll<HTMLElement>(".b-cell").forEach((el) => {
      let on = false;
      if (draft) {
        const b = Number(el.dataset.b), c = Number(el.dataset.c);
        if (c === draft.cancha) {
          if (draft.fin === null) on = b === draft.inicio || (hover !== null && b >= Math.min(draft.inicio, hover) && b <= Math.max(draft.inicio, hover));
        }
      }
      el.classList.toggle("pre", on);
    });
  }

  root.addEventListener("mouseover", (e) => {
    const cell = (e.target as HTMLElement).closest<HTMLElement>(".b-cell");
    if (draft && draft.fin === null && cell && Number(cell.dataset.c) === draft.cancha) paintPreview(Number(cell.dataset.b));
  });

  root.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    const act = t.closest<HTMLElement>("[data-act]")?.dataset.act;
    if (act === "cancelar" && sel !== null) { const id = sel; sel = null; cancelar(id); return; }
    if (act === "limpiar") { draft = null; msg = ""; titular = ""; render(); return; }
    const res = t.closest<HTMLElement>(".b-res");
    if (res) { sel = Number(res.dataset.id); draft = null; msg = ""; render(); return; }
    const cell = t.closest<HTMLElement>(".b-cell");
    if (!cell) return;
    const c = Number(cell.dataset.c), b = Number(cell.dataset.b);
    msg = "";
    if (sel !== null) sel = null;
    if (draft && draft.fin === null && draft.cancha === c) {
      const lo = Math.min(draft.inicio, b), hi = Math.max(draft.inicio, b);
      if (!rangoLibre(c, lo, hi)) { msg = "Hay una Reserva en el medio."; render(); return; }
      draft = { cancha: c, inicio: lo, fin: hi + 1 };
    } else {
      draft = { cancha: c, inicio: b, fin: null };
    }
    render();
  });

  root.addEventListener("change", (e) => {
    const t = e.target as HTMLSelectElement;
    if (!draft || t.tagName !== "SELECT") return;
    const v = t.value === "" ? null : Number(t.value);
    if (t.name === "cancha") draft.cancha = v!;
    if (t.name === "inicio") { draft.inicio = v!; if (draft.fin !== null && draft.fin < draft.inicio + 2) draft.fin = draft.inicio + 2; }
    if (t.name === "fin") draft.fin = v;
    msg = "";
    render();
  });
  root.addEventListener("input", (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name === "titular") titular = t.value;
  });
  root.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!draft) return;
    if (draft.fin === null) { msg = "Elegí el bloque final."; render(); return; }
    const err = crear(draft.cancha, draft.inicio, draft.fin, titular);
    if (err) { msg = err; render(); return; }
    draft = null; titular = ""; msg = "";
    render();
  });
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { draft = null; sel = null; msg = ""; render(); } };
  document.addEventListener("keydown", onKey);

  // Si se cancela una Reserva seleccionada, que el panel no quede apuntando a la nada.
  const unsub = subscribe(() => { if (sel !== null && !getReserva(sel)) sel = null; render(); });
  render();
  return () => { unsub(); document.removeEventListener("keydown", onKey); };
}
