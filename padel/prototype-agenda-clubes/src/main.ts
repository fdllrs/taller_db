// PROTOTIPO descartable — ticket 'Agenda visual del Front de Clubes' (fdllrs/taller_db#15). Tres variantes vía ?variant=.
import { mount as mountA } from "./variantA.js";
import { mount as mountB } from "./variantB.js";
import { mount as mountC } from "./variantC.js";
import { getReservas, subscribe } from "./store.js";

const VARIANTS = [
  { key: "A", name: "Calendario claro", css: "styles/a.css", mount: mountA },
  { key: "B", name: "Tablero denso", css: "styles/b.css", mount: mountB },
  { key: "C", name: "Deportivo", css: "styles/c.css", mount: mountC },
];

const app = document.getElementById("app")!;
const cssLink = document.getElementById("variant-css") as HTMLLinkElement;

// --- switcher flotante ---
const sw = document.createElement("div");
sw.className = "sw-pill";
sw.innerHTML = `<button data-d="-1" aria-label="Variante anterior">◀</button><span class="sw-label"></span><button data-d="1" aria-label="Variante siguiente">▶</button>`;
document.body.append(sw);

// --- panel de debug (estado actual como JSON) ---
const dbg = document.createElement("details");
dbg.className = "dbg";
dbg.innerHTML = `<summary>Estado (debug)</summary><pre></pre>`;
document.body.append(dbg);
const pre = dbg.querySelector("pre")!;
const paintDebug = () => { pre.textContent = JSON.stringify(getReservas(), null, 1); };
subscribe(paintDebug);
paintDebug();

let current = Math.max(0, VARIANTS.findIndex((v) => v.key === new URLSearchParams(location.search).get("variant")?.toUpperCase()));
let unmount: () => void = () => {};

function show(i: number) {
  current = (i + VARIANTS.length) % VARIANTS.length;
  const v = VARIANTS[current];
  unmount();
  app.innerHTML = "";
  document.body.dataset.variant = v.key.toLowerCase();
  cssLink.href = v.css;
  const host = document.createElement("div"); // contenedor propio: los listeners mueren con él
  app.append(host);
  const stop = v.mount(host);
  unmount = () => { stop(); host.remove(); };
  sw.querySelector(".sw-label")!.textContent = `${v.key} (${v.name})`;
  history.replaceState(null, "", "?variant=" + v.key);
}

sw.addEventListener("click", (e) => {
  const d = (e.target as HTMLElement).closest("button")?.dataset.d;
  if (d) show(current + Number(d));
});
document.addEventListener("keydown", (e) => {
  const t = e.target as HTMLElement;
  if (t.matches("input, textarea, select") || t.isContentEditable) return;
  if (e.key === "ArrowLeft") show(current - 1);
  if (e.key === "ArrowRight") show(current + 1);
});

show(current);
