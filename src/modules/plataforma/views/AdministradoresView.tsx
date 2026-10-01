"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, UserCheck, UserX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { aviso } from "@/lib/avisos";
import { cn } from "@/lib/utils";
import { BotonBuscar } from "../components/BotonBuscar";
import { DialogoContrasena } from "../components/dialogos";
import {
  Encabezado,
  ErrorCarga,
  EsqueletoPagina,
  Mono,
  Pastilla,
  Tarjeta,
  Td,
  Th,
} from "../components/piezas";
import { cuando, fecha } from "../lib/formato";
import { plataformaService } from "../services/plataforma.service";

/**
 * Quiénes pueden entrar a esta consola. Se ven, se desactivan y se les
 * restablece la contraseña. **El alta no es una pantalla**: una pantalla para
 * crear administradores es exactamente la puerta que no debe existir.
 */
export function AdministradoresView() {
  const qc = useQueryClient();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [contrasena, setContrasena] = useState<{
    password: string;
    email: string;
    nombre: string;
  } | null>(null);
  const consulta = useQuery({
    queryKey: ["plataforma", "administradores"],
    queryFn: plataformaService.administradores,
  });
  const yo = useQuery({
    queryKey: ["plataforma", "yo"],
    queryFn: plataformaService.yo,
  });

  const accion = useMutation({
    mutationFn: async ({
      tipo,
      id,
    }: {
      tipo: "activar" | "desactivar" | "restablecer";
      id: string;
    }) =>
      tipo === "restablecer"
        ? plataformaService.restablecerAdministrador(id)
        : plataformaService.cambiarAdministrador(id, tipo === "activar"),
    onMutate: ({ id }) => setOcupado(id),
    onSuccess: async (r, { tipo }) => {
      if (
        tipo === "restablecer" &&
        r &&
        typeof r === "object" &&
        "password" in r
      ) {
        const x = r as {
          password: string;
          email: string;
          nombreCompleto: string;
        };
        setContrasena({
          password: x.password,
          email: x.email,
          nombre: x.nombreCompleto,
        });
      } else {
        aviso.exito(
          tipo === "activar"
            ? "Administrador reactivado"
            : "Administrador desactivado",
        );
      }
      await qc.invalidateQueries({
        queryKey: ["plataforma", "administradores"],
      });
    },
    onError: (e) => aviso.falla(e),
    onSettled: () => setOcupado(null),
  });

  if (consulta.isPending) return <EsqueletoPagina tarjetas={1} />;
  if (consulta.isError || !consulta.data)
    return (
      <>
        <Encabezado titulo="Administradores" />
        <ErrorCarga
          que="los administradores"
          alReintentar={() => void consulta.refetch()}
        />
      </>
    );

  return (
    <>
      <Encabezado
        titulo="Administradores"
        subtitulo="Quiénes pueden entrar a esta consola."
        acciones={<BotonBuscar />}
      />

      <Tarjeta>
        <div className="-mx-3 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr>
                <Th>Administrador</Th>
                <Th>Estado</Th>
                <Th>Último acceso</Th>
                <Th>Intentos fallidos</Th>
                <Th derecha>Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {consulta.data.map((a) => {
                const soyYo = a.id === yo.data?.adminId;
                return (
                  <tr
                    key={a.id}
                    className={cn(
                      "group/fila",
                      !a.activo && "text-muted-foreground",
                    )}
                  >
                    <Td>
                      <span className="block font-medium">
                        {a.nombreCompleto}{" "}
                        {soyYo && (
                          <span className="text-xs text-muted-foreground">
                            (usted)
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {a.email}. Desde el {fecha(a.creadoEn)}.
                      </span>
                    </Td>
                    <Td>
                      {a.activo ? (
                        <Pastilla tono="exito">Activo</Pastilla>
                      ) : (
                        <Pastilla>Desactivado</Pastilla>
                      )}
                    </Td>
                    <Td>{cuando(a.ultimoAcceso)}</Td>
                    <Td>
                      {a.fallidos7d === 0 ? (
                        <span className="text-muted-foreground">
                          Ninguno en 7 días
                        </span>
                      ) : (
                        <span
                          className={cn(
                            a.fallidos24h >= 5 && "font-medium text-danger",
                          )}
                        >
                          <Mono>{a.fallidos24h}</Mono> hoy,{" "}
                          <Mono>{a.fallidos7d}</Mono> en 7 días
                          <span className="block text-xs text-muted-foreground">
                            El último: {cuando(a.ultimoFallido)}
                          </span>
                        </span>
                      )}
                    </Td>
                    <Td derecha>
                      <div className="flex justify-end gap-1.5">
                        {ocupado === a.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <>
                            {a.activo && !soyYo && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  accion.mutate({
                                    tipo: "restablecer",
                                    id: a.id,
                                  })
                                }
                              >
                                <KeyRound /> Restablecer contraseña
                              </Button>
                            )}
                            {!soyYo && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  accion.mutate({
                                    tipo: a.activo ? "desactivar" : "activar",
                                    id: a.id,
                                  })
                                }
                              >
                                {a.activo ? <UserX /> : <UserCheck />}
                                {a.activo ? "Desactivar" : "Reactivar"}
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Cómo se agrega un administrador" className="gap-2">
        <p className="m-0 text-[13px] text-muted-foreground">
          No desde aquí. Es un acto de instalación: se corre en la máquina donde
          vive el servidor, con la conexión de aprovisionamiento. La contraseña
          se muestra una sola vez.
        </p>
        <pre className="m-0 overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs">
          node scripts/crear-super-admin.js --email correo@dominio.co --nombre
          &quot;Nombre&quot;
        </pre>
        <p className="m-0 text-[13px] text-muted-foreground">
          Desactivar a alguien le corta la sesión abierta. Nadie se desactiva a
          sí mismo, y el último administrador activo no se puede desactivar.
        </p>
      </Tarjeta>

      <DialogoContrasena
        datos={contrasena}
        alCerrar={() => setContrasena(null)}
      />
    </>
  );
}
