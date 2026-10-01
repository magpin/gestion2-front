"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Plus, Search, Sparkles } from "lucide-react";
import { z } from "zod";

import { aviso } from "@/lib/avisos";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Campo } from "@/modules/configuracion/components/Campo";
import { ArbolPlan } from "../components/ArbolPlan";
import { CentrosDeCosto } from "../components/CentrosDeCosto";
import { useCentrosCosto } from "../components/SelectorCentroCosto";
import { CuentasAutomaticas } from "../components/CuentasAutomaticas";
import { SelectorCuentaPuc } from "../components/SelectorCuentaPuc";
import { planCuentasApi } from "../services/plan-cuentas.service";

const CLAVE = ["plan-cuentas"];

const esquemaCuenta = z.object({
  codigo: z.string().regex(/^[0-9]{1,20}$/, "Solo dígitos"),
  nombre: z.string().min(2, "Requerido").max(200),
});

/**
 * El plan de cuentas de la empresa, fuera del asistente.
 *
 * Acá se entra a mantenerlo, no a armarlo: armarlo es el paso 4, que propone las
 * cuentas a partir de lo que la empresa declaró. Este es el lugar donde se agrega
 * el banco nuevo o se da de baja la cuenta que dejó de usarse.
 *
 * Nada se borra. Una cuenta con movimiento no se puede quitar sin dejar asientos
 * sin contrapartida, así que se desactiva y deja de ofrecerse al digitar.
 */
export function PlanCuentasView() {
  const queryClient = useQueryClient();
  // Se puede llegar filtrado desde un aviso («Ir al plan de cuentas»):
  // `?q=130505&inactivas=1`.
  const parametros = useSearchParams();
  const [busqueda, setBusqueda] = useState(parametros.get("q") ?? "");
  const [inactivas, setInactivas] = useState(parametros.get("inactivas") === "1");

  const { data: cuentas = [], isLoading } = useQuery({
    queryKey: [...CLAVE, busqueda, inactivas],
    queryFn: () =>
      planCuentasApi.listar({
        q: busqueda.trim() || undefined,
        incluirInactivas: inactivas ? "true" : undefined,
      }),
  });

  // Un auxiliar nuevo puede volver elegible una cuenta automática (o dejar
  // de serlo): las dos listas se refrescan juntas.
  const refrescar = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: CLAVE }),
      queryClient.invalidateQueries({ queryKey: ["tesoreria", "configuracion"] }),
      queryClient.invalidateQueries({ queryKey: ["inventario", "configuracion"] }),
    ]);

  // El conteo se saca de lo que ya está en pantalla y no de otra consulta: con el
  // buscador vacío es el plan entero, y con texto es cuántas encontró — que es
  // justo lo que uno quiere saber en cada caso.
  const activas = cuentas.filter((c) => c.activa);
  const conMovimiento = activas.filter((c) => c.es_auxiliar).length;
  const desactivadas = cuentas.length - activas.length;

  const formCuenta = useForm<z.infer<typeof esquemaCuenta>>({
    resolver: zodResolver(esquemaCuenta),
    defaultValues: { codigo: "", nombre: "" },
  });

  const crearCuenta = useMutation({
    mutationFn: (d: z.infer<typeof esquemaCuenta>) => planCuentasApi.crear(d),
    onSuccess: async () => {
      await refrescar();
      formCuenta.reset();
      aviso.exito("Cuenta agregada");
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  // El auxiliar se numera en el servidor: cuenta también los desactivados,
  // que acá pueden no estar a la vista.
  const crearAuxiliar = useMutation({
    mutationFn: (d: { madre: string; nombre: string }) => planCuentasApi.crearAuxiliar(d),
    onSuccess: async (c) => {
      await refrescar();
      aviso.exito(`Auxiliar ${c.codigo} creado`);
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const activar = useMutation({
    mutationFn: (id: string) => planCuentasApi.activar(id),
    onSuccess: async () => {
      await refrescar();
      aviso.exito("Cuenta activada");
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  // Con los centros encendidos, cada cuenta de resultado puede dejar de
  // exigirlo (o volver a exigirlo) una por una.
  const { maneja: manejaCentros } = useCentrosCosto();
  const exigirCentro = useMutation({
    mutationFn: ({ id, exige }: { id: string; exige: boolean }) =>
      planCuentasApi.editar(id, { exigeCentroCosto: exige }),
    onSuccess: async () => {
      await refrescar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const desactivar = useMutation({
    mutationFn: (id: string) => planCuentasApi.desactivar(id),
    onSuccess: async () => {
      await refrescar();
      aviso.exito("Cuenta desactivada");
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center gap-4">
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight">
            Plan de cuentas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Lo que la empresa usa del Decreto 2650, más sus auxiliares.
          </p>
          {/* Cuántas quedaron y cuántas sirven para asentar. La segunda cifra no
              es un adorno: un plan lleno de cuentas de agrupación no deja
              registrar ni una factura, y eso no se ve mirando el total. */}
          {!isLoading && (
            <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
              {/* El único acento de la pantalla, sobre el dato que se viene a
                  buscar. `brand-text` porque va sobre fondo claro. */}
              <span className="font-semibold text-brand-text">
                {activas.length} cuenta{activas.length === 1 ? "" : "s"} activa
                {activas.length === 1 ? "" : "s"}
              </span>
              <span className="text-muted-foreground">
                · {conMovimiento} recibe{conMovimiento === 1 ? "" : "n"}{" "}
                movimiento
              </span>
              {desactivadas > 0 && (
                <span className="text-muted-foreground">
                  · {desactivadas} desactivada{desactivadas === 1 ? "" : "s"}
                </span>
              )}
              {busqueda.trim() !== "" && (
                <span className="text-muted-foreground">
                  · filtrando por “{busqueda.trim()}”
                </span>
              )}
            </p>
          )}
        </div>
        <Link
          href="/configuracion/plan_cuentas"
          className={buttonVariants({ variant: "outline" })}
        >
          <Sparkles className="size-4" />
          Ver sugerencias
        </Link>
      </header>

      <CuentasAutomaticas />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Código o nombre"
            className="pl-9"
            aria-label="Buscar cuenta"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={inactivas}
            onChange={(e) => setInactivas(e.target.checked)}
            className="size-3.5"
          />
          Ver desactivadas
        </label>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <ArbolPlan
          cuentas={cuentas}
          creando={crearAuxiliar.isPending}
          onCrearAuxiliar={(d) => crearAuxiliar.mutate(d)}
          onActivar={(id) => activar.mutate(id)}
          onDesactivar={(id) => desactivar.mutate(id)}
          onExigirCentro={
            manejaCentros ? (id, exige) => exigirCentro.mutate({ id, exige }) : undefined
          }
        />
      )}

      <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold">Agregar una cuenta</h2>
        <p className="text-xs text-muted-foreground">
          Búsquela en el catálogo del Decreto 2650 y el código y el nombre se
          llenan solos. Después los puede ajustar: donde el decreto deja la
          numeración libre, el código lo decide usted.
        </p>

        {/* Antes aquí había un campo de código a secas: había que saberse los seis
            dígitos de memoria, y uno equivocado solo se descubría al enviarlo. */}
        <SelectorCuentaPuc
          onElegir={(c) => {
            formCuenta.setValue("codigo", c.codigo, { shouldValidate: true });
            formCuenta.setValue(
              "nombre",
              c.nombre.replace(/\s*\((DB|CR)\)$/, ""),
              {
                shouldValidate: true,
              },
            );
          }}
        />

        <form
          onSubmit={formCuenta.handleSubmit((d) => crearCuenta.mutate(d))}
          className="flex flex-wrap items-end gap-3"
        >
          <Campo
            id="nuevoCodigo"
            etiqueta="Código"
            error={formCuenta.formState.errors.codigo?.message}
          >
            <Input
              id="nuevoCodigo"
              className="w-40 font-mono"
              {...formCuenta.register("codigo")}
            />
          </Campo>
          <Campo
            id="nuevoNombre"
            etiqueta="Nombre"
            error={formCuenta.formState.errors.nombre?.message}
            className="min-w-56 flex-1"
          >
            <Input id="nuevoNombre" {...formCuenta.register("nombre")} />
          </Campo>
          <Button type="submit" disabled={crearCuenta.isPending}>
            {crearCuenta.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Agregar
          </Button>
        </form>
      </section>

      <CentrosDeCosto />
    </div>
  );
}
