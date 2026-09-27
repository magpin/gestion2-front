"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogCloseIcon,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { aviso } from "@/lib/avisos";
import { FormularioTercero, type DatosTercero } from "./FormularioTercero";
import { DatosTributarios } from "@/modules/retenciones/components/DatosTributarios";
import { tercerosApi } from "../services/terceros.service";
import type { TerceroResumen } from "../types/terceros.types";

const ID_FORMULARIO = "formulario-tercero";

/** `"nuevo"` para dar de alta; el id de un tercero para corregir su ficha. */
export type TerceroEnEdicion = "nuevo" | string | null;

/**
 * El alta y la corrección de un tercero, en un modal que se puede abrir desde
 * cualquier parte.
 *
 * Vive acá y no dentro de `TercerosView` porque digitar una venta o una compra
 * es justo cuando se descubre que el cliente no está en el directorio, o que
 * su dirección está mal. Obligar a abandonar el documento a medio hacer, ir al
 * directorio y volver a empezar es la forma más rápida de que nadie use el
 * sistema.
 *
 * Quien lo abre recibe en `alGuardar` el tercero ya creado o corregido, para
 * dejarlo seleccionado sin que haya que buscarlo otra vez.
 */
export function DialogoTercero({
  editando,
  onCerrar,
  alGuardar,
  rol,
  nombreSugerido,
}: {
  editando: TerceroEnEdicion;
  onCerrar: () => void;
  /** El tercero recién guardado. Opcional: el directorio no necesita nada. */
  alGuardar?: (tercero: TerceroResumen) => void;
  /** Con qué rol nace un tercero creado desde ventas o desde compras. */
  rol?: "cliente" | "proveedor" | "empleado";
  /** Lo que se venía buscando cuando no apareció: se precarga como nombre. */
  nombreSugerido?: string;
}) {
  const queryClient = useQueryClient();
  const creando = editando === "nuevo";

  // La ficha completa solo se pide al editar: la lista y los selectores traen
  // lo justo para mostrarse.
  const { data: ficha, isFetching: cargandoFicha } = useQuery({
    queryKey: ["terceros", "ficha", editando],
    queryFn: () => tercerosApi.porId(editando!),
    enabled: editando !== null && !creando,
  });

  const guardar = useMutation({
    mutationFn: (d: DatosTercero & { dv?: string }) => {
      // Los vacíos viajan como ausentes: el backend valida formato y una cadena
      // vacía no es un correo ni un código de municipio.
      const datos = {
        ...d,
        dv: d.dv || undefined,
        razonSocial: d.razonSocial || undefined,
        primerNombre: d.primerNombre || undefined,
        segundoNombre: d.segundoNombre || undefined,
        primerApellido: d.primerApellido || undefined,
        segundoApellido: d.segundoApellido || undefined,
        nombreComercial: d.nombreComercial || undefined,
        email: d.email || undefined,
        telefono: d.telefono || undefined,
        direccion: d.direccion || undefined,
        municipioCodigo: d.municipioCodigo || undefined,
      };

      if (creando) return tercerosApi.crear(datos);

      // La identidad no se edita: el formulario la muestra fija y el backend
      // rechaza el PATCH entero si esos campos viajan. Se quitan acá y no en
      // el formulario, que es el mismo para crear.
      const {
        tipoPersona: _tipoPersona,
        tipoDocumento: _tipoDocumento,
        numeroDocumento: _numeroDocumento,
        dv: _dv,
        ...editables
      } = datos;
      return tercerosApi.editar(editando!, editables);
    },
    onSuccess: async (tercero) => {
      await queryClient.invalidateQueries({ queryKey: ["terceros"] });
      aviso.exito(creando ? "Tercero registrado" : "Cambios guardados");
      alGuardar?.(tercero);
      onCerrar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  return (
    <Dialog
      open={editando !== null}
      onOpenChange={(abierto) => !abierto && onCerrar()}
    >
      <DialogContent size="lg">
        <DialogHeader>
          <div>
            <DialogTitle>
              {creando ? "Nuevo tercero" : "Editar tercero"}
            </DialogTitle>
            <DialogDescription>
              Con quién hace negocios la empresa: el que le compra, el que le
              vende, o los dos.
            </DialogDescription>
          </div>
          <DialogCloseIcon />
        </DialogHeader>

        <DialogBody>
          {!creando && cargandoFicha ? (
            <div className="flex justify-center py-20 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : (
            <FormularioTercero
              // Remontar por ficha evita que los valores del tercero anterior
              // se queden en el formulario al abrir otro.
              key={editando ?? "cerrado"}
              id={ID_FORMULARIO}
              edicion={!creando}
              inicial={creando ? undefined : ficha}
              valoresIniciales={
                creando
                  ? {
                      esCliente: rol === undefined || rol === "cliente",
                      esProveedor: rol === "proveedor",
                      esEmpleado: rol === "empleado",
                      razonSocial: nombreSugerido,
                      primerNombre: nombreSugerido,
                    }
                  : undefined
              }
              alGuardar={(d) => guardar.mutate(d)}
            />
          )}
          {/* Con historia y fecha: lo que el motor de retenciones mira a la
              fecha de cada factura. Solo al editar: al crear no hay historia. */}
          {!creando && editando !== null && <DatosTributarios terceroId={editando} />}
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-xl px-6"
            onClick={onCerrar}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form={ID_FORMULARIO}
            className="h-12 rounded-xl px-6"
            disabled={guardar.isPending || (!creando && cargandoFicha)}
          >
            {guardar.isPending && <Loader2 className="size-4 animate-spin" />}
            {creando ? "Registrar tercero" : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
