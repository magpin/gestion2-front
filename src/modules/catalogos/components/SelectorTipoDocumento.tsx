"use client";

import { useQuery } from "@tanstack/react-query";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { rutApi } from "../services/catalogos.service";

interface Props {
  id: string;
  valor: string;
  onCambio: (codigo: string) => void;
  /** Filtra lo que tiene sentido ofrecer: un representante legal es persona natural. */
  aplicaPersona?: "NATURAL" | "JURIDICA";
  invalido?: boolean;
  /** La escala la decide la pantalla: el asistente y terceros no miden igual. */
  className?: string;
}

/**
 * Tipo de documento contra el catálogo de la casilla 25 del RUT.
 *
 * Reemplaza las listas escritas a mano, que estaban desincronizadas: el
 * formulario de representante ofrecía cinco valores y el de terceros once,
 * mientras la base ya aceptaba dieciséis. Un `PPT` o un patrimonio autónomo
 * entraban por API y no por pantalla.
 *
 * El código corto (`CC`, `NIT`) es lo que guarda la aplicación; el catálogo
 * además lleva la numeración del RUT y la del anexo de facturación electrónica,
 * que no coinciden entre sí y por eso viven en la misma fila.
 */
export function SelectorTipoDocumento({
  id,
  valor,
  onCambio,
  aplicaPersona,
  invalido,
  className,
}: Props) {
  const { data = [] } = useQuery({
    queryKey: ["tipos-documento", aplicaPersona ?? "todos"],
    queryFn: () => rutApi.tiposDocumento(aplicaPersona),
    staleTime: 60 * 60_000,
  });

  // El control admite null al deseleccionar; el formulario siempre quiere una
  // cadena, así que null se traduce a vacío y ahí lo rechaza la validación.
  return (
    <Select items={data.map((t) => ({ value: t.codigo, label: t.codigo }))} value={valor} onValueChange={(v) => onCambio(v ?? "")}>
      <SelectTrigger id={id} aria-invalid={invalido || undefined} className={className}>
        <SelectValue placeholder="Tipo" />
      </SelectTrigger>
      <SelectContent>
        {data.map((t) => (
          <SelectItem key={t.codigo} value={t.codigo}>
            <span className="font-mono text-xs">{t.codigo}</span>
            <span className="ml-2 text-muted-foreground">{t.descripcion}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
