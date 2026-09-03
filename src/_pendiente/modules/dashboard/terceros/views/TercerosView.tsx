"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Modal } from "@/components/shared/Modal";
import { FormDialog } from "@/components/shared/FormDialog";
import { BarraListado, grupoUnico } from "@/components/shared/BarraListado";
import { useAuthStore } from "@/core/store/authStore";
import { useGetTerceros } from "../hooks/useTerceros";
import { useDesactivarTercero } from "../hooks/useTerceroMutations";
import { crearColumnasTerceros } from "../components/tercerosColumns";
import { TerceroFormView } from "./TerceroFormView";
import { TerceroDetalleModal } from "./TerceroDetalleModal";
import type { FiltroTipoTercero, Tercero } from "../types/terceros.types";

export function TercerosView() {
  const roles = useAuthStore((state) => state.roles);
  // Desactivar un tercero es del DIRECTOR: el backend responde 403 a los demás.
  const puedeEliminar = roles.includes("DIRECTOR");

  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<FiltroTipoTercero>("TODOS");
  const [creando, setCreando] = useState(false);
  const [viendo, setViendo] = useState<Tercero | null>(null);
  const [editando, setEditando] = useState<Tercero | null>(null);
  const [eliminando, setEliminando] = useState<Tercero | null>(null);

  const { data, isLoading, isError, refetch } = useGetTerceros({
    limite: 100,
    pagina: 1,
    // El backend filtra con banderas, no con un "tipo": cliente y proveedor no
    // son excluyentes — el mismo NIT puede ser los dos.
    ...(filtro === "CLIENTE" ? { soloClientes: true } : {}),
    ...(filtro === "PROVEEDOR" ? { soloProveedores: true } : {}),
  });
  const eliminar = useDesactivarTercero();

  const terceros = useMemo(() => {
    const items = data?.datos ?? [];
    const termino = busqueda.trim().toLowerCase();
    if (!termino) {
      return items;
    }
    return items.filter(
      (tercero) =>
        tercero.nombre.toLowerCase().includes(termino) ||
        tercero.numeroDocumento.includes(termino),
    );
  }, [data, busqueda]);

  const columnas = useMemo(
    () =>
      crearColumnasTerceros({
        onVer: (tercero) => setViendo(tercero),
        onEditar: (tercero) => setEditando(tercero),
        onEliminar: (tercero) => setEliminando(tercero),
        puedeEliminar,
      }),
    [puedeEliminar],
  );

  return (
    <div className="space-y-6">
      <PageHeader titulo="Terceros" />

      {/* El botón «Nuevo tercero» va en la barra de la tabla, con los filtros:
          nada suelto entre el título y el listado. */}
      <DataTable
        columns={columnas}
        data={terceros}
        isLoading={isLoading}
        isError={isError}
        onReintentar={() => void refetch()}
        onRowClick={(tercero) => setViendo(tercero)}
        mensajeVacio="No hay terceros registrados todavía."
        barra={
          /* Sin apuntes en las opciones: el tipo lo filtra el backend con sus
             banderas, así que acá no hay de dónde sacar cuántos clientes ni
             cuántos proveedores hay sin pedir la lista entera. */
          <BarraListado
            filtros={[
              grupoUnico<FiltroTipoTercero>({
                id: "tipo",
                titulo: "Tipo de tercero",
                todos: "TODOS",
                valor: filtro,
                onChange: setFiltro,
                opciones: [
                  { valor: "CLIENTE", label: "Clientes" },
                  { valor: "PROVEEDOR", label: "Proveedores" },
                ],
              }),
            ]}
            busqueda={{
              valor: busqueda,
              onChange: setBusqueda,
              placeholder: "Buscar por nombre o documento…",
            }}
            accion={{
              label: "Nuevo tercero",
              icon: Plus,
              onClick: () => setCreando(true),
            }}
          />
        }
      />

      <TerceroDetalleModal
        terceroId={viendo?.id ?? null}
        nombre={viendo?.nombre}
        open={viendo !== null}
        onOpenChange={(abierto) => !abierto && setViendo(null)}
        // Del detalle al formulario sin pasar por una ruta: se cierra uno y se
        // abre el otro sobre el mismo listado.
        onEditar={() => {
          const tercero = viendo;
          setViendo(null);
          setEditando(tercero);
        }}
      />

      <FormDialog
        open={editando !== null}
        onOpenChange={(abierto) => !abierto && setEditando(null)}
        titulo={`Editar ${editando?.nombre ?? "tercero"}`}
      >
        {editando && (
          <TerceroFormView
            key={editando.id}
            terceroId={editando.id}
            enModal
            onExito={() => setEditando(null)}
            onCerrar={() => setEditando(null)}
          />
        )}
      </FormDialog>

      <FormDialog
        open={creando}
        onOpenChange={setCreando}
        titulo="Nuevo tercero"
      >
        <TerceroFormView
          enModal
          onExito={() => setCreando(false)}
          onCerrar={() => setCreando(false)}
        />
      </FormDialog>

      <Modal
        open={eliminando !== null}
        onOpenChange={(abierto) => {
          if (!abierto) {
            setEliminando(null);
          }
        }}
        titulo="Eliminar tercero"
        descripcion={`¿Eliminar "${eliminando?.nombre ?? ""}"? No se podrá si tiene operaciones asociadas.`}
        labelConfirmar="Eliminar"
        confirmarDestructivo
        confirmarLoading={eliminar.isPending}
        onConfirmar={() => {
          if (!eliminando) {
            return;
          }
          eliminar.mutate(eliminando.id, {
            onSuccess: () => setEliminando(null),
          });
        }}
      />
    </div>
  );
}
