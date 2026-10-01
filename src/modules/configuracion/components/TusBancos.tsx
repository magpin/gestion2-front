"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aviso } from "@/lib/avisos";
import { cuentasBancariasApi } from "@/modules/tesoreria/services/bancos.service";
import type { TipoCuentaBancaria } from "@/modules/tesoreria/types/bancos.types";
import { Bloque } from "./Bloque";
import { Campo } from "./Campo";
import { CONTROL } from "./Comunes";

const TIPOS: { valor: TipoCuentaBancaria; etiqueta: string }[] = [
  { valor: "AHORROS", etiqueta: "Ahorros" },
  { valor: "CORRIENTE", etiqueta: "Corriente" },
  { valor: "BILLETERA", etiqueta: "Billetera (Nequi, Daviplata)" },
];

/**
 * «Tus bancos», dentro del paso Plan de cuentas (D8): el banco, el número y el
 * tipo. La cuenta contable la crea el sistema bajo 111005 con nombre propio
 * («Bancos - Bancolombia ···1234»), así la empresa sale del asistente pudiendo
 * cobrar por banco sin pasar por el plan de cuentas.
 */
export function TusBancos() {
  const queryClient = useQueryClient();
  const [banco, setBanco] = useState("");
  const [numero, setNumero] = useState("");
  const [tipo, setTipo] = useState<TipoCuentaBancaria>("AHORROS");

  const { data: cuentas = [] } = useQuery({
    queryKey: ["cuentas-bancarias"],
    queryFn: () => cuentasBancariasApi.listar(),
  });

  const crear = useMutation({
    mutationFn: () => cuentasBancariasApi.crearConAuxiliar({ banco: banco.trim(), numeroCuenta: numero.trim(), tipoCuenta: tipo }),
    onSuccess: async (c) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["cuentas-bancarias"] }),
        queryClient.invalidateQueries({ queryKey: ["plan-cuentas"] }),
      ]);
      aviso.exito(`${c.banco} registrado con su cuenta contable`);
      setBanco("");
      setNumero("");
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const listo = banco.trim().length >= 2 && numero.trim().length >= 1;

  return (
    <Bloque
      titulo="Sus bancos"
      etiqueta="Opcional"
      descripcion="Cada cuenta bancaria con su propia cuenta contable, creada sola. Después se pueden agregar más en Bancos."
    >
      {cuentas.length > 0 && (
        <ul className="flex flex-col gap-2">
          {cuentas.map((c) => (
            <li key={c.id} className="flex items-center gap-3 rounded-xl border border-border px-4 py-2.5 text-sm">
              <Landmark className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate font-medium">{c.banco}</span>
              <span className="font-mono text-xs text-muted-foreground">···{c.numero_cuenta.slice(-4)}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <Campo id="tb-banco" etiqueta="Banco">
          <Input id="tb-banco" value={banco} onChange={(e) => setBanco(e.target.value)} placeholder="Ej. Bancolombia" className={CONTROL} />
        </Campo>
        <Campo id="tb-numero" etiqueta="Número de cuenta">
          <Input id="tb-numero" value={numero} onChange={(e) => setNumero(e.target.value)} className={`font-mono ${CONTROL}`} />
        </Campo>
        <Campo id="tb-tipo" etiqueta="Tipo">
          <select
            id="tb-tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoCuentaBancaria)}
            className={`w-full border border-input bg-card px-3 text-sm ${CONTROL}`}
          >
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.etiqueta}
              </option>
            ))}
          </select>
        </Campo>
        <Button type="button" className="h-11 rounded-xl px-4" disabled={!listo || crear.isPending} onClick={() => crear.mutate()}>
          {crear.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Agregar
        </Button>
      </div>
    </Bloque>
  );
}
