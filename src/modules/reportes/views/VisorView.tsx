"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSearch,
  FileSpreadsheet,
  Lock,
  Printer,
  RefreshCw,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { useAuthStore } from "@/core/store/authStore";

import { HojaIframe } from "../components/HojaIframe";
import { ModalPeriodo } from "../components/ModalPeriodo";
import { llavesReportes, useAtajos, useHoja, useListaReportes } from "../hooks/useReportes";
import { ICONO_AREA } from "../lib/areas";
import { leerVisor, queMuestra, rutaDelVisor } from "../lib/eleccion";
import { fechaLarga, rangoLargo } from "../lib/fechas";
import styles from "../reportes.module.css";
import { reportesService } from "../services/reportes.service";
import type {
  Area,
  Atajos,
  ClaveReporte,
  Eleccion,
  Formato,
  HojaEnPantalla,
  Parametro,
} from "../types/reportes.types";

/**
 * Lo que el visor sabe del reporte aunque la lista no haya llegado —o no lo
 * incluya, que es justamente el caso de quien no tiene permiso—.
 */
const CONOCIDOS: Record<
  ClaveReporte,
  {
    etiqueta: string;
    area: Area;
    etiquetaArea: string;
    parametro: Parametro;
    /** Si la hoja sale apaisada: el esqueleto de carga la imita. */
    horizontal: boolean;
  }
> = {
  VENTAS_POR_CLIENTE: {
    etiqueta: "Ventas del mes por cliente",
    area: "VENTAS",
    etiquetaArea: "Ventas",
    parametro: "RANGO",
    horizontal: false,
  },
  ANTIGUEDAD_CARTERA: {
    etiqueta: "Antigüedad de saldos de cartera",
    area: "CARTERA",
    etiquetaArea: "Cartera",
    parametro: "CORTE",
    horizontal: true,
  },
  RETENCIONES_350: {
    etiqueta: "Formulario 350 — retenciones del mes",
    area: "CONTABILIDAD",
    etiquetaArea: "Contabilidad",
    parametro: "RANGO",
    horizontal: true,
  },
  RETEICA: {
    etiqueta: "ReteICA por municipio",
    area: "CONTABILIDAD",
    etiquetaArea: "Contabilidad",
    parametro: "RANGO",
    horizontal: false,
  },
  CERTIFICADOS_RETENCION: {
    etiqueta: "Certificados de retención",
    area: "CONTABILIDAD",
    etiquetaArea: "Contabilidad",
    parametro: "RANGO",
    horizontal: false,
  },
};

const ROL_EN_PALABRAS: Record<string, string> = {
  ADMIN_TENANT: "Administrador",
  DIRECTOR: "Director",
  CONTADOR: "Contador",
  VENTAS: "Ventas",
  COMPRAS: "Compras",
  INVENTARIO: "Inventario",
  CAJA: "Caja",
  CONSULTA: "Consulta",
};

/**
 * El visor: la hoja de verdad, y los controles **afuera**.
 *
 * La hoja es la misma del PDF —misma plantilla, mismo CSS—, sin rediseñar para
 * la pantalla. Cambiar período, páginas, imprimir y descargar van en la barra
 * de arriba: dentro de la hoja no hay nada que no se imprima.
 */
export function VisorView() {
  const params = useSearchParams();
  const leido = leerVisor(new URLSearchParams(params.toString()));
  if (!leido) {
    return (
      <Aviso
        icono={<FileSearch className="size-5" aria-hidden />}
        titulo="Ese reporte no existe"
        texto="El enlace está incompleto o es de un reporte que ya no está."
        acciones={
          <Link href="/dashboard/reportes" className={buttonVariants()}>
            Volver a reportes
          </Link>
        }
      />
    );
  }
  // La llave remonta el visor al cambiar de elección: páginas, avisos y
  // descarga vuelven a cero con la hoja nueva.
  return (
    <Visor
      key={params.toString()}
      reporte={leido.reporte}
      eleccion={leido.eleccion}
    />
  );
}

function Visor({ reporte, eleccion }: { reporte: ClaveReporte; eleccion: Eleccion }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const conocido = CONOCIDOS[reporte];
  const { data: areas } = useListaReportes();
  const { data: atajos } = useAtajos();
  const permitido =
    areas === undefined || areas.some((a) => a.reportes.some((r) => r.clave === reporte));

  const hoja = useHoja(reporte, eleccion);
  const status = (hoja.error as AxiosError | null)?.response?.status;
  const sinPermiso = !permitido || status === 403;

  const [cambiando, setCambiando] = useState(false);
  const [descargando, setDescargando] = useState<Formato | null>(null);
  const [caido, setCaido] = useState<Formato | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [paginas, setPaginas] = useState<Paginas | null>(null);

  const cancelar = () => {
    void queryClient.cancelQueries({ queryKey: llavesReportes.hoja(reporte, eleccion) });
    router.push("/dashboard/reportes");
  };

  const descargar = async (formato: Formato) => {
    setDescargando(formato);
    setCaido(null);
    setFallo(null);
    try {
      await reportesService.descargar(reporte, eleccion, formato);
    } catch (e) {
      const respuesta = (e as AxiosError).response;
      // Sin respuesta, o el servicio que arma el archivo no contesta: la hoja
      // de la pantalla sigue siendo buena y se puede imprimir desde acá.
      if (respuesta === undefined || respuesta.status >= 500) setCaido(formato);
      else setFallo(await mensajeDeBlob(respuesta.data));
    } finally {
      setDescargando(null);
    }
  };

  const Icono = ICONO_AREA[conocido.area];
  const subtitulo = `${conocido.etiquetaArea} · ${describir(eleccion, hoja.data, atajos)}`;

  const corriendo = hoja.isFetching && !sinPermiso;
  const vacia = hoja.data?.vacio === true;
  const lista = hoja.data !== undefined && !corriendo && !sinPermiso;

  return (
    <div className="-mx-4 -my-7 flex h-[calc(100dvh-3.5rem)] min-h-[520px] flex-col md:-mx-10 lg:-mx-14">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-5 gap-y-3 border-b border-border bg-card px-4 py-4 md:px-7">
        <div className="flex min-w-0 items-center gap-3.5">
          <Link
            href="/dashboard/reportes"
            aria-label="Volver a reportes"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <ArrowLeft className="size-[17px]" aria-hidden />
          </Link>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-base font-semibold">{conocido.etiqueta}</span>
            <span className="inline-flex min-w-0 items-center gap-1.5 text-[13px] text-[#4d4d4d] dark:text-[#b8b8b8]">
              <Icono className="size-[13px] shrink-0" aria-hidden />
              <span className="truncate">{subtitulo}</span>
            </span>
          </div>
        </div>

        <Barra
          paginas={paginas}
          habilitada={lista}
          vacia={vacia}
          descargando={descargando}
          onCambiar={() => setCambiando(true)}
          onDescargar={descargar}
          cambiarHabilitado={!corriendo && !sinPermiso}
          paginador={lista && !vacia}
        />
      </header>

      <div className="flex min-h-0 grow">
        {sinPermiso ? (
          <SinPermiso area={conocido.etiquetaArea} />
        ) : corriendo ? (
          <Corriendo onCancelar={cancelar} horizontal={conocido.horizontal} />
        ) : hoja.isError ? (
          <Aviso
            icono={<AlertTriangle className="size-5" aria-hidden />}
            titulo="No se pudo armar el reporte"
            texto="No es un problema de tus datos. Vuelve a intentar; si sigue igual, avísale a quien administra el sistema."
            acciones={<Button onClick={() => hoja.refetch()}>Reintentar</Button>}
          />
        ) : vacia && hoja.data ? (
          <SinDatos
            reporte={reporte}
            parametro={conocido.parametro}
            hoja={hoja.data}
            onCambiar={() => setCambiando(true)}
          />
        ) : hoja.data ? (
          <Hoja
            hoja={hoja.data}
            titulo={conocido.etiqueta}
            caido={caido}
            fallo={fallo}
            onPaginas={setPaginas}
            onReintentar={() => caido && descargar(caido)}
          />
        ) : null}
      </div>

      {cambiando && (
        <ModalPeriodo
          abierto
          reporte={{ ...conocido, clave: reporte }}
          inicial={eleccion}
          onCerrar={() => setCambiando(false)}
          onVer={(e) => {
            setCambiando(false);
            router.push(rutaDelVisor(reporte, e));
          }}
        />
      )}
    </div>
  );
}

/**
 * El mensaje de un error de descarga.
 *
 * La descarga pide `responseType: "blob"`, así que un 403 o un 400 llega
 * **también como Blob** y no como `{ message }`: sin leerlo, la pantalla solo
 * podría decir «algo falló».
 */
async function mensajeDeBlob(datos: unknown): Promise<string> {
  const generico = "No se pudo descargar el archivo. Vuelve a intentar.";
  if (!(datos instanceof Blob)) return generico;
  try {
    const cuerpo = JSON.parse(await datos.text()) as { message?: string | string[] };
    const m = Array.isArray(cuerpo.message) ? cuerpo.message.join(". ") : cuerpo.message;
    return m || generico;
  } catch {
    return generico;
  }
}

/** «1 al 30 de septiembre de 2026 · este mes», o «corte al 21 de septiembre de 2026 · hoy». */
function describir(eleccion: Eleccion, hoja: HojaEnPantalla | undefined, atajos: Atajos | undefined) {
  const rango = (desde: string, hasta: string) => rangoLargo(desde, hasta).replace(/^del /, "");
  if (hoja) {
    const cuando =
      eleccion.tipo === "CORTE" || eleccion.tipo === "ATAJO_CORTE"
        ? `corte al ${fechaLarga(hoja.desde)}`
        : rango(hoja.desde, hoja.hasta);
    return `${cuando} · ${hoja.etiqueta}`;
  }
  switch (eleccion.tipo) {
    case "RANGO":
      return `${rango(eleccion.desde, eleccion.hasta)} · fechas fijas`;
    case "CORTE":
      return `corte al ${fechaLarga(eleccion.corte)} · fecha fija`;
    case "ATAJO_RANGO": {
      const o = atajos?.rango.find((r) => r.atajo === eleccion.atajo);
      return o ? `${rango(o.desde, o.hasta)} · ${o.etiqueta}` : "…";
    }
    case "ATAJO_CORTE": {
      const o = atajos?.corte.find((c) => c.atajo === eleccion.atajo);
      return o ? `corte al ${fechaLarga(o.corte)} · ${o.etiqueta}` : "…";
    }
  }
}

/* ── La barra de arriba ─────────────────────────────────────────────────── */

/** La página visible, cuántas hay, y cómo saltar e imprimir. Lo publica la hoja al cargar. */
type Paginas = { actual: number; total: number; ir: (n: number) => void; imprimir: () => void };

function Barra({
  paginas,
  habilitada,
  vacia,
  descargando,
  onCambiar,
  onDescargar,
  cambiarHabilitado,
  paginador,
}: {
  paginas: Paginas | null;
  habilitada: boolean;
  vacia: boolean;
  descargando: Formato | null;
  onCambiar: () => void;
  onDescargar: (f: Formato) => void;
  cambiarHabilitado: boolean;
  paginador: boolean;
}) {
  const descargable = habilitada && !vacia;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" disabled={!cambiarHabilitado} onClick={onCambiar}>
        <CalendarRange aria-hidden />
        Cambiar período
      </Button>

      {paginador && paginas && paginas.total > 1 && (
        <div className="flex h-10 items-center gap-1 rounded-[0.6rem] border border-border px-1.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Página anterior"
            disabled={paginas.actual <= 1}
            onClick={() => paginas.ir(paginas.actual - 1)}
          >
            <ChevronLeft aria-hidden />
          </Button>
          <span className="px-1 font-mono text-xs" aria-live="polite">
            {paginas.actual} / {paginas.total}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Página siguiente"
            disabled={paginas.actual >= paginas.total}
            onClick={() => paginas.ir(paginas.actual + 1)}
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>
      )}

      <Button
        variant="outline"
        disabled={!habilitada || !paginas}
        onClick={() => paginas?.imprimir()}
      >
        <Printer aria-hidden />
        Imprimir
      </Button>
      <Button
        variant="outline"
        disabled={!descargable || descargando !== null}
        onClick={() => onDescargar("XLSX")}
      >
        <FileSpreadsheet aria-hidden />
        {descargando === "XLSX" ? "Armando…" : "Excel"}
      </Button>
      <Button disabled={!descargable || descargando !== null} onClick={() => onDescargar("PDF")}>
        <Download aria-hidden />
        {descargando === "PDF" ? "Armando el PDF…" : "Descargar PDF"}
      </Button>
    </div>
  );
}

/* ── La hoja ─────────────────────────────────────────────────────────────── */

function Hoja({
  hoja,
  titulo,
  caido,
  fallo,
  onPaginas,
  onReintentar,
}: {
  hoja: HojaEnPantalla;
  titulo: string;
  caido: Formato | null;
  fallo: string | null;
  onPaginas: (p: Paginas | null) => void;
  onReintentar: () => void;
}) {
  const marco = useRef<HTMLDivElement>(null);
  const iframe = useRef<HTMLIFrameElement>(null);
  const [cortes, setCortes] = useState<number[]>([0]);
  const [actual, setActual] = useState(1);

  const ir = useCallback(
    (n: number) => {
      const ventana = iframe.current?.contentWindow;
      const y = cortes[n - 1];
      if (ventana && y !== undefined) ventana.scrollTo(0, y);
    },
    [cortes],
  );

  const imprimir = useCallback(() => iframe.current?.contentWindow?.print(), []);

  useEffect(() => {
    onPaginas({ actual, total: cortes.length, ir, imprimir });
  }, [actual, cortes, ir, imprimir, onPaginas]);
  useEffect(() => () => onPaginas(null), [onPaginas]);

  /**
   * Al cargar: el fondo del `iframe` toma el del visor —gris en claro, casi
   * negro en oscuro— y se cuentan las páginas por los cortes que la hoja trae
   * marcados. **La hoja no cambia de color**: solo lo que la rodea.
   */
  const alCargar = (elemento: HTMLIFrameElement) => {
    const doc = elemento.contentDocument;
    const ventana = elemento.contentWindow;
    if (!doc || !ventana || !marco.current) return;
    doc.documentElement.style.background = getComputedStyle(marco.current).backgroundColor;

    const saltos = Array.from(doc.querySelectorAll<HTMLElement>(".salto"));
    const ys = [0, ...saltos.map((s) => s.offsetTop + s.offsetHeight)];
    setCortes(ys);
    ventana.addEventListener("scroll", () => {
      const y = ventana.scrollY + ventana.innerHeight / 3;
      let pagina = 1;
      ys.forEach((corte, i) => {
        if (y >= corte) pagina = i + 1;
      });
      setActual(pagina);
    });
  };

  return (
    <>
      {cortes.length > 1 && (
        <nav
          aria-label="Páginas"
          className="hidden w-[104px] shrink-0 flex-col items-center gap-4 border-r border-border bg-card py-5 lg:flex"
        >
          {cortes.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Página ${i + 1}`}
              aria-current={actual === i + 1 ? "page" : undefined}
              onClick={() => ir(i + 1)}
              className="flex flex-col items-center gap-1.5 text-[#4d4d4d] dark:text-[#b8b8b8]"
            >
              <span
                className={`flex h-[93px] w-[72px] flex-col gap-1 rounded-[2px] bg-white px-[7px] py-2 outline-2 outline-offset-2 ${
                  actual === i + 1 ? "outline-foreground" : "outline-transparent"
                }`}
              >
                <span className="h-[5px] w-3/5 bg-[#171717]" />
                <span className="h-[3px] w-[90%] bg-[#dedede]" />
                <span className={`h-3.5 w-full ${i === 0 ? "bg-[#171717]" : "bg-[#ededed]"}`} />
                <span className="h-[3px] w-4/5 bg-[#dedede]" />
                <span className="h-[3px] w-[95%] bg-[#dedede]" />
                <span className="h-[3px] w-[70%] bg-[#dedede]" />
                <span className="h-[3px] w-[88%] bg-[#dedede]" />
              </span>
              <span className="font-mono text-[11px]">{i + 1}</span>
            </button>
          ))}
        </nav>
      )}

      <div ref={marco} className="relative flex min-w-0 grow flex-col bg-[#e4e4e4] dark:bg-[#111111]">
        {caido && (
          <div className="absolute inset-x-0 top-4 z-10 flex justify-center px-4">
            <div
              role="status"
              className="flex w-full max-w-[640px] items-start gap-3 rounded-[0.6rem] border border-[rgba(178,106,0,0.4)] bg-[#f7ecdc] px-3.5 py-3 text-[#171717] shadow-sm dark:bg-[#2d2415] dark:text-[#ededed]"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#b26a00]" aria-hidden />
              <span className="flex grow flex-col gap-0.5">
                <span className="text-[13px] font-semibold">
                  Ahora no se puede armar {caido === "PDF" ? "el PDF" : "el Excel"}
                </span>
                <span className="text-xs leading-normal">
                  La hoja de abajo está completa y es la misma que se descargaría. Puedes
                  imprimirla desde aquí; la descarga vuelve cuando el servicio responda.
                </span>
              </span>
              <Button variant="outline" size="sm" onClick={onReintentar}>
                <RefreshCw aria-hidden />
                Reintentar
              </Button>
            </div>
          </div>
        )}
        {fallo && (
          <div className="absolute inset-x-0 top-4 z-10 flex justify-center px-4">
            <div
              role="alert"
              className="flex w-full max-w-[640px] items-start gap-3 rounded-[0.6rem] border border-border bg-card px-3.5 py-3 text-[13px] shadow-sm"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{fallo}</span>
            </div>
          </div>
        )}
        <HojaIframe
          ref={iframe}
          html={hoja.html}
          titulo={titulo}
          onLoad={alCargar}
          className="h-full w-full grow border-0"
        />
      </div>
    </>
  );
}

/* ── Los estados ─────────────────────────────────────────────────────────── */

function Corriendo({ onCancelar, horizontal }: { onCancelar: () => void; horizontal: boolean }) {
  return (
    <div className="flex min-w-0 grow flex-col items-center gap-4 overflow-auto bg-[#e4e4e4] px-4 pt-6 pb-10 dark:bg-[#111111]">
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-3.5 rounded-full border border-border bg-card py-3 pr-2 pl-4 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
      >
        <span className="relative block size-[22px]">
          <span className={styles.anillo} />
          <span className="absolute inset-0 rounded-full bg-card" />
        </span>
        <span className="flex flex-col gap-1">
          <span className="text-[13px] font-medium">
            Armando el reporte con los datos de este momento
          </span>
          <span className="relative block h-[3px] w-[260px] max-w-full overflow-hidden rounded-full bg-muted">
            <span className={styles.indeterminada} />
          </span>
        </span>
        <Button variant="ghost" size="sm" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
      <div
        aria-hidden
        className="flex max-w-full shrink-0 flex-col gap-3.5 rounded-[2px] bg-white px-10 py-[34px] shadow-[0_18px_50px_rgba(23,23,23,0.18),0_0_0_1px_rgba(23,23,23,0.06)]"
        style={horizontal ? { width: 676, height: 522 } : { width: 522, height: 676 }}
      >
        <div className="flex justify-between">
          <span className={`${styles.skHoja} h-[22px] w-[180px] rounded`} />
          <span className={`${styles.skHoja} h-3 w-[70px] rounded`} />
        </div>
        <span className={`${styles.skHoja} h-[70px] w-full rounded-lg`} />
        <span className={`${styles.skHoja} h-[150px] w-full rounded`} />
        {[90, 80, 95, 70, 88, 76].map((w) => (
          <span key={w} className={`${styles.skHoja} h-2.5 rounded`} style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}

function SinDatos({
  reporte,
  parametro,
  hoja,
  onCambiar,
}: {
  reporte: ClaveReporte;
  parametro: Parametro;
  hoja: HojaEnPantalla;
  onCambiar: () => void;
}) {
  const esRango = parametro === "RANGO";
  const cuando = rangoLargo(hoja.desde, hoja.hasta).replace(/^del /, "");
  const que = queMuestra(reporte).vacio;
  const titulo = esRango
    ? hoja.desde === hoja.hasta
      ? `No hay ${que} el ${cuando}`
      : `No hay ${que} entre el ${cuando.replace(" al ", " y el ")}`
    : `Nadie tiene saldo por cobrar al ${fechaLarga(hoja.desde)}`;
  const texto = esRango
    ? `El reporte corrió bien: en ese rango no hay ${reporte === "VENTAS_POR_CLIENTE" ? "facturas" : que}.${
        hoja.relativo ? "" : " Las fechas están escritas a mano."
      }`
    : "El reporte corrió bien: a esa fecha no hay facturas con saldo pendiente.";

  return (
    <Aviso
      icono={<CalendarRange className="size-5" aria-hidden />}
      titulo={titulo}
      texto={texto}
      acciones={
        <Button onClick={onCambiar}>
          <CalendarRange aria-hidden />
          {esRango ? "Cambiar el período" : "Cambiar la fecha de corte"}
        </Button>
      }
    />
  );
}

function SinPermiso({ area }: { area: string }) {
  const roles = useAuthStore((s) => s.roles);
  const empresa = useAuthStore(
    (s) => s.empresas.find((e) => e.id === s.empresaId)?.razonSocial,
  );
  const suyos = roles.map((r) => ROL_EN_PALABRAS[r] ?? r).join(", ");
  return (
    <Aviso
      icono={<Lock className="size-5" aria-hidden />}
      titulo={`Este reporte es de ${area.toLowerCase()} y tu rol no la incluye`}
      texto={`Tu rol${empresa ? ` en ${empresa}` : ""} es ${suyos || "otro"}. Si necesitas verlo, pídele acceso a quien administra la empresa.`}
      acciones={
        <Link href="/dashboard/reportes" className={buttonVariants({ variant: "outline" })}>
          <ArrowLeft aria-hidden />
          Volver a reportes
        </Link>
      }
    />
  );
}

/** Sin datos, sin permiso, no existe: no son errores y no se pintan como tales. */
function Aviso({
  icono,
  titulo,
  texto,
  acciones,
}: {
  icono: React.ReactNode;
  titulo: string;
  texto: string;
  acciones: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 grow bg-[#e4e4e4] px-4 dark:bg-[#111111]">
      <div
        role="status"
        className="m-auto flex w-full max-w-[520px] flex-col items-center gap-3.5 rounded-[1.05rem] border border-border bg-card p-9 text-center"
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-muted">
          {icono}
        </span>
        <span className="text-lg font-semibold">{titulo}</span>
        <span className="text-sm leading-[1.55] text-[#4d4d4d] dark:text-[#b8b8b8]">{texto}</span>
        <div className="flex flex-wrap justify-center gap-2 pt-1">{acciones}</div>
      </div>
    </div>
  );
}
