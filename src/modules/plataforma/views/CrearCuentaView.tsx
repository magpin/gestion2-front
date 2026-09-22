"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aviso } from "@/lib/avisos";
import { cn } from "@/lib/utils";
import { BotonBuscar } from "../components/BotonBuscar";
import { ContrasenaUnaVez } from "../components/dialogos";
import { Encabezado, Mono, SinConfigurar, Tarjeta } from "../components/piezas";
import { dolares, pesos } from "../lib/formato";
import { plataformaService } from "../services/plataforma.service";
import { NOMBRE_PLAN, type Plan } from "../types/plataforma.types";

const PASOS = ["Cuenta", "Administrador", "Plan y cupos", "Confirmación"] as const;

const CORREO = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

/**
 * Dar de alta a un cliente, en cuatro pasos cortos. Nada de su empresa: el
 * NIT, el marco NIIF y la fecha de inicio los sabe su contador, y los pone
 * su director al entrar. Al final, la contraseña del administrador, una vez.
 */
export function CrearCuentaView() {
  const qc = useQueryClient();
  const [paso, setPaso] = useState(0);
  const [f, setF] = useState({
    nombreCuenta: "",
    nombreAdministrador: "",
    email: "",
    plan: "BASICO" as Plan,
    maxEmpresas: "",
    maxUsuarios: "",
  });

  const planes = useQuery({ queryKey: ["plataforma", "planes"], queryFn: plataformaService.planes });
  const plan = planes.data?.find((p) => p.clave === f.plan);
  const cupoEmpresas = Number(f.maxEmpresas) || plan?.maxEmpresas || 1;
  const cupoUsuarios = Number(f.maxUsuarios) || plan?.maxUsuarios || 1;

  const crear = useMutation({
    mutationFn: () =>
      plataformaService.crearCuenta({
        email: f.email.trim(),
        nombreCuenta: f.nombreCuenta.trim(),
        nombreAdministrador: f.nombreAdministrador.trim(),
        plan: f.plan,
        maxEmpresas: cupoEmpresas,
        maxUsuarios: cupoUsuarios,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["plataforma"] });
    },
    onError: (e) => aviso.falla(e),
  });

  const listo = [
    f.nombreCuenta.trim().length >= 3,
    f.nombreAdministrador.trim().length >= 3 && CORREO.test(f.email.trim()),
    cupoEmpresas >= 1 && cupoUsuarios >= 1,
    true,
  ];

  if (crear.data) {
    const r = crear.data;
    return (
      <>
        <Encabezado titulo="Nueva cuenta" acciones={<BotonBuscar />} />
        <Pasos actual={PASOS.length} />
        <Tarjeta className="mx-auto w-full max-w-2xl gap-6 p-6 md:p-8">
          <div className="flex flex-col gap-1">
            <h2 className="m-0 font-serif text-[28px] font-normal">Cuenta creada</h2>
            <p className="m-0 text-sm text-muted-foreground">
              {f.nombreCuenta.trim()} ya puede entrar con el correo de su administrador.
            </p>
          </div>
          {r.password ? (
            <ContrasenaUnaVez
              titulo={`Contraseña de ${f.nombreAdministrador.trim()}`}
              password={r.password}
              email={r.email}
              aviso="Cópiela o díctela ahora. Si se pierde, hay que restablecerla desde la cuenta."
            />
          ) : null}
          <Resumen f={f} plan={plan ? `${NOMBRE_PLAN[f.plan]}: ${cupoEmpresas} empresas, ${cupoUsuarios} usuarios` : ""} />
          <div className="flex flex-wrap justify-end gap-3">
            <Link
              href={`/plataforma/cuentas/${r.tenantId}?pestana=empresas`}
              className={buttonVariants({ variant: "outline" })}
            >
              Agregar la primera empresa
            </Link>
            <Link href={`/plataforma/cuentas/${r.tenantId}`} className={buttonVariants()}>
              Ir a la cuenta
            </Link>
          </div>
        </Tarjeta>
      </>
    );
  }

  return (
    <>
      <Encabezado
        titulo="Nueva cuenta"
        ruta={{ href: "/plataforma/cuentas", texto: "Cuentas" }}
        acciones={<BotonBuscar />}
      />
      <Pasos actual={paso} />

      <Tarjeta className="mx-auto w-full max-w-2xl gap-6 p-6 md:p-8">
        {paso === 0 && (
          <Campos titulo="La cuenta" texto="Es el cliente que paga. Puede tener varias empresas adentro.">
            <Campo texto="Nombre del cliente" nota="Como aparece en la factura que se le cobra.">
              <Input
                autoFocus
                value={f.nombreCuenta}
                onChange={(e) => setF({ ...f, nombreCuenta: e.target.value })}
                placeholder="Agropecuaria Los Guaduales S.A.S."
              />
            </Campo>
          </Campos>
        )}

        {paso === 1 && (
          <Campos
            titulo="Su administrador"
            texto="La persona que entra primero: crea las empresas e invita a los demás."
          >
            <Campo texto="Nombre completo">
              <Input
                autoFocus
                value={f.nombreAdministrador}
                onChange={(e) => setF({ ...f, nombreAdministrador: e.target.value })}
                placeholder="Laura Gómez"
              />
            </Campo>
            <Campo texto="Correo" nota="Con este correo entra. La contraseña se genera al final.">
              <Input
                type="email"
                value={f.email}
                onChange={(e) => setF({ ...f, email: e.target.value })}
                placeholder="laura.gomez@losguaduales.co"
              />
            </Campo>
          </Campos>
        )}

        {paso === 2 && (
          <Campos titulo="Plan y cupos" texto="Los cupos salen del plan. Se pueden cambiar solo para esta cuenta.">
            {planes.isPending ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            ) : (
              <div role="radiogroup" aria-label="Plan" className="grid gap-3 sm:grid-cols-2">
                {planes.data?.map((p) => {
                  const elegido = p.clave === f.plan;
                  return (
                    <button
                      key={p.clave}
                      type="button"
                      role="radio"
                      aria-checked={elegido}
                      onClick={() => setF({ ...f, plan: p.clave, maxEmpresas: "", maxUsuarios: "" })}
                      className={cn(
                        "flex flex-col gap-1 rounded-xl border p-4 text-left transition-colors",
                        elegido ? "border-foreground bg-muted/60" : "border-border hover:bg-muted/40",
                      )}
                    >
                      <span className="flex items-center justify-between font-medium">
                        {p.nombre}
                        {elegido && <Check className="size-4" />}
                      </span>
                      <span className="text-[13px] text-muted-foreground">
                        {p.maxEmpresas} {p.maxEmpresas === 1 ? "empresa" : "empresas"}, {p.maxUsuarios} usuarios
                        {p.topeIaUsd !== null && `, ${dolares(p.topeIaUsd)} de IA`}
                      </span>
                      <span className="text-[13px]">
                        {p.precioMensual === null ? <SinConfigurar texto="Precio sin configurar" /> : `${pesos(p.precioMensual)} al mes`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo texto="Cupo de empresas">
                <Input
                  type="number"
                  min={1}
                  value={f.maxEmpresas || String(plan?.maxEmpresas ?? "")}
                  onChange={(e) => setF({ ...f, maxEmpresas: e.target.value })}
                />
              </Campo>
              <Campo texto="Cupo de usuarios">
                <Input
                  type="number"
                  min={1}
                  value={f.maxUsuarios || String(plan?.maxUsuarios ?? "")}
                  onChange={(e) => setF({ ...f, maxUsuarios: e.target.value })}
                />
              </Campo>
            </div>
          </Campos>
        )}

        {paso === 3 && (
          <Campos titulo="Confirmación" texto="Revise antes de crear. Al confirmar se genera la contraseña.">
            <Resumen
              f={f}
              plan={`${NOMBRE_PLAN[f.plan]}: ${cupoEmpresas} ${cupoEmpresas === 1 ? "empresa" : "empresas"}, ${cupoUsuarios} usuarios`}
            />
          </Campos>
        )}

        <div className="flex justify-between gap-3 border-t border-border pt-5">
          {paso > 0 ? (
            <Button variant="outline" onClick={() => setPaso(paso - 1)}>
              Atrás
            </Button>
          ) : (
            <Link href="/plataforma/cuentas" className={buttonVariants({ variant: "outline" })}>
              Cancelar
            </Link>
          )}
          {paso < PASOS.length - 1 ? (
            <Button disabled={!listo[paso]} onClick={() => setPaso(paso + 1)}>
              Siguiente
            </Button>
          ) : (
            <Button disabled={crear.isPending} onClick={() => crear.mutate()}>
              {crear.isPending && <Loader2 className="animate-spin" />}
              Crear la cuenta
            </Button>
          )}
        </div>
      </Tarjeta>
    </>
  );
}

function Pasos({ actual }: { actual: number }) {
  return (
    <ol aria-label="Pasos del alta" className="m-0 mx-auto flex w-full max-w-2xl list-none gap-2 p-0">
      {PASOS.map((p, i) => {
        const hecho = i < actual;
        const aca = i === actual;
        return (
          <li key={p} className="flex flex-1 flex-col gap-2" aria-current={aca ? "step" : undefined}>
            <span
              className={cn(
                "h-1 rounded-full",
                hecho ? "bg-foreground/70" : aca ? "bg-brand" : "bg-muted",
              )}
            />
            <span className={cn("text-xs", aca ? "font-medium text-foreground" : "text-muted-foreground")}>
              {p}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Campos({
  titulo,
  texto,
  children,
}: {
  titulo: string;
  texto: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-lg font-semibold">{titulo}</h2>
        <p className="m-0 text-sm text-muted-foreground">{texto}</p>
      </div>
      {children}
    </div>
  );
}

function Campo({ texto, nota, children }: { texto: string; nota?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{texto}</span>
      {children}
      {nota && <span className="text-xs text-muted-foreground">{nota}</span>}
    </label>
  );
}

function Resumen({
  f,
  plan,
}: {
  f: { nombreCuenta: string; nombreAdministrador: string; email: string };
  plan: string;
}) {
  const filas = [
    ["Cuenta", f.nombreCuenta.trim()],
    ["Administrador", f.nombreAdministrador.trim()],
    ["Correo", f.email.trim()],
    ["Plan", plan],
  ];
  return (
    <dl className="m-0 grid grid-cols-[120px_1fr] gap-x-4 gap-y-2.5 rounded-xl border border-border p-4 text-sm">
      {filas.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="m-0">{k === "Correo" ? <Mono>{v}</Mono> : v}</dd>
        </div>
      ))}
    </dl>
  );
}
