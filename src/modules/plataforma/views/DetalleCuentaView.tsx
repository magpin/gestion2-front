"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { KeyRound, Loader2, Plus, UserCheck, UserX } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { aviso } from "@/lib/avisos";
import { cn } from "@/lib/utils";
import {
  DialogoContrasena,
  DialogoCupos,
  DialogoEmpresa,
  DialogoEstado,
  DialogoPlan,
  DialogoUsuario,
} from "../components/dialogos";
import {
  BarraCupo,
  Encabezado,
  ErrorCarga,
  EsqueletoPagina,
  EstadoCuentaBadge,
  Mono,
  Pastilla,
  Pestanas,
  PlanBadge,
  SinConfigurar,
  Tarjeta,
  Td,
  Th,
  Vacio,
} from "../components/piezas";
import {
  DialogoPago,
  EstadoPago,
  PestanaSuscripcion,
} from "../components/suscripcion";
import { VistaConsumo } from "../components/VistaConsumo";
import { describir } from "../lib/bitacora";
import {
  cuando,
  dolares,
  fecha,
  hora,
  lista,
  nit,
  pesos,
  porciento,
} from "../lib/formato";
import { useTasa } from "../lib/tasa";
import { plataformaService } from "../services/plataforma.service";
import {
  NOMBRE_PLAN,
  NOMBRE_ROL,
  type DetalleCuenta,
  type EmpresaDeCuenta,
  type EntradaBitacora,
} from "../types/plataforma.types";

type Pestana =
  "resumen" | "empresas" | "usuarios" | "consumo" | "suscripcion" | "bitacora";
type Dialogo =
  "plan" | "estado" | "cupos" | "empresa" | "usuario" | "pago" | null;

const GRUPO: Record<string, string> = {
  GRUPO_1: "Grupo 1",
  GRUPO_2: "Grupo 2",
  GRUPO_3: "Grupo 3",
};

export function DetalleCuentaView({ id }: { id: string }) {
  const router = useRouter();
  const ruta = usePathname();
  const url = useSearchParams();
  const pestana = (url.get("pestana") as Pestana | null) ?? "resumen";
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [contrasena, setContrasena] = useState<{
    password: string;
    email: string;
    nombre?: string;
  } | null>(null);

  const consulta = useQuery({
    queryKey: ["plataforma", "cuenta", id],
    queryFn: () => plataformaService.cuenta(id),
  });

  const irA = (p: Pestana) =>
    router.replace(p === "resumen" ? ruta : `${ruta}?pestana=${p}`, {
      scroll: false,
    });

  if (consulta.isPending) return <EsqueletoPagina tarjetas={4} />;
  if (consulta.isError || !consulta.data) {
    return (
      <>
        <Encabezado
          titulo="Cuenta"
          ruta={{ href: "/plataforma/cuentas", texto: "Cuentas" }}
        />
        <ErrorCarga
          que="la cuenta"
          alReintentar={() => void consulta.refetch()}
        />
      </>
    );
  }

  const d = consulta.data;
  const c = d.cuenta;

  return (
    <>
      <Encabezado
        titulo={c.nombre}
        ruta={{ href: "/plataforma/cuentas", texto: "Cuentas" }}
        acciones={
          <>
            <Button variant="outline" onClick={() => setDialogo("cupos")}>
              Ajustar cupos
            </Button>
            <Button variant="outline" onClick={() => setDialogo("estado")}>
              Cambiar estado
            </Button>
            <Button onClick={() => setDialogo("plan")}>Cambiar plan</Button>
          </>
        }
      >
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <PlanBadge plan={c.plan} />
          <EstadoCuentaBadge estado={c.estado} />
          <span className="text-[13px] text-muted-foreground">
            Cliente desde el {fecha(c.creadoEn)}
          </span>
        </div>
      </Encabezado>

      <PestanasCuenta pestana={pestana} irA={irA} d={d} />

      {pestana === "resumen" && (
        <Resumen d={d} irA={irA} alPagar={() => setDialogo("pago")} />
      )}
      {pestana === "suscripcion" && <PestanaSuscripcion cuenta={c} />}
      {pestana === "empresas" && (
        <Empresas
          empresas={d.empresas}
          alAgregar={() => setDialogo("empresa")}
        />
      )}
      {pestana === "usuarios" && (
        <Usuarios
          d={d}
          alAgregar={() => setDialogo("usuario")}
          alRestablecer={(p) => setContrasena(p)}
        />
      )}
      {pestana === "consumo" && <VistaConsumo cuentaId={id} />}
      {pestana === "bitacora" && <BitacoraCuenta cuentaId={id} />}

      {/* Cada diálogo se monta al abrirse: arranca con los datos de hoy. */}
      {dialogo === "plan" && (
        <DialogoPlan
          cuenta={c}
          iaMesUsd={c.iaMesUsd}
          abierto
          alCerrar={() => setDialogo(null)}
        />
      )}
      {dialogo === "estado" && (
        <DialogoEstado cuenta={c} abierto alCerrar={() => setDialogo(null)} />
      )}
      {dialogo === "cupos" && (
        <DialogoCupos cuenta={c} abierto alCerrar={() => setDialogo(null)} />
      )}
      {dialogo === "empresa" && (
        <DialogoEmpresa cuenta={c} abierto alCerrar={() => setDialogo(null)} />
      )}
      {dialogo === "usuario" && (
        <DialogoUsuario
          cuenta={c}
          empresas={d.empresas}
          abierto
          alCerrar={() => setDialogo(null)}
          alCrear={setContrasena}
        />
      )}
      {dialogo === "pago" && d.cobro && (
        <DialogoPago
          cuenta={c}
          suscripcion={{
            precio: d.cobro.precio,
            estado: {
              cargos: [],
              totalCargado: 0,
              totalPagado: 0,
              saldo: d.cobro.saldo,
              vencido: d.cobro.vencido,
              diasMora: d.cobro.diasMora,
            },
          }}
          alCerrar={() => setDialogo(null)}
        />
      )}
      <DialogoContrasena
        datos={contrasena}
        alCerrar={() => setContrasena(null)}
      />
    </>
  );
}

function PestanasCuenta({
  pestana,
  irA,
  d,
}: {
  pestana: Pestana;
  irA: (p: Pestana) => void;
  d: DetalleCuenta;
}) {
  const opciones: { valor: Pestana; texto: string; cuenta?: number }[] = [
    { valor: "resumen", texto: "Resumen" },
    { valor: "empresas", texto: "Empresas", cuenta: d.empresas.length },
    {
      valor: "usuarios",
      texto: "Usuarios",
      cuenta: d.usuarios.filter((u) => u.activo).length,
    },
    { valor: "consumo", texto: "Consumo de IA" },
    { valor: "suscripcion", texto: "Suscripción" },
    { valor: "bitacora", texto: "Bitácora" },
  ];
  return (
    <Pestanas
      etiqueta="Secciones de la cuenta"
      valor={pestana}
      alCambiar={irA}
      opciones={opciones}
    />
  );
}

// ---------------------------------------------------------------------------
// Resumen
// ---------------------------------------------------------------------------

function Resumen({
  d,
  irA,
  alPagar,
}: {
  d: DetalleCuenta;
  irA: (p: Pestana) => void;
  alPagar: () => void;
}) {
  const [tasa] = useTasa();
  const c = d.cuenta;
  const tope = d.plan?.topeIaUsd ?? null;
  const cobro = d.cobro;
  const paga = cobro?.precio ?? null;
  const margen = paga === null ? null : paga - c.iaMesUsd * tasa;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tarjeta titulo="Cupos" className="gap-3.5">
          <BarraCupo
            usados={c.empresas}
            max={c.maxEmpresas}
            etiqueta="Empresas"
          />
          <BarraCupo
            usados={c.usuarios}
            max={c.maxUsuarios}
            etiqueta="Usuarios"
          />
        </Tarjeta>

        <Tarjeta
          titulo="Lo que paga"
          className="gap-2"
          accion={
            cobro && (
              <EstadoPago diasMora={cobro.diasMora} vencido={cobro.vencido} />
            )
          }
        >
          {paga === null ? (
            <SinConfigurar />
          ) : (
            <Mono className="text-2xl font-medium">{pesos(paga)}</Mono>
          )}
          {cobro && (
            <span className="text-[13px] text-muted-foreground">
              Al mes
              {cobro.precioPactado !== null
                ? ", precio pactado"
                : `, plan ${NOMBRE_PLAN[c.plan]}`}
              . Próximo cobro: {fecha(`${cobro.proximoCobro}T12:00:00Z`)}.
              {cobro.ultimoPago &&
                ` Último pago: ${fecha(`${cobro.ultimoPago.fecha}T12:00:00Z`)}.`}
            </span>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={alPagar}
              className="text-[13px] text-brand-text hover:underline"
            >
              Registrar un pago
            </button>
            <button
              type="button"
              onClick={() => irA("suscripcion")}
              className="text-[13px] text-muted-foreground hover:text-foreground hover:underline"
            >
              Ver la suscripción
            </button>
          </div>
        </Tarjeta>

        <Tarjeta titulo="IA de este mes" className="gap-2">
          <div className="flex items-baseline gap-2">
            <Mono className="text-2xl font-medium">{dolares(c.iaMesUsd)}</Mono>
            <Mono className="text-[13px] text-muted-foreground">
              {pesos(c.iaMesUsd * tasa)}
            </Mono>
          </div>
          {tope !== null && tope > 0 ? (
            <>
              <BarraCupo
                usados={Math.round(c.iaMesUsd * 100)}
                max={Math.round(tope * 100)}
                compacta
              />
              <span className="text-[13px] text-muted-foreground">
                Tope de {dolares(tope)}. Al llegar, frena el chat y el cliente
                podrá comprar más.
              </span>
              <Pastilla tono="info">Ejemplo: todavía no frena</Pastilla>
            </>
          ) : (
            <span className="text-[13px] text-muted-foreground">
              Sin tope: se fija con los precios de los planes.
            </span>
          )}
          <button
            type="button"
            onClick={() => irA("consumo")}
            className="self-start text-[13px] text-brand-text hover:underline"
          >
            Ver el consumo
          </button>
        </Tarjeta>

        <Tarjeta titulo="Margen de la cuenta" className="gap-2">
          {margen === null || paga === null ? (
            <SinConfigurar />
          ) : (
            <Mono
              className={cn(
                "text-2xl font-medium",
                margen < 0 && "text-danger",
              )}
            >
              {pesos(margen)}
            </Mono>
          )}
          <span className="text-[13px] text-muted-foreground">
            {margen === null || !paga
              ? "Lo que paga menos lo que cuesta en IA. Necesita el precio del plan."
              : `${porciento(margen / paga, 1)} de lo que paga, después de la IA del mes.`}
          </span>
        </Tarjeta>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Tarjeta
          titulo="Empresas"
          accion={
            d.empresas.length > 3 && (
              <button
                type="button"
                onClick={() => irA("empresas")}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Ver las {d.empresas.length}
              </button>
            )
          }
        >
          {d.empresas.length === 0 ? (
            <Vacio
              titulo="Todavía no tiene empresas."
              texto="Su administrador la crea al entrar por primera vez."
            />
          ) : (
            <TablaEmpresas empresas={d.empresas.slice(0, 3)} />
          )}
        </Tarjeta>

        <Tarjeta
          titulo="Lo último"
          accion={
            <button
              type="button"
              onClick={() => irA("bitacora")}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Ver bitácora
            </button>
          }
        >
          {d.bitacora.length === 0 ? (
            <p className="m-0 text-sm text-muted-foreground">
              Sin cambios registrados.
            </p>
          ) : (
            <LineaDeTiempo entradas={d.bitacora.slice(0, 5)} />
          )}
        </Tarjeta>
      </div>
    </>
  );
}

function LineaDeTiempo({ entradas }: { entradas: EntradaBitacora[] }) {
  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {entradas.map((e, i) => (
        <li
          key={e.id}
          className={cn(
            "flex flex-col gap-0.5 py-2.5",
            i > 0 && "border-t border-border",
          )}
        >
          <Mono className="text-xs text-muted-foreground">
            {cuando(e.ocurridoEn)}
          </Mono>
          <span className="text-[13px]">{describir(e)}</span>
          <span className="text-xs text-muted-foreground">{e.admin}</span>
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Empresas
// ---------------------------------------------------------------------------

function TablaEmpresas({ empresas }: { empresas: EmpresaDeCuenta[] }) {
  const [tasa] = useTasa();
  return (
    <div className="-mx-3 overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr>
            <Th>Empresa</Th>
            <Th>NIT</Th>
            <Th>Grupo NIIF</Th>
            <Th>Configuración</Th>
            <Th derecha>IA del mes</Th>
          </tr>
        </thead>
        <tbody>
          {empresas.map((e) => (
            <tr key={e.id} className="group/fila">
              <Td>
                <span className="block font-medium">{e.razonSocial}</span>
                <span className="block text-xs text-muted-foreground">
                  {e.configuracion.completa
                    ? `${e.sedes} ${e.sedes === 1 ? "sede" : "sedes"}`
                    : `Falta ${lista(e.configuracion.pendientes).toLowerCase()}`}
                </span>
              </Td>
              <Td>
                <Mono className="whitespace-nowrap">{nit(e.nit, e.dv)}</Mono>
              </Td>
              <Td>{e.grupoNiif ? (GRUPO[e.grupoNiif] ?? e.grupoNiif) : "—"}</Td>
              <Td>
                <div className="flex items-center gap-2">
                  <Mono>
                    {e.configuracion.completados}/{e.configuracion.total}
                  </Mono>
                  <Pastilla
                    tono={e.configuracion.completa ? "exito" : "advertencia"}
                  >
                    {e.configuracion.completa ? "Completa" : "A medias"}
                  </Pastilla>
                  {!e.activo && <Pastilla>Inactiva</Pastilla>}
                </div>
              </Td>
              <Td derecha>
                <Mono title={dolares(e.iaMesUsd)}>
                  {pesos(e.iaMesUsd * tasa)}
                </Mono>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empresas({
  empresas,
  alAgregar,
}: {
  empresas: EmpresaDeCuenta[];
  alAgregar: () => void;
}) {
  return (
    <Tarjeta
      titulo="Empresas"
      accion={
        <Button variant="outline" size="sm" onClick={alAgregar}>
          <Plus /> Agregar empresa
        </Button>
      }
    >
      {empresas.length === 0 ? (
        <Vacio
          titulo="Todavía no tiene empresas."
          texto="Lo normal es que su director la cree desde el asistente. Si no puede, agréguela acá."
        />
      ) : (
        <TablaEmpresas empresas={empresas} />
      )}
    </Tarjeta>
  );
}

// ---------------------------------------------------------------------------
// Usuarios
// ---------------------------------------------------------------------------

function Usuarios({
  d,
  alAgregar,
  alRestablecer,
}: {
  d: DetalleCuenta;
  alAgregar: () => void;
  alRestablecer: (p: {
    password: string;
    email: string;
    nombre: string;
  }) => void;
}) {
  const qc = useQueryClient();
  const [ocupado, setOcupado] = useState<string | null>(null);

  const accion = useMutation({
    mutationFn: async ({
      tipo,
      usuarioId,
    }: {
      tipo: "restablecer" | "desactivar" | "reactivar";
      usuarioId: string;
    }) => {
      if (tipo === "restablecer")
        return plataformaService.restablecer(d.cuenta.id, usuarioId);
      if (tipo === "desactivar")
        return plataformaService.desactivar(d.cuenta.id, usuarioId);
      return plataformaService.reactivar(d.cuenta.id, usuarioId);
    },
    onMutate: ({ usuarioId }) => setOcupado(usuarioId),
    onSuccess: async (r, { tipo }) => {
      if (
        tipo === "restablecer" &&
        r &&
        "password" in r &&
        typeof r.password === "string"
      ) {
        alRestablecer({
          password: r.password,
          email: r.email,
          nombre: r.nombreCompleto,
        });
      } else {
        aviso.exito(
          tipo === "desactivar" ? "Usuario desactivado" : "Usuario reactivado",
        );
      }
      await qc.invalidateQueries({ queryKey: ["plataforma"] });
    },
    onError: (e) => aviso.falla(e),
    onSettled: () => setOcupado(null),
  });

  return (
    <Tarjeta
      titulo="Usuarios"
      accion={
        <Button variant="outline" size="sm" onClick={alAgregar}>
          <Plus /> Agregar usuario
        </Button>
      }
    >
      <div className="-mx-3 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr>
              <Th>Usuario</Th>
              <Th>Roles</Th>
              <Th>Estado</Th>
              <Th>Último acceso</Th>
              <Th derecha>Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {d.usuarios.map((u) => (
              <tr
                key={u.id}
                className={cn(
                  "group/fila",
                  !u.activo && "text-muted-foreground",
                )}
              >
                <Td>
                  <span className="block font-medium">{u.nombreCompleto}</span>
                  <span className="block text-xs text-muted-foreground">
                    {u.email}
                  </span>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    {u.esAdmin && (
                      <Pastilla tono="info">{NOMBRE_ROL.ADMIN_TENANT}</Pastilla>
                    )}
                    {u.roles.map((r) => (
                      <Pastilla key={r}>{NOMBRE_ROL[r] ?? r}</Pastilla>
                    ))}
                    {!u.esAdmin && u.roles.length === 0 && (
                      <span className="text-xs">Sin rol</span>
                    )}
                  </div>
                </Td>
                <Td>
                  {u.activo ? (
                    <Pastilla tono="exito">Activo</Pastilla>
                  ) : (
                    <Pastilla>Desactivado</Pastilla>
                  )}
                </Td>
                <Td>{cuando(u.ultimoAcceso)}</Td>
                <Td derecha>
                  <div className="flex justify-end gap-1.5">
                    {ocupado === u.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        {u.activo && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              accion.mutate({
                                tipo: "restablecer",
                                usuarioId: u.id,
                              })
                            }
                          >
                            <KeyRound /> Restablecer contraseña
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            accion.mutate({
                              tipo: u.activo ? "desactivar" : "reactivar",
                              usuarioId: u.id,
                            })
                          }
                        >
                          {u.activo ? <UserX /> : <UserCheck />}
                          {u.activo ? "Desactivar" : "Reactivar"}
                        </Button>
                      </>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="m-0 text-xs text-muted-foreground">
        La consola no puede entrar como un usuario ni ver lo que hace adentro.
        Restablecer genera una contraseña nueva, que se muestra una sola vez.
      </p>
    </Tarjeta>
  );
}

// ---------------------------------------------------------------------------
// Bitácora de la cuenta
// ---------------------------------------------------------------------------

function BitacoraCuenta({ cuentaId }: { cuentaId: string }) {
  const [pagina, setPagina] = useState(1);
  const consulta = useQuery({
    queryKey: ["plataforma", "bitacora", { cuenta: cuentaId, pagina }],
    queryFn: () => plataformaService.bitacora({ cuenta: cuentaId, pagina }),
    placeholderData: keepPreviousData,
  });

  if (consulta.isError)
    return (
      <ErrorCarga
        que="la bitácora"
        alReintentar={() => void consulta.refetch()}
      />
    );
  const d = consulta.data;

  return (
    <Tarjeta titulo="Bitácora">
      {!d ? (
        <div className="flex justify-center py-10 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : d.filas.length === 0 ? (
        <p className="m-0 text-sm text-muted-foreground">
          Sin cambios registrados.
        </p>
      ) : (
        <>
          <ol className="m-0 flex list-none flex-col p-0">
            {d.filas.map((e, i) => (
              <li
                key={e.id}
                className={cn(
                  "grid gap-1 py-3 sm:grid-cols-[150px_1fr_auto] sm:items-baseline sm:gap-4",
                  i > 0 && "border-t border-border",
                )}
              >
                <Mono className="text-xs text-muted-foreground">
                  {fecha(e.ocurridoEn)} {hora(e.ocurridoEn)}
                </Mono>
                <span className="text-[13px]">{describir(e)}</span>
                <span className="text-xs text-muted-foreground">{e.admin}</span>
              </li>
            ))}
          </ol>
          {d.total > d.porPagina && (
            <div className="flex items-center justify-between border-t border-border pt-3 text-[13px] text-muted-foreground">
              <span>
                {d.total} cambios, página {d.pagina}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagina <= 1}
                  onClick={() => setPagina(pagina - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagina * d.porPagina >= d.total}
                  onClick={() => setPagina(pagina + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      <p className="m-0 text-xs text-muted-foreground">
        La bitácora no se edita ni se borra.
      </p>
    </Tarjeta>
  );
}
