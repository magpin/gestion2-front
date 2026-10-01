"use client";

import { Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import type { EstadoMaria } from "@/modules/asistente/components/Maria";
import { Maria } from "@/modules/asistente/components/Maria";
import { Visto } from "./Marca";

/**
 * «María, en acción»: cuatro capítulos del producto de hoy, con datos de ejemplo.
 *
 * Es un guion sobre una línea de tiempo: cada capítulo es una lista de momentos
 * (`en` milisegundos) y lo que se ve depende del tiempo transcurrido. Así pausar
 * es dejar de sumar tiempo, saltar de capítulo es volver a cero, y con movimiento
 * reducido se muestra el capítulo entero, quieto.
 *
 * El guion sigue al producto real (verificado el 25 sep 2026, `landing-maria.md`
 * §4.4): la factura se aprueba **en la factura leída** y el asiento nace
 * contabilizado; las comprobaciones son tres; lo apartado llega con su razón;
 * sin retención en el asiento. Voseo, como el producto.
 *
 * Corre solo cuando se ve: arranca al entrar en pantalla y se pausa al salir,
 * salvo que la persona lo haya pausado a mano. En un contenedor angosto (el
 * celular) se muestra solo el chat.
 */

interface Capitulo {
  titulo: string;
  dura: number;
  leyendas: Array<[number, string]>;
}

const CAPITULOS: Capitulo[] = [
  {
    titulo: "Configure su empresa con IA",
    dura: 19000,
    leyendas: [
      [0, "Al abrir la configuración, María pide los documentos de la empresa."],
      [2200, "Usted le sube el RUT y ella lo lee casilla por casilla."],
      [9800, "Le muestra lo que encontró, con la casilla de donde salió."],
      [14000, "Lo que los papeles no dicen, se lo pregunta."],
    ],
  },
  {
    titulo: "Pregúntele a María",
    dura: 14500,
    leyendas: [
      [0, "Usted le pregunta como le preguntaría a una colega."],
      [4200, "Responde con el dato exacto y dice de dónde salió."],
    ],
  },
  {
    titulo: "Registre facturas",
    dura: 18000,
    leyendas: [
      [0, "Usted le sube varias facturas a la vez."],
      [2200, "Las lee con avance real: cuántas lleva y cuántas faltan."],
      [8200, "Deja lista la que cuadra y aparta las demás con la razón."],
      [13500, "La repetida usted la descarta con un clic; queda quién y por qué."],
    ],
  },
  {
    titulo: "Apruebe y rastree",
    dura: 16000,
    leyendas: [
      [0, "Usted revisa la factura: comprobaciones, renglones y la cuenta recordada."],
      [4200, "La aprueba, y el asiento nace contabilizado a su nombre."],
      [6800, "Cada paso queda en la trazabilidad, que no se puede editar."],
    ],
  },
];

const FINAL_MS = 4000;

/**
 * Por dónde anda el cursor en cada capítulo: a qué `data-objetivo` va y, si
 * hace clic, cuándo. Llega unos 800 ms antes del clic —el viaje dura 750— y el
 * botón queda resaltado mientras «se presiona» (`apretado`), así que se ven las
 * dos cosas: la mano que va y el botón que responde.
 */
interface Movimiento {
  en: number;
  objetivo: string;
  clic?: number;
}

const CURSOR: Movimiento[][] = [
  [
    { en: 600, objetivo: "compositor", clic: 1400 },
    { en: 12000, objetivo: "todo-correcto", clic: 12800 },
    { en: 15400, objetivo: "no", clic: 16200 },
  ],
  [{ en: 200, objetivo: "compositor", clic: 700 }],
  [
    { en: 100, objetivo: "compositor", clic: 500 },
    { en: 13600, objetivo: "descartar", clic: 14400 },
  ],
  [{ en: 2600, objetivo: "registrar", clic: 3400 }],
];

const DURA_CLIC_MS = 450;

/** Cuánto de un texto se ve a un tiempo dado: escribe a ~22 caracteres por segundo. */
function tipeo(texto: string, t: number, desde: number, cps = 22): string {
  if (t <= desde) return "";
  return texto.slice(0, Math.floor(((t - desde) / 1000) * cps));
}

/** Lo que aparece a partir de un momento, con la entrada de siempre. */
function Aparece({ t, en, children }: { t: number; en: number; children: ReactNode }) {
  if (t < en) return null;
  return <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">{children}</div>;
}

export function DemoMaria() {
  const [cap, setCap] = useState(0);
  const [t, setT] = useState(0);
  const [corriendo, setCorriendo] = useState(false);
  const [final, setFinal] = useState(false);
  const pausaUsuario = useRef(false);
  const visible = useRef(false);
  const reducido = useRef(false);
  const marco = useRef<HTMLDivElement>(null);
  const chat = useRef<HTMLDivElement>(null);

  const ir = useCallback((i: number) => {
    setCap(i);
    setFinal(false);
    setT(reducido.current ? CAPITULOS[i]!.dura : 0);
  }, []);

  // Arranca al verse; se pausa al salir.
  useEffect(() => {
    reducido.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducido.current) {
      const t0 = setTimeout(() => setT(CAPITULOS[0]!.dura), 0);
      return () => clearTimeout(t0);
    }
    const el = marco.current;
    if (!el) return;
    const o = new IntersectionObserver(
      ([e]) => {
        visible.current = e!.isIntersecting;
        if (!pausaUsuario.current) setCorriendo(e!.isIntersecting);
      },
      { threshold: 0.35 },
    );
    o.observe(el);
    return () => o.disconnect();
  }, []);

  // El reloj.
  useEffect(() => {
    if (!corriendo) return;
    let previo = performance.now();
    let cuadro = requestAnimationFrame(function paso(ahora) {
      const dt = ahora - previo;
      previo = ahora;
      setT((x) => x + dt);
      cuadro = requestAnimationFrame(paso);
    });
    return () => cancelAnimationFrame(cuadro);
  }, [corriendo]);

  // Fin de capítulo → el siguiente; después del último, la pantalla final.
  useEffect(() => {
    if (reducido.current) return;
    const dura = final ? FINAL_MS : CAPITULOS[cap]!.dura;
    if (t < dura) return;
    const siguiente = setTimeout(() => {
      if (final) {
        ir(0);
      } else if (cap === CAPITULOS.length - 1) {
        setFinal(true);
        setT(0);
      } else {
        ir(cap + 1);
      }
    }, 0);
    return () => clearTimeout(siguiente);
  }, [t, cap, final, ir]);

  // El chat baja solo, como el de verdad.
  useEffect(() => {
    const el = chat.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [t, cap]);

  const alternar = () => {
    pausaUsuario.current = corriendo;
    setCorriendo(!corriendo);
  };

  const elegir = (i: number) => {
    pausaUsuario.current = false;
    ir(i);
    if (!reducido.current) setCorriendo(true);
  };

  const capitulo = CAPITULOS[cap]!;
  const leyenda = [...capitulo.leyendas].reverse().find(([en]) => t >= en)?.[1] ?? "";

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={marco}
        className="@container relative overflow-hidden rounded-[1.05rem] border border-rail-line bg-background text-foreground shadow-[0_30px_60px_rgb(0_0_0/35%)]"
      >
        {!final && <Cursor marco={marco} cap={cap} t={t} />}
        {final ? (
          <PantallaFinal />
        ) : (
          <div className="flex h-[540px] @[700px]:h-[560px]">
            <Costado cap={cap} t={t} />
            <div className="flex min-w-0 grow flex-col">
              <Cabeza cap={cap} t={t} />
              <div ref={chat} className="flex grow flex-col gap-4 overflow-y-auto px-4 py-5 @[700px]:px-7">
                {cap === 0 && <Capitulo1 t={t} />}
                {cap === 1 && <Capitulo2 t={t} />}
                {cap === 2 && <Capitulo3 t={t} />}
                {cap === 3 && <Capitulo4 t={t} />}
              </div>
              <div className="shrink-0 border-t border-border px-4 py-3 @[700px]:px-7">
                <div
                  data-objetivo="compositor"
                  className="flex h-11 items-center rounded-xl border border-input px-4 text-[13px] text-muted-foreground"
                >
                  {cap === 0
                    ? "Escriba o arrastre aquí el RUT, la Cámara de Comercio o la resolución"
                    : "Pregunte cómo hacer algo, o arrastre aquí facturas, pedidos o el RUT"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controles: pausa y capítulos. En el celular, los capítulos en carrusel. */}
      <div className="flex items-stretch gap-2.5">
        <button
          type="button"
          onClick={alternar}
          aria-label={corriendo ? "Pausar la demostración" : "Reproducir la demostración"}
          className="flex w-12 shrink-0 items-center justify-center rounded-xl border border-rail-line bg-rail-foreground/10 text-rail-foreground hover:bg-rail-foreground/15"
        >
          {corriendo ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
        <ol className="m-0 flex grow list-none snap-x snap-mandatory gap-2.5 overflow-x-auto p-0 [scrollbar-width:none] sm:grid sm:grid-cols-4 sm:overflow-visible">
          {CAPITULOS.map((c, i) => {
            const activo = i === cap && !final;
            const avance = activo ? Math.min(1, t / c.dura) : i < cap || final ? 1 : 0;
            return (
              <li key={c.titulo} className="w-[68%] shrink-0 snap-start sm:w-auto">
                <button
                  type="button"
                  onClick={() => elegir(i)}
                  aria-current={activo ? "step" : undefined}
                  className={`flex h-full w-full flex-col gap-2 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                    activo
                      ? "border-rail-foreground/70 bg-rail-foreground/10"
                      : "border-rail-line bg-rail-foreground/[0.04] hover:bg-rail-foreground/[0.08]"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-rail-muted">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="rounded-full border border-success/40 bg-success/15 px-2 py-px text-[10px] font-medium text-rail-foreground">
                      Hoy
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-rail-foreground">{c.titulo}</span>
                  <span className="h-0.5 w-full overflow-hidden rounded-full bg-rail-line">
                    <span
                      className="block h-full rounded-full bg-rail-foreground"
                      style={{ width: `${avance * 100}%` }}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <p aria-live="polite" className="m-0 min-h-5 text-sm text-rail-foreground">
        {!final && (
          <>
            <span className="font-medium">{cap + 1}.</span> {leyenda}
          </>
        )}
      </p>
      <p className="m-0 text-xs text-rail-muted">Demostración con datos de ejemplo.</p>
    </div>
  );
}

// ─── El cursor ────────────────────────────────────────────────────────────────

/**
 * La flecha que va a los botones y hace clic. Lee la posición real del
 * objetivo en el marco en cada cuadro, así que sigue al botón aunque el chat
 * se desplace. Decorativa: `aria-hidden`, y nunca intercepta un clic.
 */
function Cursor({
  marco,
  cap,
  t,
}: {
  marco: React.RefObject<HTMLDivElement | null>;
  cap: number;
  t: number;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const mov = [...CURSOR[cap]!].reverse().find((m) => t >= m.en);
  const clicando = mov?.clic !== undefined && t >= mov.clic && t < mov.clic + DURA_CLIC_MS;

  useEffect(() => {
    const raiz = marco.current;
    if (!raiz || !mov) return;
    const el = raiz.querySelector<HTMLElement>(`[data-objetivo="${mov.objetivo}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const m = raiz.getBoundingClientRect();
    // Apunta un poco adentro del botón, no a su centro exacto: así lo hace una mano.
    const x = r.left - m.left + Math.min(r.width * 0.6, r.width - 10);
    const y = r.top - m.top + r.height * 0.6;
    const t0 = setTimeout(() => setPos({ x, y }), 0);
    return () => clearTimeout(t0);
  }, [marco, mov, t]);

  if (!mov || !pos) return null;
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 z-20 transition-transform duration-[750ms] ease-[cubic-bezier(0.3,0.7,0.2,1)] motion-reduce:hidden"
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
    >
      {/* El pulso del clic, detrás de la punta. */}
      <span
        className={`absolute -top-3 -left-3 size-6 rounded-full bg-brand/35 transition-[transform,opacity] duration-[450ms] ease-out ${
          clicando ? "scale-150 opacity-100" : "scale-50 opacity-0"
        }`}
      />
      <svg
        width="20"
        height="22"
        viewBox="0 0 20 22"
        className={`relative drop-shadow-[0_2px_3px_rgb(0_0_0/35%)] transition-transform duration-150 ${clicando ? "scale-90" : ""}`}
      >
        <path
          d="M2 1.5 L2 17.5 L6.4 13.4 L9.4 20.2 L12.4 18.9 L9.5 12.2 L15.5 12.2 Z"
          fill="var(--neutral-0)"
          stroke="var(--neutral-900)"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

// ─── Las piezas de la pantalla ────────────────────────────────────────────────

/** El costado: la configuración en el capítulo 1, el menú del sistema en los otros. */
function Costado({ cap, t }: { cap: number; t: number }) {
  if (cap === 0) {
    const listos = t >= 13500 ? 2 : 1;
    const pasos = ["Empresa", "Sedes", "Situación legal", "Plan de cuentas", "Resoluciones"];
    return (
      <aside className="hidden w-[260px] shrink-0 flex-col gap-5 border-r border-border bg-rail px-5 py-6 text-rail-foreground @[700px]:flex">
        <span className="font-mono text-[10px] tracking-[1.4px] text-rail-muted uppercase">
          Configuración inicial
        </span>
        <span className="font-serif text-2xl leading-tight">Distribuidora Andina S.A.S.</span>
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-1">
            {pasos.map((p, i) => (
              <span
                key={p}
                className={`h-1 grow rounded-full transition-colors duration-500 ${i < listos ? "bg-rail-foreground" : "bg-rail-line"}`}
              />
            ))}
          </div>
          <span className="text-xs text-rail-muted">
            {listos} de 5 listos
          </span>
        </div>
        <ol className="m-0 flex list-none flex-col gap-3 p-0 text-[13px]">
          {pasos.map((p, i) => (
            <li key={p} className="flex items-center gap-2.5">
              <span
                className={`flex size-4 items-center justify-center rounded-full border ${
                  i < listos
                    ? "border-rail-foreground bg-rail-foreground text-rail"
                    : i === listos
                      ? "border-brand"
                      : "border-rail-line"
                }`}
              >
                {i < listos && <Visto size={10} strokeWidth={3} />}
              </span>
              <span className={i <= listos ? "text-rail-foreground" : "text-rail-muted"}>{p}</span>
            </li>
          ))}
        </ol>
        <p className="m-0 mt-auto rounded-lg border border-rail-line p-3 text-xs leading-relaxed text-rail-muted">
          <strong className="text-rail-foreground">Modo IA.</strong> Los pasos se llenan a medida
          que María lee sus documentos. Usted confirma cada uno.
        </p>
      </aside>
    );
  }
  const menu = ["Inicio", "María", "Ventas", "Compras", "Tesorería", "Libro", "Reportes"];
  const activo = cap === 3 ? "Libro" : "María";
  return (
    <aside className="hidden w-[200px] shrink-0 flex-col gap-1 border-r border-border bg-card px-3 py-5 @[700px]:flex">
      <span className="mb-3 px-2 text-sm font-semibold">Distribuidora Andina</span>
      {menu.map((m) => (
        <span
          key={m}
          className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] ${
            m === activo ? "bg-secondary font-medium" : "text-muted-foreground"
          }`}
        >
          {m === "María" && <Maria estado="reposo" tamano={16} />}
          {m}
        </span>
      ))}
      <span className="mt-auto px-2 text-xs text-muted-foreground">Camila Torres · Contadora</span>
    </aside>
  );
}

function Cabeza({ cap, t }: { cap: number; t: number }) {
  const titulo = cap === 0 ? "Asistente de configuración · con IA" : "María";
  const sub =
    cap === 0
      ? t >= 2200 && t < 9800
        ? "Leyendo su documento…"
        : "Nada se guarda sin su confirmación"
      : cap === 1 && t >= 4200 && t < 5600
        ? "Escribiendo…"
        : "Nada se asienta sin su aprobación";
  return (
    <div className="flex h-14 shrink-0 flex-col justify-center border-b border-border px-4 @[700px]:px-7">
      <span className="text-[13px] font-semibold">{titulo}</span>
      <span className="text-[11px] text-muted-foreground">{sub}</span>
    </div>
  );
}

/** Un turno de María: su cara a la izquierda, que es la que cambia de estado. */
function DeMaria({ estado = "reposo", children }: { estado?: EstadoMaria; children: ReactNode }) {
  const trabajando = estado !== "reposo" && estado !== "lista";
  return (
    <div className="flex items-start gap-3">
      <Maria
        estado={estado}
        tamano={trabajando ? 40 : 28}
        intensidad={trabajando ? undefined : "suave"}
        className={trabajando ? "-my-1.5 -ml-1.5" : undefined}
      />
      <div className="flex min-w-0 grow flex-col gap-3 pt-1 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function DeLaPersona({ archivos, children }: { archivos?: string[]; children: ReactNode }) {
  return (
    <div className="flex flex-col items-end gap-2">
      {archivos && (
        <div className="flex flex-wrap justify-end gap-1.5">
          {archivos.map((a) => (
            <span key={a} className="rounded-md border border-border bg-card px-2.5 py-1.5 font-mono text-[11px]">
              {a}
            </span>
          ))}
        </div>
      )}
      <div className="max-w-[80%] rounded-xl rounded-br-[0.3rem] bg-primary px-3.5 py-2 text-sm text-primary-foreground">
        {children}
      </div>
    </div>
  );
}

function Tarjeta({ children }: { children: ReactNode }) {
  return <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">{children}</div>;
}

function Chip({ tono, children }: { tono: "verde" | "ambar" | "neutro" | "rojo"; children: ReactNode }) {
  const color = {
    verde: "border-success/35 bg-success/12",
    ambar: "border-warning/40 bg-warning/10",
    neutro: "border-border bg-secondary",
    rojo: "border-danger/35 bg-danger/10",
  }[tono];
  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${color}`}>
      {children}
    </span>
  );
}

function Boton({
  apretado,
  oscuro,
  objetivo,
  children,
}: {
  apretado?: boolean;
  oscuro?: boolean;
  /** Dónde puede apuntar el cursor (`CURSOR`). */
  objetivo?: string;
  children: ReactNode;
}) {
  return (
    <span
      data-objetivo={objetivo}
      className={`inline-flex h-8 items-center rounded-md px-3 text-xs font-medium transition-transform ${
        oscuro ? "bg-primary text-primary-foreground" : "border border-input bg-card"
      } ${apretado ? "scale-95 ring-2 ring-brand/60" : ""}`}
    >
      {children}
    </span>
  );
}

// ─── Capítulo 1 · Configurá tu empresa con IA ─────────────────────────────────

const LECTURA_RUT = [
  "Razón social y NIT",
  "Responsabilidades tributarias",
  "Actividad económica y sede",
  "Representante legal",
];

const ENCONTRADO: Array<[string, string, string, boolean?]> = [
  ["Razón social", "Distribuidora Andina S.A.S.", "RUT · 35"],
  ["NIT", "901.234.567-8", "RUT · 5"],
  ["Actividad", "4741 · Comercio al por menor", "RUT · 46"],
  ["Ciudad", "Medellín", "RUT · 40"],
  ["Responsable de IVA", "Sí", "RUT · 53"],
  ["Correo", "contab…@andina.co", "RUT · 42", true],
];

function Capitulo1({ t }: { t: number }) {
  const leyendo = t >= 2600 && t < 9800;
  return (
    <>
      <DeMaria>
        <p className="m-0">
          Hola. Voy a configurar su empresa con sus documentos, uno por uno. Leo lo necesario y
          le pregunto solo lo que los papeles no dicen.
        </p>
      </DeMaria>
      <Aparece t={t} en={1800}>
        <DeLaPersona archivos={["RUT_2026.pdf"]}>Lea este documento.</DeLaPersona>
      </Aparece>
      <Aparece t={t} en={2600}>
        <DeMaria estado={leyendo ? "leyendo" : "reposo"}>
          <Tarjeta>
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="font-medium">{leyendo ? "Leyendo el RUT…" : "Leí el RUT"}</span>
              <span className="font-mono text-[11px] text-muted-foreground">2 páginas</span>
            </div>
            <ul className="m-0 flex list-none flex-col gap-2 px-4 py-3 text-[13px]">
              {LECTURA_RUT.map((x, i) => {
                const hecho = t >= 3800 + i * 1400;
                return (
                  <li key={x} className={`flex items-center gap-2 ${hecho ? "" : "text-muted-foreground"}`}>
                    <span className={`flex size-4 items-center justify-center rounded-full ${hecho ? "bg-success/15 text-success" : "border border-border"}`}>
                      {hecho && <Visto size={10} strokeWidth={3} />}
                    </span>
                    {x}
                  </li>
                );
              })}
            </ul>
          </Tarjeta>
        </DeMaria>
      </Aparece>
      <Aparece t={t} en={9800}>
        <DeMaria>
          <p className="m-0">
            Esto encontré. Revíselo: lo que marqué en ámbar no lo leí con seguridad.
          </p>
          <Tarjeta>
            {ENCONTRADO.map(([etiqueta, valor, fuente, dudoso]) => (
              <div
                key={etiqueta}
                className={`grid grid-cols-[110px_1fr] items-center gap-2 border-t border-border px-4 py-2 text-[13px] first:border-t-0 @[700px]:grid-cols-[130px_1fr_auto] ${dudoso ? "bg-warning/10" : ""}`}
              >
                <span className="text-muted-foreground">{etiqueta}</span>
                <span className="truncate font-medium">{valor}</span>
                <span className="hidden font-mono text-[10px] text-muted-foreground @[700px]:inline">{fuente}</span>
              </div>
            ))}
            <div className="flex justify-end gap-2 border-t border-border px-4 py-2.5">
              <Boton oscuro objetivo="todo-correcto" apretado={t >= 12800 && t < 13500}>
                {t >= 13500 ? "Guardado ✓" : "Todo correcto"}
              </Boton>
            </div>
          </Tarjeta>
        </DeMaria>
      </Aparece>
      <Aparece t={t} en={14200}>
        <DeMaria estado={t < 17000 ? "espera" : "reposo"}>
          <p className="m-0">¿La empresa es agente retenedor de ICA en Medellín? Eso el RUT no lo dice.</p>
          <div className="flex gap-2">
            <Boton>Sí</Boton>
            <Boton objetivo="no" apretado={t >= 16200 && t < 17000}>
              No
            </Boton>
          </div>
        </DeMaria>
      </Aparece>
      <Aparece t={t} en={17000}>
        <DeLaPersona>No.</DeLaPersona>
      </Aparece>
    </>
  );
}

// ─── Capítulo 2 · Preguntale a María ──────────────────────────────────────────

const PREGUNTA = "¿Cuánto le debo a proveedores y qué vence esta semana?";
const RESPUESTA =
  "Le debe $18.900.000 a 11 proveedores. Esta semana vencen 4 facturas por $4.537.300:";
const VENCEN: Array<[string, string, string, boolean?]> = [
  ["Papelería Central", "FC-0231", "$2.380.000"],
  ["Transportes Ruta 80", "TR-1182", "$1.120.000"],
  ["Servicios EPM", "EPM-0925", "$412.300"],
  ["Aseo Total", "AT-0077", "$625.000", true],
];

function Capitulo2({ t }: { t: number }) {
  const escrita = tipeo(PREGUNTA, t, 600, 20);
  return (
    <>
      {t < 3600 ? (
        <div className="mt-auto flex flex-col items-end">
          <span className="rounded-xl border border-input bg-card px-3.5 py-2 text-sm">
            {escrita}
            <span className="ml-px inline-block h-4 w-px translate-y-0.5 animate-pulse bg-foreground" />
          </span>
        </div>
      ) : (
        <DeLaPersona>{PREGUNTA}</DeLaPersona>
      )}
      <Aparece t={t} en={3800}>
        <DeMaria estado={t < 5600 ? "pensando" : "reposo"}>
          {t < 5600 ? (
            <span className="text-muted-foreground">Mirando Compras y la cartera de proveedores…</span>
          ) : (
            <>
              <p className="m-0">{tipeo(RESPUESTA, t, 5600, 45)}</p>
              <Aparece t={t} en={7800}>
                <Tarjeta>
                  {VENCEN.map(([prov, num, valor, vencida], i) => (
                    <Aparece key={num} t={t} en={8000 + i * 350}>
                      <div className="grid grid-cols-[1fr_auto] items-center gap-2 border-t border-border px-4 py-2 text-[13px] first:border-t-0 @[700px]:grid-cols-[1fr_90px_110px_auto]">
                        <span className="truncate font-medium">{prov}</span>
                        <span className="hidden font-mono text-[11px] text-muted-foreground @[700px]:inline">{num}</span>
                        <span className="font-mono text-xs">{valor}</span>
                        <span className="hidden @[700px]:inline">
                          {vencida ? <Chip tono="rojo">Vencida</Chip> : <Chip tono="neutro">Esta semana</Chip>}
                        </span>
                      </div>
                    </Aparece>
                  ))}
                </Tarjeta>
              </Aparece>
              <Aparece t={t} en={9800}>
                <span className="text-xs text-muted-foreground">Según: Compras · Cartera de proveedores</span>
              </Aparece>
            </>
          )}
        </DeMaria>
      </Aparece>
    </>
  );
}

// ─── Capítulo 3 · Registrá facturas ───────────────────────────────────────────

function Capitulo3({ t }: { t: number }) {
  const leidas = Math.min(3, Math.max(0, Math.floor((t - 2600) / 1700)));
  const leyendo = t >= 2200 && t < 8200;
  const descartada = t >= 15200;
  return (
    <>
      <Aparece t={t} en={600}>
        <DeLaPersona archivos={["FC-0231.pdf", "EPM_sep.pdf", "FC-9012.jpg"]}>
          Lea estos 3 documentos.
        </DeLaPersona>
      </Aparece>
      <Aparece t={t} en={2200}>
        {leyendo ? (
          <DeMaria estado="leyendo">
            <Tarjeta>
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <span className="font-medium">Leyendo 3 documentos</span>
                <span className="font-mono text-[11px] text-muted-foreground">{leidas} de 3 listos</span>
              </div>
              <div className="px-4 py-3">
                <span className="block h-1 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-brand transition-[width] duration-400" style={{ width: `${(leidas / 3) * 100}%` }} />
                </span>
              </div>
            </Tarjeta>
          </DeMaria>
        ) : (
          <DeMaria estado={descartada ? "reposo" : "espera"}>
            <p className="m-0">
              Listo. <strong>1</strong> está lista para que la apruebe, y <strong>2</strong> las
              aparté porque hay algo que decidir. Nada se registra hasta que usted lo apruebe.
            </p>
            <Tarjeta>
              <FilaLote
                titulo="Papelería Central · FC-0231"
                sub="Factura de compra"
                valor="$2.380.000"
                chip={<Chip tono="verde">Lista</Chip>}
                accion={<Boton oscuro>Revisar y aprobar</Boton>}
              />
              <FilaLote
                titulo="Servicios EPM · EPM-0925"
                sub="¿A qué cuenta va este gasto? Es la primera vez."
                valor="$412.300"
                chip={<Chip tono="ambar">Apartada</Chip>}
              />
              <FilaLote
                titulo="Ferretería El Tornillo · FC-9012"
                sub={
                  descartada
                    ? "Descartada por Camila Torres: es la misma."
                    : "Parece repetida: ya hay una igual registrada el 2 sep."
                }
                valor="$1.155.000"
                chip={descartada ? <Chip tono="neutro">Descartada</Chip> : <Chip tono="ambar">Apartada</Chip>}
                accion={
                  descartada ? undefined : (
                    <span className="flex flex-wrap gap-2">
                      <Boton objetivo="descartar" apretado={t >= 14400 && t < 15200}>
                        Es la misma, descártela
                      </Boton>
                      <Boton>Es distinta, revísela</Boton>
                    </span>
                  )
                }
              />
            </Tarjeta>
          </DeMaria>
        )}
      </Aparece>
      <Aparece t={t} en={16000}>
        <DeMaria>
          <p className="m-0">Le queda 1 factura lista para aprobar y 1 que espera la cuenta.</p>
        </DeMaria>
      </Aparece>
    </>
  );
}

function FilaLote({
  titulo,
  sub,
  valor,
  chip,
  accion,
}: {
  titulo: string;
  sub: string;
  valor: string;
  chip: ReactNode;
  accion?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-border px-4 py-3 first:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[13px] font-medium">{titulo}</span>
          <span className="text-xs text-muted-foreground">{sub}</span>
        </div>
        <span className="flex shrink-0 items-center gap-2">
          <span className="hidden font-mono text-xs @[700px]:inline">{valor}</span>
          {chip}
        </span>
      </div>
      {accion}
    </div>
  );
}

// ─── Capítulo 4 · Aprobá y rastreá ────────────────────────────────────────────

const TRAZA: Array<[number, string, string, string]> = [
  [6800, "Documento recibido", "La factura en PDF · subida por Camila Torres", "09:12"],
  [7600, "Leído por María", "12 renglones, con la cabecera y los totales", "09:12"],
  [8400, "Verificado", "3 de 3 comprobaciones superadas", "09:12"],
  [9200, "María propuso el registro", "El proveedor por su NIT; la cuenta, recordada", "09:13"],
  [10000, "Camila Torres lo aprobó", "Registró la compra FC-0231", "09:14"],
  [10800, "Contabilizado", "Período septiembre de 2026 · asiento CE-000142", "09:14"],
];

function Capitulo4({ t }: { t: number }) {
  const aprobada = t >= 4200;
  return (
    <>
      {!aprobada ? (
        <Tarjeta>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold">Papelería Central · FC-0231</span>
            <Chip tono="verde">Lista</Chip>
          </div>
          <div className="flex flex-col gap-2 px-4 py-3 text-[13px]">
            <span className="font-mono text-[10px] tracking-[1.2px] text-muted-foreground uppercase">
              Antes de registrar, revisé esto
            </span>
            {["Las sumas del papel cuadran", "Proveedor encontrado por NIT", "No está registrada ya"].map((x) => (
              <span key={x} className="flex items-center gap-2">
                <span className="flex size-4 items-center justify-center rounded-full bg-success/15 text-success">
                  <Visto size={10} strokeWidth={3} />
                </span>
                {x}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2 border-t border-border px-4 py-3 text-[13px]">
            <span>Útiles y papelería → <span className="font-mono">519530</span> <Chip tono="verde">Recordada</Chip></span>
            <span className="font-mono">$2.000.000</span>
            <span className="text-muted-foreground">IVA descontable 19 %</span>
            <span className="font-mono">$380.000</span>
            <span className="font-medium">Total</span>
            <span className="font-mono font-medium">$2.380.000</span>
          </div>
          <div className="flex justify-end border-t border-border px-4 py-3">
            <Boton oscuro objetivo="registrar" apretado={t >= 3400}>
              Registrar la compra
            </Boton>
          </div>
        </Tarjeta>
      ) : (
        <Tarjeta>
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
            <span className="font-mono text-sm font-semibold">CE-000142</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary py-0.5 pr-2 pl-1 text-[11px] font-medium">
              <Maria estado="reposo" tamano={14} />
              Propuesto por María
            </span>
            <Chip tono="verde">Contabilizado</Chip>
          </div>
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1.5 px-4 py-3 font-mono text-xs">
            <span className="text-muted-foreground">Cuenta</span>
            <span className="text-right text-muted-foreground">Débito</span>
            <span className="text-right text-muted-foreground">Crédito</span>
            <span>519530 Útiles</span><span className="text-right">2.000.000</span><span />
            <span>240810 IVA</span><span className="text-right">380.000</span><span />
            <span>220505 Proveedores</span><span /><span className="text-right">2.380.000</span>
          </div>
          <div className="flex flex-col gap-3 border-t border-border px-4 py-3">
            <span className="text-[13px] font-semibold">Trazabilidad</span>
            <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
              {TRAZA.map(([en, titulo, sub, hora]) => (
                <Aparece key={titulo} t={t} en={en}>
                  <li className="grid grid-cols-[1fr_auto] gap-2 text-[13px]">
                    <span className="flex flex-col">
                      <span className="font-medium">{titulo}</span>
                      <span className="text-xs text-muted-foreground">{sub}</span>
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">{hora}</span>
                  </li>
                </Aparece>
              ))}
            </ol>
            <Aparece t={t} en={11800}>
              <span className="block rounded-md bg-secondary px-3 py-2 text-xs text-muted-foreground">
                Este historial no se puede editar. Si el asiento se anula, la anulación se agrega aquí con su motivo.
              </span>
            </Aparece>
          </div>
        </Tarjeta>
      )}
    </>
  );
}

function PantallaFinal() {
  return (
    <div className="flex h-[540px] flex-col items-center justify-center gap-5 px-6 text-center @[700px]:h-[560px]">
      <Maria estado="lista" tamano={64} intensidad="calma" aprueba />
      <p className="m-0 max-w-[560px] font-serif text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.05] tracking-[-0.8px]">
        María propone. <span className="italic text-brand-text">Usted aprueba.</span>
      </p>
    </div>
  );
}
