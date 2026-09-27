"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aviso } from "@/lib/avisos";
import { cn } from "@/lib/utils";
import { BotonBuscar } from "../components/BotonBuscar";
import {
  Encabezado,
  ErrorCarga,
  EsqueletoPagina,
  Mono,
  Pastilla,
  SinConfigurar,
  Tarjeta,
} from "../components/piezas";
import { dolares, pesos, plural } from "../lib/formato";
import { plataformaService } from "../services/plataforma.service";
import type { PlanConCuentas } from "../types/plataforma.types";

/**
 * El catálogo de planes: precio, cupos con que nace una cuenta y tope de IA.
 * El tope es **de ejemplo**: se muestra, pero todavía no frena nada.
 */
export function PlanesView() {
  const consulta = useQuery({
    queryKey: ["plataforma", "planes"],
    queryFn: plataformaService.planes,
  });
  const [editando, setEditando] = useState<PlanConCuentas | null>(null);

  if (consulta.isPending) return <EsqueletoPagina tarjetas={4} />;
  if (consulta.isError || !consulta.data)
    return (
      <>
        <Encabezado titulo="Planes" />
        <ErrorCarga
          que="los planes"
          alReintentar={() => void consulta.refetch()}
        />
      </>
    );

  const planes = consulta.data;
  const conPlan = planes.reduce((s, p) => s + p.cuentas, 0);

  return (
    <>
      <Encabezado
        titulo="Planes"
        subtitulo={`${plural(planes.length, "plan", "planes")}, ${plural(conPlan, "cuenta")} con plan vigente`}
        acciones={<BotonBuscar />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {planes.map((p) => {
          const aca = editando?.clave === p.clave;
          return (
            <Tarjeta
              key={p.clave}
              className={cn("gap-3", aca && "border-foreground")}
              titulo={
                <span className="flex items-center gap-2">
                  {p.nombre}
                  {aca && <Pastilla tono="info">Editando</Pastilla>}
                </span>
              }
            >
              <div className="flex items-baseline gap-1.5">
                {p.precioMensual === null ? (
                  <SinConfigurar texto="Precio sin configurar" />
                ) : (
                  <>
                    <Mono className="text-2xl font-medium">
                      {pesos(p.precioMensual)}
                    </Mono>
                    <span className="text-[13px] text-muted-foreground">
                      al mes
                    </span>
                  </>
                )}
              </div>
              <dl className="m-0 flex flex-col gap-2 text-[13px]">
                <Fila texto="Empresas" valor={<Mono>{p.maxEmpresas}</Mono>} />
                <Fila texto="Usuarios" valor={<Mono>{p.maxUsuarios}</Mono>} />
                <Fila
                  texto="Tope de IA incluido"
                  valor={
                    p.topeIaUsd === null ? (
                      <SinConfigurar texto="Sin configurar" />
                    ) : (
                      <Mono title="De ejemplo: todavía no frena">
                        {dolares(p.topeIaUsd)} al mes*
                      </Mono>
                    )
                  }
                />
              </dl>
              <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                <span className="text-[13px] text-muted-foreground">
                  {plural(p.cuentas, "cuenta")} lo{" "}
                  {p.cuentas === 1 ? "tiene" : "tienen"}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditando(p)}
                >
                  Editar
                </Button>
              </div>
            </Tarjeta>
          );
        })}
      </div>

      <p className="m-0 text-xs text-muted-foreground">
        * Los topes de IA son de ejemplo: se muestran, pero todavía no frenan el
        asistente. Cuando se construyan, al llegar al tope el chat se frena y el
        cliente podrá comprar más.
      </p>

      {editando && (
        <EditarPlan
          key={editando.clave}
          plan={editando}
          alCerrar={() => setEditando(null)}
        />
      )}
    </>
  );
}

function Fila({ texto, valor }: { texto: string; valor: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{texto}</dt>
      <dd className="m-0">{valor}</dd>
    </div>
  );
}

function EditarPlan({
  plan,
  alCerrar,
}: {
  plan: PlanConCuentas;
  alCerrar: () => void;
}) {
  const qc = useQueryClient();
  const [empresas, setEmpresas] = useState(String(plan.maxEmpresas));
  const [usuarios, setUsuarios] = useState(String(plan.maxUsuarios));
  const [precio, setPrecio] = useState(
    plan.precioMensual === null ? "" : String(plan.precioMensual),
  );
  const [tope, setTope] = useState(
    plan.topeIaUsd === null ? "" : String(plan.topeIaUsd),
  );
  const e = Number(empresas);
  const u = Number(usuarios);
  const pr = precio.trim() === "" ? null : Number(precio.replace(/\D/g, ""));
  const tp = tope.trim() === "" ? null : Number(tope.replace(",", "."));
  const valido =
    Number.isInteger(e) &&
    Number.isInteger(u) &&
    e >= 1 &&
    u >= 1 &&
    (tp === null || (Number.isFinite(tp) && tp >= 0));
  const cambiaCupos = e !== plan.maxEmpresas || u !== plan.maxUsuarios;
  const cambiaPrecio =
    (pr !== null && pr !== plan.precioMensual) ||
    (tp !== null && tp !== plan.topeIaUsd);
  const cambio = cambiaCupos || cambiaPrecio;

  const guardar = useMutation({
    mutationFn: async () => {
      if (cambiaCupos)
        await plataformaService.editarPlan(plan.clave, {
          maxEmpresas: e,
          maxUsuarios: u,
        });
      if (cambiaPrecio)
        await plataformaService.editarPrecio(plan.clave, {
          ...(pr !== null ? { precioMensual: pr } : {}),
          ...(tp !== null ? { topeIaUsd: tp } : {}),
        });
    },
    onSuccess: async () => {
      aviso.exito(`Plan ${plan.nombre} guardado`);
      await qc.invalidateQueries({ queryKey: ["plataforma", "planes"] });
      alCerrar();
    },
    onError: (err) => aviso.falla(err),
  });

  return (
    <Tarjeta titulo={`Editar ${plan.nombre}`} className="gap-5">
      <div className="grid gap-4 md:grid-cols-4">
        <Campo
          texto="Precio mensual"
          nota={
            plan.precioMensual === null
              ? "Sin precio todavía."
              : `Hoy: ${pesos(plan.precioMensual)}`
          }
        >
          <Input
            inputMode="numeric"
            value={precio}
            onChange={(ev) => setPrecio(ev.target.value)}
            className="text-right font-mono tabular-nums"
          />
        </Campo>
        <Campo texto="Cupo de empresas" nota={`Hoy: ${plan.maxEmpresas}`}>
          <Input
            type="number"
            min={1}
            value={empresas}
            onChange={(ev) => setEmpresas(ev.target.value)}
          />
        </Campo>
        <Campo texto="Cupo de usuarios" nota={`Hoy: ${plan.maxUsuarios}`}>
          <Input
            type="number"
            min={1}
            value={usuarios}
            onChange={(ev) => setUsuarios(ev.target.value)}
          />
        </Campo>
        <Campo
          texto="Tope de IA al mes (US$)"
          nota="De ejemplo: todavía no frena."
        >
          <Input
            inputMode="decimal"
            value={tope}
            onChange={(ev) => setTope(ev.target.value)}
            className="text-right font-mono tabular-nums"
          />
        </Campo>
      </div>
      <div className="flex flex-col gap-3 rounded-lg border border-info bg-info/10 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span>
          El precio nuevo se cobra a las {plural(plan.cuentas, "cuenta")} de{" "}
          {plan.nombre} desde su próximo cobro, salvo las que tienen precio
          pactado. Los cupos nuevos son solo para las cuentas que se creen desde
          hoy: las que ya existen conservan los suyos.
        </span>
      </div>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={alCerrar}>
          Cancelar
        </Button>
        <Button
          disabled={!valido || !cambio || guardar.isPending}
          onClick={() => guardar.mutate()}
        >
          {guardar.isPending && <Loader2 className="animate-spin" />}
          Guardar cambios
        </Button>
      </div>
    </Tarjeta>
  );
}

function Campo({
  texto,
  nota,
  children,
}: {
  texto: string;
  nota?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{texto}</span>
      {children}
      {nota && <span className="text-xs text-muted-foreground">{nota}</span>}
    </label>
  );
}
