"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Modal } from "@/components/shared/Modal";
import { useDeleteUsuario, useGetUsuarios } from "../hooks/useUsuarios";
import { crearColumnasUsuarios } from "../components/usuariosColumns";
import { UsuarioFormModal } from "../components/UsuarioFormModal";
import { ResetPasswordModal } from "../components/ResetPasswordModal";
import type { Usuario } from "../types/usuarios.types";

export function ConfiguracionView() {
  const [busqueda, setBusqueda] = useState("");
  const [formulario, setFormulario] = useState<{ abierto: boolean; usuario: Usuario | null }>({
    abierto: false,
    usuario: null,
  });
  const [reset, setReset] = useState<Usuario | null>(null);
  const [eliminando, setEliminando] = useState<Usuario | null>(null);

  const { data, isLoading, isError, refetch } = useGetUsuarios({ limit: 100, page: 1 });
  const eliminar = useDeleteUsuario();

  const usuarios = useMemo(() => {
    const items = data?.datos ?? [];
    const termino = busqueda.trim().toLowerCase();
    if (!termino) {
      return items;
    }
    return items.filter(
      (usuario) =>
        usuario.nombreCompleto.toLowerCase().includes(termino) ||
        usuario.email.toLowerCase().includes(termino),
    );
  }, [data, busqueda]);

  const columnas = useMemo(
    () =>
      crearColumnasUsuarios({
        onEditar: (usuario) => setFormulario({ abierto: true, usuario }),
        onResetPassword: (usuario) => setReset(usuario),
        onEliminar: (usuario) => setEliminando(usuario),
      }),
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Configuración"
        busqueda={{
          valor: busqueda,
          onChange: setBusqueda,
          placeholder: "Buscar por nombre o email…",
        }}
        acciones={
          <Button
            className="gap-2"
            onClick={() => setFormulario({ abierto: true, usuario: null })}
          >
            <Plus size={16} strokeWidth={1.75} />
            Nuevo usuario
          </Button>
        }
      />

      <DataTable
        columns={columnas}
        data={usuarios}
        isLoading={isLoading}
        isError={isError}
        onReintentar={() => void refetch()}
        mensajeVacio="No hay usuarios registrados."
      />

      <UsuarioFormModal
        open={formulario.abierto}
        onOpenChange={(abierto) => setFormulario((previo) => ({ ...previo, abierto }))}
        usuario={formulario.usuario}
      />

      <ResetPasswordModal
        open={reset !== null}
        onOpenChange={(abierto) => {
          if (!abierto) {
            setReset(null);
          }
        }}
        usuario={reset}
      />

      <Modal
        open={eliminando !== null}
        onOpenChange={(abierto) => {
          if (!abierto) {
            setEliminando(null);
          }
        }}
        titulo="Eliminar usuario"
        descripcion={`¿Eliminar a "${eliminando?.nombreCompleto ?? ""}"? Perderá el acceso al sistema.`}
        labelConfirmar="Eliminar"
        confirmarDestructivo
        confirmarLoading={eliminar.isPending}
        onConfirmar={() => {
          if (!eliminando) {
            return;
          }
          eliminar.mutate(eliminando.id, { onSuccess: () => setEliminando(null) });
        }}
      />
    </div>
  );
}
