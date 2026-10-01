"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileMinus, FilePlus, ReceiptText } from "lucide-react";

import { BotonNuevo } from "@/components/shared/BotonNuevo";
import { funcionActiva } from "@/core/config/funciones";
import { useTieneRol } from "@/core/store/authStore";
import { AtajoLeidos } from "@/modules/asistente/components/AtajoLeidos";
import { FacturasCompraSeccion } from "./FacturasCompraSeccion";
import { NotasCompraSeccion } from "./NotasCompraSeccion";

type Seccion = "Facturas" | "Notas crédito" | "Notas débito";

const SECCIONES: Array<[Seccion, typeof ReceiptText]> = [
  ["Facturas", ReceiptText],
  ["Notas crédito", FileMinus],
  ["Notas débito", FilePlus],
];

/** Qué crea el botón de la cabecera en cada pestaña. */
const ETIQUETA_NUEVO: Partial<Record<Seccion, string>> = {
  Facturas: "Nueva compra",
  "Notas crédito": "Nueva nota crédito",
  "Notas débito": "Nueva nota débito",
};

/**
 * Compras: tres vistas del mismo documento —factura del proveedor, y las dos
 * notas con que él corrige—. Hasta el paso 10 era una sola lista sin
 * pestañas, porque toda fila de `compra_documento` era una factura.
 *
 * Se separan y no se mezclan en una lista con columna de tipo: la nota baja o
 * sube lo que se le debe al proveedor, y verlas revueltas con las facturas
 * rompe el "cuánto le debo" que esta pantalla responde de un vistazo. La
 * diferencia con ventas es de dónde sale el número: acá lo pone el proveedor,
 * en los tres documentos.
 */
export function ComprasView() {
  const [seccion, setSeccion] = useState<Seccion>("Facturas");
  // Mismo criterio que en `VentasView`: el botón está arriba de las pestañas,
  // así que el estado de creación vive acá.
  const [creando, setCreando] = useState(false);
  const puedeCrear = useTieneRol("COMPRAS", "DIRECTOR");
  const cerrarCreacion = () => setCreando(false);
  const router = useRouter();
  // Con la página prendida, la factura nueva se registra allá, con su resumen
  // y el asiento previo. Las notas siguen en su diálogo.
  const nuevo = () =>
    seccion === "Facturas" && funcionActiva("compraPagina")
      ? router.push("/dashboard/compras/nueva")
      : setCreando(true);

  return (
    <div className="w-full">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-text">
            <span className="size-2 rounded-full bg-brand" />
            Compras
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.04em]">
            Compras<span className="text-brand">.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Aquí se registra la factura del proveedor — se asienta y aumenta el kardex al
            guardar — y sus notas, que no tocan el kardex.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <AtajoLeidos tipo="facturas" />
          {puedeCrear && ETIQUETA_NUEVO[seccion] !== undefined && (
            <BotonNuevo
              etiqueta={ETIQUETA_NUEVO[seccion]}
              onClick={nuevo}
            />
          )}
        </div>
      </header>

      <nav className="mb-7 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
        {SECCIONES.map(([nombre, Icono]) => (
          <button
            key={nombre}
            type="button"
            aria-current={seccion === nombre ? "page" : undefined}
            onClick={() => {
              setSeccion(nombre);
              setCreando(false);
            }}
            className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
              seccion === nombre
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <Icono className="size-4" />
            {nombre}
          </button>
        ))}
      </nav>

      {seccion === "Facturas" && (
        <FacturasCompraSeccion
          creando={creando}
          onCerrarCreacion={cerrarCreacion}
        />
      )}
      {seccion === "Notas crédito" && (
        <NotasCompraSeccion
          tipo="NOTA_CREDITO"
          creando={creando}
          onCerrarCreacion={cerrarCreacion}
        />
      )}
      {seccion === "Notas débito" && (
        <NotasCompraSeccion
          tipo="NOTA_DEBITO"
          creando={creando}
          onCerrarCreacion={cerrarCreacion}
        />
      )}
    </div>
  );
}
