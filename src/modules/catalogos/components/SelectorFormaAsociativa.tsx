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
  invalido?: boolean;
}

/**
 * Tipo societario de la casilla 63 del RUT.
 *
 * Doce opciones fijas que define la DIAN, así que es un `Select` normal y no un
 * buscador. La S.A.S. es el código 12 y es la que llevan casi todas las
 * sociedades nuevas del país.
 *
 * Solo aplica a personas jurídicas: quien lo use tiene que ocultarlo cuando la
 * empresa es persona natural, porque el backend lo rechaza.
 */
export function SelectorFormaAsociativa({ id, valor, onCambio, invalido }: Props) {
  const { data = [] } = useQuery({
    queryKey: ["formas-asociativas"],
    queryFn: rutApi.formasAsociativas,
    staleTime: 60 * 60_000,
  });

  return (
    <Select items={data.map((f) => ({ value: f.codigo, label: f.descripcion }))} value={valor} onValueChange={(v) => onCambio(v ?? "")}>
      <SelectTrigger id={id} aria-invalid={invalido || undefined}>
        <SelectValue placeholder="Sin definir" />
      </SelectTrigger>
      <SelectContent>
        {data.map((f) => (
          <SelectItem key={f.codigo} value={f.codigo}>
            {f.descripcion}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
