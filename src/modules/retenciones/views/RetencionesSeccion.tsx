"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Percent } from "lucide-react";

import { Aviso } from "@/components/shared/Aviso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTieneRol } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import { formatCOP } from "@/lib/utils";
import { Campo } from "@/modules/configuracion/components/Campo";
import { SelectorCuenta } from "@/modules/contabilidad/components/SelectorCuenta";
import type { CuentaEmpresa } from "@/modules/plan-cuentas/types/plan-cuentas.types";
import { retencionesApi } from "../services/retenciones.service";
import {
  NOMBRE_TIPO_RETENCION,
  TIPOS_RETENCION,
  type TipoRetencion,
} from "../types/retenciones.types";

const CLAVE = ["retenciones"];
const CONTROL = "h-11 rounded-xl px-4";

/**
 * El catálogo de retenciones: la UVT del año y los conceptos con su tarifa.
 *
 * **El sistema no inventa las tarifas.** Cambian todos los años, la de ICA sale
 * del acuerdo de cada municipio, y el agente retenedor responde ante la DIAN
 * por el valor aunque no lo haya practicado. Las carga y las valida un
 * contador; lo que el sistema aporta es que, una vez cargadas, no se olviden ni
 * se calculen mal.
 */
export function RetencionesSeccion() {
  const queryClient = useQueryClient();
  const puedeCargar = useTieneRol("DIRECTOR", "CONTADOR");
  const anioActual = new Date().getFullYear();

  const [anio, setAnio] = useState(anioActual);
  const [valorUvt, setValorUvt] = useState("");

  const [tipo, setTipo] = useState<TipoRetencion>("RENTA");
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [tarifa, setTarifa] = useState("");
  const [tarifaNoDeclarante, setTarifaNoDeclarante] = useState("");
  const [baseMinimaUvt, setBaseMinimaUvt] = useState("");
  const [cuenta, setCuenta] = useState<CuentaEmpresa | null>(null);

  const { data: uvts = [] } = useQuery({
    queryKey: [...CLAVE, "uvt"],
    queryFn: retencionesApi.uvt,
  });
  const { data: conceptos = [], isLoading } = useQuery({
    queryKey: [...CLAVE, "conceptos", anio],
    queryFn: () => retencionesApi.conceptos(anio),
  });

  const uvtDelAnio = uvts.find((u) => u.anio === anio) ?? null;

  const refrescar = () => queryClient.invalidateQueries({ queryKey: CLAVE });

  const guardarUvt = useMutation({
    mutationFn: () => retencionesApi.cargarUvt(anio, Number(valorUvt)),
    onSuccess: async () => {
      await refrescar();
      aviso.exito(`UVT del ${anio} guardada`);
      setValorUvt("");
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const crearConcepto = useMutation({
    mutationFn: () =>
      retencionesApi.crearConcepto({
        anio,
        tipo,
        codigo: codigo.trim().toUpperCase(),
        nombre: nombre.trim(),
        tarifa: Number(tarifa),
        tarifaNoDeclarante:
          tipo === "RENTA" && tarifaNoDeclarante !== ""
            ? Number(tarifaNoDeclarante)
            : undefined,
        baseMinimaUvt: baseMinimaUvt === "" ? undefined : Number(baseMinimaUvt),
        cuentaId: cuenta!.id,
      }),
    onSuccess: async () => {
      await refrescar();
      aviso.exito("Concepto cargado");
      setCodigo("");
      setNombre("");
      setTarifa("");
      setTarifaNoDeclarante("");
      setBaseMinimaUvt("");
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const archivar = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      retencionesApi.editarConcepto(id, { activo }),
    onSuccess: refrescar,
    onError: (e: unknown) => aviso.falla(e),
  });

  const faltaConcepto =
    codigo.trim().length < 2 ||
    nombre.trim().length < 2 ||
    tarifa === "" ||
    cuenta === null;

  return (
    <>
      {/* Sin UVT no se puede saber si una base llega al mínimo, así que el
          cálculo entero se cae. Es lo primero que hay que cargar y por eso es
          lo primero que se ve. */}
      {uvtDelAnio === null && (
        <Aviso
          tono="alarma"
          titulo={`Falta la UVT del ${anio}`}
          accion={<span className="text-sm font-semibold">Cargala acá abajo</span>}
        >
          Las bases mínimas se escriben en UVT para que se actualicen solas.
          Sin el valor del año, el sistema no puede saber si una base llega al
          mínimo y no calcula ninguna retención.
        </Aviso>
      )}

      <section className="mb-6 flex flex-wrap items-end gap-4 rounded-3xl border border-border bg-card p-6">
        <Campo id="anio" etiqueta="Año" escala="grande">
          <Input
            id="anio"
            type="number"
            min="2000"
            max="2100"
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            className={`w-32 ${CONTROL}`}
          />
        </Campo>

        <Campo
          id="uvt"
          etiqueta="Valor de la UVT"
          ayuda="La que la DIAN fijó por resolución para ese año."
          escala="grande"
        >
          <div className="flex items-center gap-3">
            <Input
              id="uvt"
              type="number"
              min="1"
              step="0.01"
              value={valorUvt}
              onChange={(e) => setValorUvt(e.target.value)}
              placeholder={
                uvtDelAnio === null
                  ? "sin cargar"
                  : formatCOP(Number(uvtDelAnio.valor))
              }
              className={`w-44 ${CONTROL}`}
            />
            <Button
              type="button"
              variant="outline"
              disabled={!puedeCargar || valorUvt === "" || guardarUvt.isPending}
              onClick={() => guardarUvt.mutate()}
              className="h-11 rounded-xl px-5"
            >
              {guardarUvt.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {uvtDelAnio === null ? "Cargar" : "Corregir"}
            </Button>
          </div>
        </Campo>

        {uvtDelAnio !== null && (
          <p className="pb-1 text-sm text-muted-foreground">
            UVT {anio}:{" "}
            <b className="font-mono text-foreground">
              {formatCOP(Number(uvtDelAnio.valor))}
            </b>
          </p>
        )}
      </section>

      {puedeCargar && (
        <section className="mb-6 rounded-3xl border border-border bg-card p-6">
          <h3 className="mb-4 font-semibold">Cargar un concepto del {anio}</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Campo id="tipo" etiqueta="Tipo" escala="grande">
              <Select
                value={tipo}
                onValueChange={(v) => setTipo((v ?? "RENTA") as TipoRetencion)}
              >
                <SelectTrigger id="tipo" className={`w-full ${CONTROL}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_RETENCION.map((t) => (
                    <SelectItem key={t} value={t}>
                      {NOMBRE_TIPO_RETENCION[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>

            <Campo id="codigo" etiqueta="Código *" escala="grande">
              <Input
                id="codigo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="COMPRAS"
                className={`font-mono ${CONTROL}`}
              />
            </Campo>

            <Campo id="nombre" etiqueta="Nombre *" escala="grande">
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Compras generales"
                className={CONTROL}
              />
            </Campo>

            <Campo
              id="tarifa"
              etiqueta="Tarifa % *"
              ayuda="En porcentaje. Una de ICA en por mil va dividida: 7‰ es 0.7."
              escala="grande"
            >
              <Input
                id="tarifa"
                type="number"
                min="0"
                max="100"
                step="0.0001"
                value={tarifa}
                onChange={(e) => setTarifa(e.target.value)}
                placeholder="2.5"
                className={`font-mono ${CONTROL}`}
              />
            </Campo>

            {/* Solo renta distingue entre quien declara y quien no: el IVA
                retenido no depende de eso, y el ICA tampoco. */}
            {tipo === "RENTA" && (
              <Campo
                id="tarifaNoDeclarante"
                etiqueta="Tarifa si no declara %"
                ayuda="Servicios: 4 si declara, 6 si no. Dejalo vacío si el concepto tiene una sola."
                escala="grande"
              >
                <Input
                  id="tarifaNoDeclarante"
                  type="number"
                  min="0"
                  max="100"
                  step="0.0001"
                  value={tarifaNoDeclarante}
                  onChange={(e) => setTarifaNoDeclarante(e.target.value)}
                  placeholder="6"
                  className={`font-mono ${CONTROL}`}
                />
              </Campo>
            )}

            <Campo
              id="baseMinimaUvt"
              etiqueta="Base mínima en UVT"
              ayuda="Compras 27, servicios 4. Vacío o 0: retiene desde el primer peso."
              escala="grande"
            >
              <Input
                id="baseMinimaUvt"
                type="number"
                min="0"
                step="0.01"
                value={baseMinimaUvt}
                onChange={(e) => setBaseMinimaUvt(e.target.value)}
                placeholder="27"
                className={`font-mono ${CONTROL}`}
              />
            </Campo>

            <Campo
              id="cuenta"
              etiqueta="Cuenta *"
              ayuda="La 2365xx contra la que se acredita lo retenido."
              escala="grande"
            >
              <SelectorCuenta valor={cuenta} onElegir={setCuenta} />
            </Campo>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              disabled={faltaConcepto || crearConcepto.isPending}
              onClick={() => crearConcepto.mutate()}
              className="h-11 rounded-xl px-6"
            >
              {crearConcepto.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Cargar concepto
            </Button>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="border-b border-border p-6">
          <h2 className="text-2xl font-semibold">Conceptos del {anio}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Un concepto de un año no se corrige cuando ya tiene documentos: se
            carga el del año nuevo. Un certificado se explica con la tarifa de
            su año.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-24 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : conceptos.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
            <Percent className="size-8 text-muted-foreground" />
            <p className="font-semibold">Ningún concepto cargado para {anio}</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Sin conceptos, ninguna compra ni factura puede calcular
              retenciones. Las tarifas las define la DIAN y el municipio: las
              carga quien sabe de impuestos.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead className="bg-muted/40 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  {[
                    "Concepto",
                    "Tipo",
                    "Tarifa",
                    "Base mínima",
                    "Cuenta",
                    "Estado",
                    "Acciones",
                  ].map((x) => (
                    <th
                      key={x}
                      scope="col"
                      className={`px-5 py-4 ${
                        x === "Acciones" || x === "Tarifa" ? "text-right" : ""
                      }`}
                    >
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {conceptos.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-5 py-4">
                      <span className="block text-sm font-semibold">
                        {c.nombre}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {c.codigo}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {NOMBRE_TIPO_RETENCION[c.tipo]}
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-sm font-semibold">
                      {Number(c.tarifa)}%
                      {c.tarifa_no_declarante !== null && (
                        <span className="block text-xs font-normal text-muted-foreground">
                          {Number(c.tarifa_no_declarante)}% si no declara
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      {Number(c.base_minima_uvt) === 0 ? (
                        <span className="text-muted-foreground">
                          desde el primer peso
                        </span>
                      ) : (
                        <>
                          <span className="font-mono">
                            {Number(c.base_minima_uvt)} UVT
                          </span>
                          {uvtDelAnio !== null && (
                            <span className="block text-xs text-muted-foreground">
                              {formatCOP(
                                Number(c.base_minima_uvt) *
                                  Number(uvtDelAnio.valor),
                              )}
                            </span>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono text-sm text-muted-foreground">
                      {c.cuenta_codigo ?? "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-2 text-[13px] font-semibold">
                        <span
                          className={`size-2 rounded-full ${c.activo ? "bg-success" : "bg-muted-foreground"}`}
                        />
                        {c.activo ? "Activo" : "Archivado"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          disabled={!puedeCargar || archivar.isPending}
                          className="h-10 rounded-xl px-4 text-muted-foreground"
                          onClick={() =>
                            archivar.mutate({ id: c.id, activo: !c.activo })
                          }
                        >
                          {c.activo ? "Archivar" : "Reactivar"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
