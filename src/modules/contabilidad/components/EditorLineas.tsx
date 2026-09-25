"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CampoPesos } from "@/components/shared/CampoNumero";
import { Input } from "@/components/ui/input";
import { mostrarNumero } from "@/lib/numeros";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCOP } from "@/lib/utils";
import { planCuentasApi } from "@/modules/plan-cuentas/services/plan-cuentas.service";
import { tercerosApi } from "@/modules/terceros/services/terceros.service";
import type { CuentaEmpresa } from "@/modules/plan-cuentas/types/plan-cuentas.types";
import { calcularCuadre, contrapartida } from "../lib/cuadre";
import { SelectorCuenta } from "./SelectorCuenta";

/** Una línea mientras se edita. Los montos son texto: vacío es cero, no error. */
export interface LineaBorrador {
  /** Clave de React. No viaja al servidor: el `orden` lo pone el backend. */
  clave: number;
  cuenta: CuentaEmpresa | null;
  terceroId: string;
  centroCostoId: string;
  baseGravable: string;
  detalle: string;
  debito: string;
  credito: string;
}

export function lineaVacia(): LineaBorrador {
  return {
    clave: Date.now() + Math.random(),
    cuenta: null,
    terceroId: "",
    centroCostoId: "",
    baseGravable: "",
    detalle: "",
    debito: "",
    credito: "",
  };
}

/**
 * La rejilla donde se arma la partida doble.
 *
 * Es la pantalla del módulo: quien lleva la contabilidad pasa el día acá. Tres
 * decisiones la gobiernan:
 *
 *  1. **La suma va a la vista y se actualiza al teclear.** Un asiento se arma
 *     mirando la diferencia; esperar al servidor para saber cuánto falta hace
 *     imposible el trabajo.
 *  2. **La diferencia no es un error mientras se digita.** Es el estado normal
 *     de un asiento a medio escribir, y por eso se muestra en tono de aviso y no
 *     de falla hasta que se intenta guardar.
 *  3. **Las columnas aparecen según la cuenta.** El tercero se pide en la línea
 *     que lo exige, no en todas: pedirlo siempre obliga a decidir catorce veces
 *     algo que solo importa dos.
 */
export function EditorLineas({
  lineas,
  onCambiar,
}: {
  lineas: LineaBorrador[];
  onCambiar: (lineas: LineaBorrador[]) => void;
}) {
  const cuadre = calcularCuadre(lineas);
  const sugerida = contrapartida(lineas);

  // Solo se piden si alguna línea los exige: la mayoría de asientos no los usa,
  // y traerlos siempre es una consulta que nadie mira.
  const exigeTercero = lineas.some((l) => l.cuenta?.exige_tercero);
  const exigeCentro = lineas.some((l) => l.cuenta?.exige_centro_costo);

  const { data: terceros } = useQuery({
    queryKey: ["terceros", "para-asiento"],
    queryFn: () => tercerosApi.listar({}),
    enabled: exigeTercero,
    staleTime: 5 * 60_000,
  });

  const { data: centros = [] } = useQuery({
    queryKey: ["plan-cuentas", "centros"],
    queryFn: planCuentasApi.centros,
    enabled: exigeCentro,
    staleTime: 5 * 60_000,
  });

  const actualizar = (clave: number, cambio: Partial<LineaBorrador>) =>
    onCambiar(
      lineas.map((l) => (l.clave === clave ? { ...l, ...cambio } : l)),
    );

  /**
   * Escribir en una columna vacía la otra.
   *
   * La base rechaza una línea con las dos patas, así que dejar escribir en las
   * dos es dejar armar algo que no se va a poder guardar.
   */
  const escribirMonto = (
    clave: number,
    lado: "debito" | "credito",
    valor: string,
  ) =>
    actualizar(clave, {
      [lado]: valor,
      [lado === "debito" ? "credito" : "debito"]: "",
    } as Partial<LineaBorrador>);

  const agregar = () => onCambiar([...lineas, lineaVacia()]);

  const quitar = (clave: number) =>
    onCambiar(lineas.filter((l) => l.clave !== clave));

  /** Enter agrega línea: quien digita treinta asientos al día no usa el mouse. */
  const alTeclear = (e: React.KeyboardEvent, ultima: boolean) => {
    if (e.key === "Enter" && ultima) {
      e.preventDefault();
      agregar();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[900px] text-left">
          <thead className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3">
                Cuenta auxiliar
              </th>
              <th scope="col" className="px-4 py-3">
                Detalle
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Débito
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Crédito
              </th>
              <th scope="col" className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lineas.map((l, i) => {
              const ultima = i === lineas.length - 1;
              // La sugerencia va en la última línea y solo si está en blanco:
              // pisar algo escrito sería peor que no ayudar.
              const proponer =
                ultima && sugerida !== null && l.debito === "" && l.credito === "";

              return (
                <tr key={l.clave} className="align-top">
                  <td className="px-4 py-3">
                    <SelectorCuenta
                      valor={l.cuenta}
                      onElegir={(cuenta) => actualizar(l.clave, { cuenta })}
                    />

                    {/* Las exigencias de ESTA cuenta, en ESTA línea. */}
                    {l.cuenta?.exige_tercero && (
                      <div className="mt-2">
                        <Select
                          items={(terceros?.datos ?? []).map((t) => ({ value: t.id, label: t.nombre }))}
                          value={l.terceroId}
                          onValueChange={(v) =>
                            actualizar(l.clave, { terceroId: v ?? "" })
                          }
                        >
                          <SelectTrigger className="h-11 w-full rounded-xl px-4">
                            <SelectValue placeholder="Tercero (obligatorio)" />
                          </SelectTrigger>
                          <SelectContent>
                            {(terceros?.datos ?? []).map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {l.cuenta?.exige_centro_costo && (
                      <div className="mt-2">
                        <Select
                          items={centros.map((c) => ({ value: c.id, label: `${c.codigo} · ${c.nombre}` }))}
                          value={l.centroCostoId}
                          onValueChange={(v) =>
                            actualizar(l.clave, { centroCostoId: v ?? "" })
                          }
                        >
                          <SelectTrigger className="h-11 w-full rounded-xl px-4">
                            <SelectValue placeholder="Centro de costo (obligatorio)" />
                          </SelectTrigger>
                          <SelectContent>
                            {centros.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.codigo} · {c.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {l.cuenta?.exige_base_gravable && (
                      <CampoPesos
                        value={l.baseGravable}
                        onChange={(baseGravable) =>
                          actualizar(l.clave, { baseGravable })
                        }
                        placeholder="Base gravable (obligatoria)"
                        className="mt-2 h-11 rounded-xl px-4 text-right font-mono"
                        aria-label="Base gravable"
                      />
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <Input
                      value={l.detalle}
                      onChange={(e) =>
                        actualizar(l.clave, { detalle: e.target.value })
                      }
                      placeholder="Opcional"
                      className="h-11 rounded-xl px-4"
                      aria-label={`Detalle de la línea ${i + 1}`}
                    />
                  </td>

                  <td className="px-4 py-3">
                    <CampoPesos
                      value={l.debito}
                      onChange={(v) => escribirMonto(l.clave, "debito", v)}
                      onKeyDown={(e) => alTeclear(e, ultima)}
                      placeholder={
                        proponer && sugerida.lado === "DEBITO"
                          ? mostrarNumero(String(sugerida.valor))
                          : "0"
                      }
                      className="h-11 w-36 rounded-xl px-4 text-right font-mono"
                      aria-label={`Débito de la línea ${i + 1}`}
                    />
                  </td>

                  <td className="px-4 py-3">
                    <CampoPesos
                      value={l.credito}
                      onChange={(v) => escribirMonto(l.clave, "credito", v)}
                      onKeyDown={(e) => alTeclear(e, ultima)}
                      placeholder={
                        proponer && sugerida.lado === "CREDITO"
                          ? mostrarNumero(String(sugerida.valor))
                          : "0"
                      }
                      className="h-11 w-36 rounded-xl px-4 text-right font-mono"
                      aria-label={`Crédito de la línea ${i + 1}`}
                    />
                  </td>

                  <td className="px-4 py-3">
                    {/* Con dos líneas no se ofrece quitar: es el mínimo de un
                        asiento, y quitar una deja algo que no se puede guardar. */}
                    {lineas.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Quitar la línea ${i + 1}`}
                        className="text-muted-foreground hover:text-danger"
                        onClick={() => quitar(l.clave)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          className="h-11 rounded-xl px-4 text-brand-text"
          onClick={agregar}
        >
          <Plus className="size-4" />
          Agregar línea
        </Button>
        {sugerida !== null && (
          <Button
            type="button"
            variant="ghost"
            className="h-11 rounded-xl px-4 text-muted-foreground"
            onClick={() => {
              const ultima = lineas[lineas.length - 1];
              escribirMonto(
                ultima.clave,
                sugerida.lado === "DEBITO" ? "debito" : "credito",
                String(sugerida.valor),
              );
            }}
          >
            Cuadrar con {formatCOP(sugerida.valor)}
          </Button>
        )}
      </div>

      {/* El marcador. Es lo que se mira mientras se digita, así que va grande y
          pegado a la rejilla. */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-muted/50 p-6">
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <span className="text-muted-foreground">
            Débito{" "}
            <b className="ml-1 font-mono text-foreground">
              {formatCOP(cuadre.totalDebito)}
            </b>
          </span>
          <span className="text-muted-foreground">
            Crédito{" "}
            <b className="ml-1 font-mono text-foreground">
              {formatCOP(cuadre.totalCredito)}
            </b>
          </span>
        </div>

        <p
          role="status"
          className={`text-sm font-bold ${
            cuadre.cuadra ? "text-success" : "text-brand-text"
          }`}
        >
          {cuadre.cuadra
            ? "Asiento cuadrado"
            : `Faltan ${formatCOP(cuadre.diferencia)} en el ${
                cuadre.falta === "DEBITO" ? "débito" : "crédito"
              }`}
        </p>
      </div>
    </div>
  );
}
