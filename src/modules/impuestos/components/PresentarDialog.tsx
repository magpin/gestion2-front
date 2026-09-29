"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2 } from "lucide-react";

import { CampoPesos } from "@/components/shared/CampoNumero";
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
import { aviso } from "@/lib/avisos";
import { hoyEnColombia } from "@/lib/utils";
import { Campo } from "@/modules/configuracion/components/Campo";
import { alMil } from "../lib/impuestos";
import { impuestosApi } from "../services/impuestos.service";
import type { FilaCalendario } from "../types/impuestos.types";

/**
 * Registrar que la declaración ya se presentó. La presentación se hace en
 * MUISCA (o en el portal del municipio) con la firma de quien declara; acá se
 * deja el número del formulario, la fecha, el valor y el PDF, para que el
 * pago salga contra eso. Nada se transmite a la DIAN.
 */
export function PresentarDialog({ fila, onCerrar }: { fila: FilaCalendario | null; onCerrar: () => void }) {
  return (
    <Dialog open={fila !== null} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent>{fila !== null && <Formulario fila={fila} onCerrar={onCerrar} />}</DialogContent>
    </Dialog>
  );
}

function Formulario({ fila, onCerrar }: { fila: FilaCalendario; onCerrar: () => void }) {
  const queryClient = useQueryClient();
  const d = fila.declaracion;
  const [numero, setNumero] = useState(d?.numeroFormulario ?? "");
  const [fecha, setFecha] = useState(d?.presentadaEl ?? hoyEnColombia());
  const [valor, setValor] = useState(String(d?.valorAPagar ?? alMil(fila.valor ?? 0)));
  const [vence, setVence] = useState(d?.vence ?? fila.vence ?? "");
  const [archivo, setArchivo] = useState<File | null>(null);
  // La renta guarda dos renglones más del 110: los usa el estimado del año siguiente.
  const renta = fila.obligacion === "RENTA";
  const [impuestoNeto, setImpuestoNeto] = useState(d?.impuestoNeto == null ? "" : String(d.impuestoNeto));
  const [anticipo, setAnticipo] = useState(d?.anticipoSiguiente == null ? "" : String(d.anticipoSiguiente));
  const [intentado, setIntentado] = useState(false);

  const errores = {
    numero: numero.trim() === "" ? "Escribí el número del formulario que te dio MUISCA." : null,
    fecha: fecha === "" ? "Elegí la fecha." : fecha > hoyEnColombia() ? "La fecha no puede ser futura." : null,
    valor: !(Number(valor) >= 0) || valor === "" ? "Escribí el valor a pagar del formulario." : null,
    vence: fila.vence === null && vence === "" ? "El calendario no tiene esta fecha: escribí cuándo vence." : null,
  };
  const problema = Object.values(errores).some((e) => e !== null);
  const ver = (k: keyof typeof errores) => (intentado ? (errores[k] ?? undefined) : undefined);

  const guardar = useMutation({
    mutationFn: async () => {
      const subido = archivo !== null ? await impuestosApi.subirArchivo(archivo) : null;
      const datos = {
        numeroFormulario: numero.trim(),
        presentadaEl: fecha,
        valorAPagar: Number(valor),
        vence: vence || null,
        archivoClave: subido?.clave ?? null,
        archivoNombre: subido?.nombre ?? null,
        ...(renta
          ? {
              impuestoNeto: impuestoNeto === "" ? null : Number(impuestoNeto),
              anticipoSiguiente: anticipo === "" ? null : Number(anticipo),
            }
          : {}),
      };
      return d === null
        ? impuestosApi.presentar({
            ...datos,
            obligacion: fila.obligacion,
            periodo: fila.periodo,
            municipioCodigo: fila.municipio?.codigo ?? null,
          })
        : impuestosApi.corregir(d.id, datos);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["impuestos"] });
      aviso.exito(d === null ? "Presentación registrada" : "Presentación corregida", "Ya se puede registrar el pago.");
      onCerrar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{d === null ? "Registrar la presentación" : "Corregir la presentación"}</DialogTitle>
        <DialogDescription>
          {fila.etiqueta}. Presentala en {fila.municipio ? `el portal de ${fila.municipio.nombre}` : "MUISCA"} con tu
          firma y dejá acá el número; el sistema no la manda a la DIAN.
        </DialogDescription>
        <DialogCloseIcon />
      </DialogHeader>
      <DialogBody className="flex flex-col gap-4">
        <Campo id="pres-numero" etiqueta={`Número del formulario${fila.formulario ? ` ${fila.formulario}` : ""}`} error={ver("numero")} escala="grande">
          <Input
            id="pres-numero"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="3502600123456"
            className="h-11 rounded-xl px-4 font-mono"
            aria-invalid={ver("numero") !== undefined}
          />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="pres-fecha" etiqueta="Presentada el" error={ver("fecha")} escala="grande">
            <Input id="pres-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="h-11 rounded-xl px-4" />
          </Campo>
          <Campo
            id="pres-valor"
            etiqueta="Valor a pagar"
            ayuda="El del formulario, al múltiplo de mil."
            error={ver("valor")}
            escala="grande"
          >
            <CampoPesos id="pres-valor" value={valor} onChange={setValor} className="h-11 rounded-xl px-4 text-right font-mono" />
          </Campo>
        </div>
        {renta && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="pres-impuesto" etiqueta="Impuesto neto de renta" ayuda="El renglón del 110. Sirve para el anticipo del año que viene." escala="grande">
              <CampoPesos id="pres-impuesto" value={impuestoNeto} onChange={setImpuestoNeto} className="h-11 rounded-xl px-4 text-right font-mono" />
            </Campo>
            <Campo id="pres-anticipo" etiqueta="Anticipo del año siguiente" ayuda="El que liquidaste en el 110. Se resta el año que viene." escala="grande">
              <CampoPesos id="pres-anticipo" value={anticipo} onChange={setAnticipo} className="h-11 rounded-xl px-4 text-right font-mono" />
            </Campo>
          </div>
        )}
        <Campo
          id="pres-vence"
          etiqueta={renta ? "Vence la primera cuota" : "Vence"}
          ayuda={fila.vence ? "Del calendario tributario." : "El calendario de ley todavía no tiene esta fecha."}
          error={ver("vence")}
          escala="grande"
        >
          <Input
            id="pres-vence"
            type="date"
            value={vence}
            onChange={(e) => setVence(e.target.value)}
            disabled={fila.vence !== null}
            className="h-11 rounded-xl px-4"
          />
        </Campo>
        <Campo id="pres-archivo" etiqueta="El PDF del formulario (opcional)" escala="grande">
          <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-4 text-sm text-muted-foreground hover:bg-accent">
            <FileText className="size-4" />
            {archivo?.name ?? d?.archivoNombre ?? "Elegí el PDF que descargaste de MUISCA"}
            <input
              id="pres-archivo"
              type="file"
              accept="application/pdf,image/*"
              className="sr-only"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            />
          </label>
        </Campo>
      </DialogBody>
      <DialogFooter className="sm:justify-between">
        <p className="self-center text-sm text-muted-foreground">
          {intentado && problema
            ? "Revisá lo marcado en rojo."
            : renta
              ? "Después se registra cada cuota con su recibo 490."
              : `Después se registra el pago con ${fila.municipio ? "el recibo del municipio" : "el recibo 490"}.`}
        </p>
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="h-12 rounded-xl px-6" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="h-12 rounded-xl px-6"
            disabled={guardar.isPending}
            onClick={() => (problema ? setIntentado(true) : guardar.mutate())}
          >
            {guardar.isPending && <Loader2 className="size-4 animate-spin" />}
            {d === null ? "Registrar" : "Guardar"}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}
