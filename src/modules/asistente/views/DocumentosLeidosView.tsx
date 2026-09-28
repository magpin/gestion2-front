"use client";

import { useState } from "react";
import { ReceiptText, ScanLine } from "lucide-react";

import { useTieneRol } from "@/core/store/authStore";
import { LecturasSeccion } from "@/modules/compras/views/LecturasSeccion";
import { PedidosSeccion } from "@/modules/ventas/views/PedidosSeccion";

export type TipoLeido = "facturas" | "pedidos";

/**
 * María → Documentos leídos: todo lo que ella leyó y espera que una persona lo
 * apruebe, en un solo lugar. Antes eran dos pestañas sueltas, «Leídas» en
 * Compras y «Pedidos leídos» en Ventas.
 *
 * Cada pestaña se muestra solo a quien puede listar lo suyo —los mismos roles
 * del backend—: por eso COMPRAS ve las facturas y VENTAS los pedidos aunque no
 * vean el chat de María. A ellos los trae el atajo de Compras y de Ventas.
 */
export function DocumentosLeidosView({ inicial }: { inicial?: TipoLeido }) {
  const veFacturas = useTieneRol("ADMIN_TENANT", "DIRECTOR", "CONTADOR", "COMPRAS", "CONSULTA");
  const vePedidos = useTieneRol("DIRECTOR", "CONTADOR", "VENTAS", "CONSULTA");

  const [elegido, setElegido] = useState<TipoLeido>(inicial ?? "facturas");
  // Si la pestaña pedida no es suya, la otra; los roles llegan un instante
  // después de montar, así que se decide al pintar y no al iniciar el estado.
  const tipo: TipoLeido =
    elegido === "facturas" && !veFacturas && vePedidos
      ? "pedidos"
      : elegido === "pedidos" && !vePedidos && veFacturas
        ? "facturas"
        : elegido;

  const pestanas: Array<[TipoLeido, string, typeof ScanLine]> = [
    ...(veFacturas ? [["facturas", "Facturas de proveedores", ReceiptText] as [TipoLeido, string, typeof ScanLine]] : []),
    ...(vePedidos ? [["pedidos", "Pedidos de clientes", ScanLine] as [TipoLeido, string, typeof ScanLine]] : []),
  ];

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-7 sm:px-10 lg:px-16">
      <header className="mb-8">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-text">
          <span className="size-2 rounded-full bg-brand" />
          María
        </div>
        <h1 className="text-4xl font-semibold tracking-[-0.04em]">
          Documentos leídos<span className="text-brand">.</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Lo que María leyó. Nada de esto está registrado: lo revisás y lo aprobás vos.
        </p>
      </header>

      {pestanas.length > 1 && (
        <nav className="mb-7 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
          {pestanas.map(([clave, nombre, Icono]) => (
            <button
              key={clave}
              type="button"
              aria-current={tipo === clave ? "page" : undefined}
              onClick={() => setElegido(clave)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                tipo === clave
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              <Icono className="size-4" />
              {nombre}
            </button>
          ))}
        </nav>
      )}

      {tipo === "facturas" && veFacturas && <LecturasSeccion />}
      {tipo === "pedidos" && vePedidos && <PedidosSeccion />}
    </div>
  );
}
