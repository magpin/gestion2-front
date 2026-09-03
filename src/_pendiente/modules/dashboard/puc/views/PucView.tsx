"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { cn } from "@/lib/utils";
import { useBuscarPuc } from "../hooks/usePuc";
import { PucTreeNode } from "../components/PucTreeNode";
import { crearColumnasPuc } from "../components/pucColumns";
import { CLASES_PUC } from "../types/puc.types";

type Modo = "buscador" | "arbol";

export function PucView() {
  const [modo, setModo] = useState<Modo>("buscador");
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");

  const hayBusqueda = codigo.trim() !== "" || nombre.trim() !== "";
  const { data, isLoading, isError, refetch } = useBuscarPuc(
    { codigo, nombre, page: 1, limit: 100 },
    modo === "buscador" && hayBusqueda,
  );
  const cuentas = useMemo(() => data?.datos ?? [], [data]);
  const columnas = useMemo(() => crearColumnasPuc(), []);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Plan Único de Cuentas"
        pestanas={
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-muted p-1">
            {(["buscador", "arbol"] as const).map((opcion) => {
              const activo = opcion === modo;
              return (
                <button
                  key={opcion}
                  type="button"
                  onClick={() => setModo(opcion)}
                  aria-pressed={activo}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                    activo
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {opcion === "buscador" ? "Buscador" : "Árbol"}
                </button>
              );
            })}
          </div>
        }
      />

      {modo === "buscador" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">
                Código (empieza por)
              </span>
              <Input
                value={codigo}
                onChange={(evento) => setCodigo(evento.target.value)}
                placeholder="Ej: 1105"
                inputMode="numeric"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">
                Nombre (contiene)
              </span>
              <Input
                value={nombre}
                onChange={(evento) => setNombre(evento.target.value)}
                placeholder="Ej: caja, bancos…"
              />
            </label>
          </div>

          {!hayBusqueda ? (
            <Card className="items-center p-8 text-center">
              <p className="text-sm text-muted-foreground/70">
                Escribe un código o nombre para buscar cuentas.
              </p>
            </Card>
          ) : (
            <DataTable
              columns={columnas}
              data={cuentas}
              isLoading={isLoading}
              isError={isError}
              onReintentar={() => void refetch()}
              mensajeVacio="No se encontraron cuentas con ese criterio."
              pageSize={20}
            />
          )}
        </div>
      ) : (
        <Card className="p-4">
          <ul>
            {CLASES_PUC.map((clase) => (
              <PucTreeNode
                key={clase.codigo}
                codigo={clase.codigo}
                nombre={clase.nombre}
                transaccional={false}
                nivel={1}
              />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
