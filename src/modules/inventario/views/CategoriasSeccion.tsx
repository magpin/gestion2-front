"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Tags } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTieneRol } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import { categoriasApi } from "../services/inventario.service";
import type { CategoriaResumen } from "../types/inventario.types";

const CLAVE = ["categorias"];

/**
 * Las categorías del catálogo: una lista, no un árbol.
 *
 * No se borran, se archivan. Borrar una dejaría sin clasificar a los productos
 * que la usaban sin que nadie se entere —y la llave foránea la rechazaría
 * igual—; archivarla la saca de donde se elige y deja lo ya clasificado como
 * está.
 */
export function CategoriasSeccion() {
  const queryClient = useQueryClient();
  const puedeOperar = useTieneRol("INVENTARIO", "DIRECTOR");

  const [nombre, setNombre] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombreEditado, setNombreEditado] = useState("");

  const { data: categorias = [], isLoading } = useQuery({
    queryKey: [...CLAVE, "todas"],
    queryFn: () => categoriasApi.listar(true),
  });

  const refrescar = async () => {
    await queryClient.invalidateQueries({ queryKey: CLAVE });
    await queryClient.invalidateQueries({ queryKey: ["productos"] });
  };

  const crear = useMutation({
    mutationFn: () => categoriasApi.crear(nombre.trim()),
    onSuccess: async () => {
      await refrescar();
      aviso.exito("Categoría creada");
      setNombre("");
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const editar = useMutation({
    mutationFn: ({
      id,
      datos,
    }: {
      id: string;
      datos: { nombre?: string; activa?: boolean };
    }) => categoriasApi.editar(id, datos),
    onSuccess: async () => {
      await refrescar();
      setEditandoId(null);
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const guardarNombre = (c: CategoriaResumen) => {
    const limpio = nombreEditado.trim();
    if (limpio.length < 2 || limpio === c.nombre) {
      setEditandoId(null);
      return;
    }
    editar.mutate({ id: c.id, datos: { nombre: limpio } });
  };

  return (
    <>
      {puedeOperar && (
        <section className="mb-6 flex flex-wrap items-end gap-3">
          <div className="flex min-w-[280px] flex-1 flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Nueva categoría
            </span>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && nombre.trim().length >= 2) {
                  crear.mutate();
                }
              }}
              placeholder="Portátiles, Cables, Tóner…"
              className="h-12 rounded-2xl px-4"
            />
          </div>
          <Button
            type="button"
            disabled={nombre.trim().length < 2 || crear.isPending}
            onClick={() => crear.mutate()}
            className="h-auto min-h-12 rounded-2xl px-5 text-sm font-semibold"
          >
            {crear.isPending && <Loader2 className="size-4 animate-spin" />}
            Agregar
          </Button>
        </section>
      )}

      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="border-b border-border p-6">
          <h2 className="text-2xl font-semibold">Categorías</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sirven para agrupar y filtrar el catálogo. Un producto puede no
            tener ninguna: los 1.634 importados llegaron así.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-24 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : categorias.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
            <Tags className="size-8 text-muted-foreground" />
            <p className="font-semibold">Todavía no hay categorías</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Cree la primera arriba y después clasifique los productos desde su
              ficha.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left">
              <thead className="bg-muted/40 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  {["Categoría", "Productos", "Estado", "Acciones"].map((x) => (
                    <th
                      key={x}
                      scope="col"
                      className={`px-5 py-4 ${
                        x === "Acciones" || x === "Productos"
                          ? "text-right"
                          : ""
                      }`}
                    >
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {categorias.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-5 py-4">
                      {editandoId === c.id ? (
                        <Input
                          autoFocus
                          value={nombreEditado}
                          onChange={(e) => setNombreEditado(e.target.value)}
                          onBlur={() => guardarNombre(c)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") guardarNombre(c);
                            if (e.key === "Escape") setEditandoId(null);
                          }}
                          className="h-10 max-w-xs rounded-xl px-3"
                        />
                      ) : (
                        <span
                          className={`text-sm font-semibold ${c.activa ? "" : "opacity-60"}`}
                        >
                          {c.nombre}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-sm">
                      {c.productos}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-2 text-[13px] font-semibold">
                        <span
                          className={`size-2 rounded-full ${c.activa ? "bg-success" : "bg-muted-foreground"}`}
                        />
                        {c.activa ? "Activa" : "Archivada"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          disabled={!puedeOperar}
                          className="h-10 rounded-xl px-4 text-muted-foreground"
                          onClick={() => {
                            setEditandoId(c.id);
                            setNombreEditado(c.nombre);
                          }}
                        >
                          Renombrar
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={!puedeOperar || editar.isPending}
                          className="h-10 rounded-xl px-4 text-muted-foreground"
                          onClick={() =>
                            editar.mutate({
                              id: c.id,
                              datos: { activa: !c.activa },
                            })
                          }
                        >
                          {c.activa ? "Archivar" : "Reactivar"}
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
