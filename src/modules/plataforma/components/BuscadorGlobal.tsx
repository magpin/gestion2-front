"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Building2, Loader2, Search, User, Briefcase } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { nit } from "../lib/formato";
import { plataformaService } from "../services/plataforma.service";
import { NOMBRE_ESTADO, NOMBRE_PLAN, NOMBRE_ROL } from "../types/plataforma.types";

interface Resultado {
  clave: string;
  grupo: "Cuentas" | "Empresas" | "Usuarios";
  titulo: string;
  detalle: string;
  destino: string;
}

const ICONO = { Cuentas: Briefcase, Empresas: Building2, Usuarios: User } as const;

/**
 * Ctrl K: cuentas por nombre, empresas por razón social o NIT —con o sin
 * puntos— y usuarios por correo. Enter abre el detalle; flechas para moverse.
 *
 * Todo lleva a la cuenta: la consola no tiene pantallas de empresa ni de
 * usuario sueltas en la fase 1.
 */
export function BuscadorGlobal({ abierto, alCerrar }: { abierto: boolean; alCerrar: () => void }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [pedido, setPedido] = useState("");
  const [marcado, setMarcado] = useState(0);

  // Se pide 200 ms después de la última tecla, no en cada una.
  useEffect(() => {
    const t = setTimeout(() => setPedido(texto.trim()), 200);
    return () => clearTimeout(t);
  }, [texto]);

  const { data, isFetching } = useQuery({
    queryKey: ["plataforma", "buscar", pedido],
    queryFn: () => plataformaService.buscar(pedido),
    enabled: abierto && pedido.length >= 2,
    staleTime: 30_000,
  });

  const resultados = useMemo<Resultado[]>(() => {
    if (!data || pedido.length < 2) return [];
    return [
      ...data.empresas.map((e) => ({
        clave: `e-${e.id}`,
        grupo: "Empresas" as const,
        titulo: e.razonSocial,
        detalle: `NIT ${nit(e.nit, e.dv)}, cuenta ${e.cuenta}`,
        destino: `/plataforma/cuentas/${e.cuentaId}?pestana=empresas`,
      })),
      ...data.cuentas.map((c) => ({
        clave: `c-${c.id}`,
        grupo: "Cuentas" as const,
        titulo: c.nombre,
        detalle: `${NOMBRE_PLAN[c.plan]}, ${NOMBRE_ESTADO[c.estado].toLowerCase()}`,
        destino: `/plataforma/cuentas/${c.id}`,
      })),
      ...data.usuarios.map((u) => ({
        clave: `u-${u.id}`,
        grupo: "Usuarios" as const,
        titulo: u.email,
        detalle: [u.roles.map((r) => NOMBRE_ROL[r] ?? r).join(", "), u.cuenta]
          .filter(Boolean)
          .join(", "),
        destino: `/plataforma/cuentas/${u.cuentaId}?pestana=usuarios`,
      })),
    ];
  }, [data, pedido]);

  const cerrar = () => {
    setTexto("");
    setPedido("");
    setMarcado(0);
    alCerrar();
  };

  const abrir = (r: Resultado | undefined) => {
    if (!r) return;
    router.push(r.destino);
    cerrar();
  };

  const alTeclear = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMarcado((m) => Math.min(m + 1, resultados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMarcado((m) => Math.max(m - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      abrir(resultados[marcado]);
    }
  };

  const grupos = (["Empresas", "Cuentas", "Usuarios"] as const).filter((g) =>
    resultados.some((r) => r.grupo === g),
  );

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="top-[12%] translate-y-0 sm:max-w-xl">
        <DialogTitle className="sr-only">Búsqueda global</DialogTitle>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            autoFocus
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setMarcado(0);
            }}
            onKeyDown={alTeclear}
            placeholder="Cuenta, empresa, NIT o correo"
            aria-label="Buscar"
            className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          />
          {isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
            Esc
          </kbd>
        </div>

        <div className="max-h-[60dvh] overflow-y-auto p-2" role="listbox" aria-label="Resultados">
          {pedido.length < 2 ? (
            <p className="m-0 px-3 py-6 text-center text-sm text-muted-foreground">
              Escriba al menos dos letras o los primeros dígitos de un NIT.
            </p>
          ) : resultados.length === 0 && !isFetching ? (
            <p className="m-0 px-3 py-6 text-center text-sm text-muted-foreground">
              Nada coincide con «{pedido}».
            </p>
          ) : (
            grupos.map((g) => (
              <div key={g} className="py-1">
                <p className="m-0 px-3 py-1.5 text-xs font-medium text-muted-foreground">{g}</p>
                {resultados.map((r, i) => {
                  if (r.grupo !== g) return null;
                  const Icono = ICONO[g];
                  return (
                    <button
                      key={r.clave}
                      type="button"
                      role="option"
                      aria-selected={i === marcado}
                      onMouseEnter={() => setMarcado(i)}
                      onClick={() => abrir(r)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left",
                        i === marcado && "bg-muted",
                      )}
                    >
                      <Icono className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium">{r.titulo}</span>
                        <span className="truncate text-xs text-muted-foreground">{r.detalle}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <p className="m-0 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          Enter abre el detalle. Flechas para moverse.
        </p>
      </DialogContent>
    </Dialog>
  );
}
