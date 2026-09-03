"use client";

import { Check } from "lucide-react";

export const SECTORES = [
  { codigo: "COMERCIO", nombre: "Comercio", detalle: "Compra y revende" },
  { codigo: "SERVICIOS", nombre: "Servicios", detalle: "Presta servicios" },
  { codigo: "MANUFACTURA", nombre: "Manufactura", detalle: "Transforma o fabrica" },
] as const;

interface Props {
  valor: string[];
  onCambio: (sectores: string[]) => void;
}

/**
 * A qué se dedica la empresa, en grueso. Varios a la vez.
 *
 * Antes era un `Select` de cuatro valores donde el cuarto era "Mixto", que
 * significaba "tengo varios" sin decir cuáles. Ese valor no servía para nada:
 * ningún filtro puede apoyarse en él, y era justo el caso de la empresa que
 * comercia y además fabrica.
 *
 * No es la fuente de verdad de la actividad —esa es la CIIU del RUT—, y por eso
 * no es obligatorio: marcar de más solo agrega cuentas al catálogo filtrado,
 * nunca esconde las que el RUT respalda.
 *
 * Tarjetas y no un `<select multiple>`: tres opciones caben a la vista con su
 * explicación al lado, y un `select` múltiple obliga a saber que hay que dejar
 * Ctrl apretado. La marca es un círculo relleno en neutro, no en naranja: el
 * acento señala un punto de la pantalla, y acá puede haber tres a la vez.
 */
export function SelectorSectores({ valor, onCambio }: Props) {
  const alternar = (codigo: string) =>
    onCambio(valor.includes(codigo) ? valor.filter((s) => s !== codigo) : [...valor, codigo]);

  return (
    <div className="grid gap-2.5 sm:grid-cols-3">
      {SECTORES.map((s) => {
        const elegido = valor.includes(s.codigo);
        return (
          <button
            key={s.codigo}
            type="button"
            onClick={() => alternar(s.codigo)}
            aria-pressed={elegido}
            className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
              elegido ? "border-input bg-muted" : "border-border hover:bg-accent"
            }`}
          >
            <span
              className={`grid size-5 shrink-0 place-items-center rounded-full border transition-colors ${
                elegido ? "border-primary bg-primary text-primary-foreground" : "border-input"
              }`}
            >
              {elegido && <Check className="size-3" strokeWidth={3} />}
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold">{s.nombre}</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">{s.detalle}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
