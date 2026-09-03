"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCrearAjuste } from "../hooks/useAsientoMutations";
import {
  LineasAsientoEditor,
  asientoBalanceado,
  type LineaEditable,
} from "../components/LineasAsientoEditor";
import type { CrearAjustePayload } from "../types/asientos.types";

export function AjusteFormView() {
  const router = useRouter();
  const crear = useCrearAjuste();

  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [lineas, setLineas] = useState<LineaEditable[]>([]);

  const balanceado = asientoBalanceado(lineas);
  const puedeGuardar = balanceado && descripcion.trim() !== "" && fecha !== "";

  const onSubmit = () => {
    if (!puedeGuardar) {
      return;
    }
    const payload: CrearAjustePayload = {
      descripcion: descripcion.trim(),
      fecha,
      lineas: lineas.map((linea) => ({
        cuentaId: linea.cuentaId,
        debito: linea.debito,
        credito: linea.credito,
        ...(linea.descripcion ? { descripcion: linea.descripcion } : {}),
      })),
    };
    crear.mutate(payload, {
      onSuccess: (respuesta) => router.push(`/dashboard/asientos/${respuesta.id}`),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="sm"
          className="gap-1.5"
          onClick={() => router.back()}
        >
          <ArrowLeft size={15} strokeWidth={1.75} />
          Volver
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Nuevo asiento de ajuste
        </h1>
      </div>

      <Card className="gap-4 p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <span className="mb-1 block text-xs text-muted-foreground">Descripción</span>
            <Input
              value={descripcion}
              onChange={(evento) => setDescripcion(evento.target.value)}
              placeholder="Ej: Ajuste por diferencia en caja"
            />
          </div>
          <div>
            <span className="mb-1 block text-xs text-muted-foreground">Fecha</span>
            <Input
              type="date"
              value={fecha}
              onChange={(evento) => setFecha(evento.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card className="gap-4 p-5">
        <h2 className="text-sm font-semibold text-foreground">
          Líneas (partida doble)
        </h2>
        <LineasAsientoEditor lineas={lineas} onChange={setLineas} />
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button
          type="button"
          className={cn("gap-2", !puedeGuardar && "opacity-60")}
          disabled={!puedeGuardar || crear.isPending}
          onClick={onSubmit}
        >
          <Save size={16} strokeWidth={1.75} />
          {crear.isPending ? "Guardando…" : "Crear asiento"}
        </Button>
      </div>
    </div>
  );
}
