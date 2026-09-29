"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { aviso } from "@/lib/avisos";
import { Campo } from "@/modules/configuracion/components/Campo";
import { aLineasNuevas, problemaDelAsiento } from "../lib/asiento-nuevo";
import { asientosApi, comprobantesApi } from "../services/contabilidad.service";
import { EditorLineas, lineaVacia, type LineaBorrador } from "./EditorLineas";

/** Los que produce el sistema al abrir y cerrar el ejercicio, no una persona. */
const DEL_SISTEMA = ["APERTURA", "CIERRE"];

const hoy = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Nuevo asiento.
 *
 * Arranca con dos líneas en blanco porque un asiento lleva al menos dos: algo se
 * debita contra algo que se acredita. Empezar con una obliga a agregar la
 * segunda todas las veces.
 *
 * No hay versión de edición, y no es un olvido: un asiento registrado no se
 * edita. Lo rechaza un trigger de la base, no una regla del servicio.
 */
export function FormularioAsiento({
  abierto,
  onCerrar,
  onCreado,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onCreado: () => void;
}) {
  // Vacío significa "todavía no eligió", no "ninguno": el valor efectivo se
  // deriva más abajo.
  const [elegido, setElegido] = useState("");
  const [fecha, setFecha] = useState(hoy());
  const [glosa, setGlosa] = useState("");
  const [lineas, setLineas] = useState<LineaBorrador[]>([
    lineaVacia(),
    lineaVacia(),
  ]);

  const { data: comprobantes = [] } = useQuery({
    queryKey: ["comprobantes"],
    queryFn: () => comprobantesApi.listar(),
    staleTime: 60 * 60_000,
    enabled: abierto,
  });

  // Solo los que una persona puede digitar. Los de apertura y cierre los produce
  // el sistema: hacerlos a mano descuadra el arrastre de saldos, y el backend
  // los rechaza igual.
  const digitables = comprobantes.filter(
    (c) => !DEL_SISTEMA.includes(c.naturaleza),
  );

  // El primero de la lista es el comprobante de diario, que es el que se usa
  // casi siempre. Se deriva en vez de sincronizarse con un efecto: un efecto que
  // llama a setState provoca un render en cascada y llega tarde al primero.
  const comprobanteTipoId = elegido || digitables[0]?.id || "";

  const limpiar = () => {
    setGlosa("");
    setFecha(hoy());
    setLineas([lineaVacia(), lineaVacia()]);
  };

  const crear = useMutation({
    mutationFn: (datos: Parameters<typeof asientosApi.crear>[0]) =>
      asientosApi.crear(datos),
    onSuccess: (r) => {
      onCreado();
      aviso.exito(`Asiento ${r.numero} registrado`);
      limpiar();
      onCerrar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const problema = problemaDelAsiento({ comprobanteTipoId, glosa, lineas });

  const enviar = () => {
    if (problema !== null) return;
    crear.mutate({
      comprobanteTipoId,
      fecha,
      glosa: glosa.trim(),
      lineas: aLineasNuevas(lineas),
    });
  };

  return (
    <Dialog
      open={abierto}
      onOpenChange={(a) => {
        if (!a) onCerrar();
      }}
    >
      <DialogContent size="xl">
        <DialogHeader>
          <div>
            <DialogTitle>Nuevo asiento contable</DialogTitle>
            <DialogDescription>
              Cada hecho, con su fecha, su explicación y sus dos patas. Una vez
              registrado no se edita.
            </DialogDescription>
          </div>
          <DialogCloseIcon />
        </DialogHeader>

        <DialogBody className="flex flex-col gap-8">
          <div className="grid gap-4 sm:grid-cols-[200px_200px_1fr]">
            <Campo id="comprobante" etiqueta="Comprobante" escala="grande">
              <Select
                items={digitables.map((c) => ({
                  value: c.id,
                  label: `${c.codigo} · ${c.nombre}`,
                }))}
                value={comprobanteTipoId}
                onValueChange={(v) => setElegido(v ?? "")}
              >
                <SelectTrigger
                  id="comprobante"
                  className="h-11 w-full rounded-xl px-4"
                >
                  <SelectValue placeholder="Elegí uno" />
                </SelectTrigger>
                <SelectContent>
                  {digitables.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.codigo} · {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>

            <Campo
              id="fecha"
              etiqueta="Fecha"
              ayuda="La del hecho, no la de hoy"
              escala="grande"
            >
              <Input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="h-11 rounded-xl px-4"
              />
            </Campo>

            <Campo
              id="glosa"
              etiqueta="Glosa"
              ayuda="Por qué existe este asiento. Es lo primero que lee quien audita."
              escala="grande"
            >
              <Input
                id="glosa"
                value={glosa}
                onChange={(e) => setGlosa(e.target.value)}
                placeholder="Compra de suministros de oficina"
                className="h-11 rounded-xl px-4"
              />
            </Campo>
          </div>

          <EditorLineas lineas={lineas} onCambiar={setLineas} />
        </DialogBody>

        <DialogFooter className="sm:justify-between">
          {/* El motivo por el que no se puede guardar, a la vista. Un botón
              apagado y mudo deja buscando qué falta. */}
          <p className="self-center text-sm text-muted-foreground">
            {problema ?? "Listo para registrar."}
          </p>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-xl px-6"
              onClick={onCerrar}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="h-12 rounded-xl px-6"
              disabled={problema !== null || crear.isPending}
              onClick={enviar}
            >
              {crear.isPending && <Loader2 className="size-4 animate-spin" />}
              Registrar asiento
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
