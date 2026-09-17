"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Loader2, Search, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTieneRol } from "@/core/store/authStore";
import { Checkbox } from "@/components/ui/checkbox";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { aviso } from "@/lib/avisos";
import { formatCOP, formatFecha } from "@/lib/utils";
import { DetalleAsiento } from "../components/DetalleAsiento";
import { FormularioAsiento } from "../components/FormularioAsiento";
import {
  asientosApi,
  comprobantesApi,
} from "../services/contabilidad.service";
import type { AsientoResumen } from "../types/contabilidad.types";

const CLAVE = ["asientos"];

const TODOS = "TODOS";

/**
 * El libro diario como lo ve quien lo lleva: la lista, y crear encima de ella.
 *
 * Nada se edita. Un asiento registrado es inmutable —lo sostiene un trigger, no
 * una regla del servicio—, así que la única acción por fila es anular, y anular
 * conserva la trazabilidad en vez de borrarla.
 */
export function AsientosSeccion() {
  const queryClient = useQueryClient();

  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState(TODOS);
  const [verAnulados, setVerAnulados] = useState(false);
  const [pagina, setPagina] = useState(1);

  const [creando, setCreando] = useState(false);
  const [porAnular, setPorAnular] = useState<AsientoResumen | null>(null);
  const [motivo, setMotivo] = useState("");
  const [detalleId, setDetalleId] = useState<string | null>(null);

  const hayFiltro = busqueda.trim() !== "" || tipo !== TODOS || verAnulados;

  const limpiar = () => {
    setBusqueda("");
    setTipo(TODOS);
    setVerAnulados(false);
    setPagina(1);
  };

  const { data: comprobantes = [] } = useQuery({
    queryKey: ["comprobantes"],
    queryFn: () => comprobantesApi.listar(),
    staleTime: 60 * 60_000,
  });

  const { data: resultado, isLoading } = useQuery({
    queryKey: [...CLAVE, busqueda, tipo, verAnulados, pagina],
    queryFn: () =>
      asientosApi.listar({
        q: busqueda.trim() || undefined,
        comprobanteTipoId: tipo === TODOS ? undefined : tipo,
        incluirAnulados: verAnulados,
        pagina,
      }),
  });

  const anular = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      asientosApi.anular(id, motivo),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE });
      aviso.exito("Asiento anulado");
      setPorAnular(null);
      setMotivo("");
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const asientos = resultado?.datos ?? [];

  return (
    <>
      {/* El filtro por comprobante y el de anulados son cosas distintas: uno
          acota qué serie, el otro qué estado. Por eso no se mezclan en un solo
          control. */}
      <section className="mb-6 grid items-center gap-3 md:grid-cols-[1fr_auto_auto_auto]">
        <InputGroup className="h-auto min-h-12 rounded-2xl border-border bg-card px-2 shadow-sm">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
            placeholder="Buscar por número o glosa"
            aria-label="Buscar asiento"
            className="h-auto text-sm"
          />
        </InputGroup>

        <Select
          value={tipo}
          onValueChange={(v) => {
            setTipo(v ?? TODOS);
            setPagina(1);
          }}
        >
          <SelectTrigger
            aria-label="Comprobante"
            className="min-h-12 min-w-[155px] rounded-2xl border-border bg-card px-4 shadow-sm"
          >
            <span className="flex flex-col items-start">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Comprobante
              </span>
              <SelectValue className="text-sm font-semibold" />
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos</SelectItem>
            {comprobantes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.codigo} · {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card px-4 text-sm font-medium shadow-sm">
          <Checkbox
            checked={verAnulados}
            onCheckedChange={(v) => {
              setVerAnulados(v === true);
              setPagina(1);
            }}
          />
          Ver anulados
        </label>

        <Button
          variant="outline"
          disabled={!hayFiltro}
          onClick={limpiar}
          className="h-auto min-h-12 rounded-2xl px-4 font-semibold text-muted-foreground hover:bg-card hover:text-foreground"
        >
          Limpiar
        </Button>
      </section>

      <div className="mb-3 px-1 text-sm text-muted-foreground">
        <strong className="font-semibold text-foreground">
          {resultado?.total ?? 0}
        </strong>{" "}
        asiento{resultado?.total === 1 ? "" : "s"} encontrado
        {resultado?.total === 1 ? "" : "s"}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : asientos.length === 0 ? (
        <Vacio hayFiltro={hayFiltro} onCrear={() => setCreando(true)} />
      ) : (
        <section className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  {[
                    "Número",
                    "Fecha",
                    "Comprobante",
                    "Glosa",
                    "Total",
                    "Estado",
                  ].map((t) => (
                    <th key={t} scope="col" className="px-5 py-4">
                      {t}
                    </th>
                  ))}
                  <th scope="col" className="px-5 py-4 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {asientos.map((a) => (
                  <tr
                    key={a.id}
                    className="transition-colors hover:bg-muted/40"
                  >
                    <td className="px-5 py-5 font-mono text-sm font-bold">
                      {a.numero}
                    </td>
                    <td className="px-5 py-5 text-sm text-muted-foreground">
                      {formatFecha(a.fecha)}
                    </td>
                    <td className="px-5 py-5">
                      <Badge variant="outline" className="h-7 px-3">
                        {a.comprobante_codigo}
                      </Badge>
                    </td>
                    <td className="max-w-[320px] truncate px-5 py-5 text-sm font-medium">
                      {a.glosa}
                    </td>
                    <td className="px-5 py-5 font-mono text-sm font-semibold">
                      {formatCOP(Number(a.total_debito))}
                    </td>
                    <td className="px-5 py-5">
                      <span
                        className={`inline-flex items-center gap-2 text-[13px] font-semibold ${
                          a.estado === "ANULADO"
                            ? "text-danger"
                            : "text-success"
                        }`}
                      >
                        <span
                          className={`size-2 rounded-full ${
                            a.estado === "ANULADO" ? "bg-danger" : "bg-success"
                          }`}
                        />
                        {a.estado === "ANULADO" ? "Anulado" : "Registrado"}
                      </span>
                    </td>
                    <td className="px-5 py-5">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          className="h-11 rounded-xl px-5 text-muted-foreground hover:text-foreground"
                          onClick={() => setDetalleId(a.id)}
                        >
                          <Eye className="size-4" />
                          Ver
                        </Button>
                        {a.estado !== "ANULADO" && (
                          <Button
                            variant="ghost"
                            className="h-11 rounded-xl px-5 text-muted-foreground hover:text-danger"
                            onClick={() => setPorAnular(a)}
                          >
                            <Trash2 className="size-4" />
                            Anular
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Paginador
            pagina={resultado?.pagina ?? 1}
            tamano={resultado?.tamano ?? 0}
            total={resultado?.total ?? 0}
            alCambiar={setPagina}
          />
        </section>
      )}

      <DetalleAsiento asientoId={detalleId} onCerrar={() => setDetalleId(null)} />

      <FormularioAsiento
        abierto={creando}
        onCerrar={() => setCreando(false)}
        onCreado={() => queryClient.invalidateQueries({ queryKey: CLAVE })}
      />

      <AlertDialog
        open={porAnular !== null}
        onOpenChange={(abierto) => {
          if (!abierto) {
            setPorAnular(null);
            setMotivo("");
          }
        }}
      >
        <AlertDialogContent className="gap-6 p-6 sm:max-w-lg!">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-danger/10 text-danger">
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle className="text-lg">
              Anular {porAnular?.numero}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[15px] leading-6">
              El asiento queda marcado como anulado y conserva su trazabilidad:
              los documentos contables no se eliminan. Deja de sumar a los
              saldos, pero sigue en el libro.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* El motivo es obligatorio y no es burocracia: un asiento anulado sin
              explicación obliga a preguntarle a quien lo anuló, y para cuando
              alguien audita esa persona ya no se acuerda. */}
          <label className="block text-sm font-medium">
            Motivo de la anulación
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Por qué se anula"
              className="mt-2 min-h-24 rounded-xl px-4 py-3"
            />
          </label>

          <AlertDialogFooter className="-mx-6 -mb-6 p-6">
            <AlertDialogCancel className="h-11 rounded-xl px-6">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-11 rounded-xl bg-danger px-6 text-white hover:bg-danger/90"
              disabled={anular.isPending || motivo.trim().length < 3}
              onClick={() =>
                porAnular &&
                anular.mutate({ id: porAnular.id, motivo: motivo.trim() })
              }
            >
              {anular.isPending && <Loader2 className="size-4 animate-spin" />}
              Anular asiento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Paginador({
  pagina,
  tamano,
  total,
  alCambiar,
}: {
  pagina: number;
  tamano: number;
  total: number;
  alCambiar: (p: number) => void;
}) {
  const paginas = tamano > 0 ? Math.ceil(total / tamano) : 1;
  if (paginas <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-6 py-4">
      <p className="text-sm text-muted-foreground">
        {(pagina - 1) * tamano + 1}–{Math.min(pagina * tamano, total)} de {total}
      </p>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          className="h-11 rounded-xl px-5"
          disabled={pagina <= 1}
          onClick={() => alCambiar(pagina - 1)}
        >
          Anterior
        </Button>
        <span className="text-sm text-muted-foreground">
          {pagina} de {paginas}
        </span>
        <Button
          variant="outline"
          className="h-11 rounded-xl px-5"
          disabled={pagina >= paginas}
          onClick={() => alCambiar(pagina + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}

function Vacio({
  hayFiltro,
  onCrear,
}: {
  hayFiltro: boolean;
  onCrear: () => void;
}) {
  // Mismo criterio que el botón del encabezado: asentar es del contador.
  const puedeAsentar = useTieneRol("CONTADOR");
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card px-6 py-20 text-center">
      <p className="text-lg font-semibold">
        {hayFiltro ? "Ningún asiento coincide" : "Todavía no hay asientos"}
      </p>
      <p className="max-w-md text-sm leading-6 text-muted-foreground">
        {hayFiltro
          ? "Probá con otro texto, o quitá los filtros."
          : "Acá va la historia contable de la empresa: cada hecho, con su fecha, su número y su explicación."}
      </p>
      {!hayFiltro && puedeAsentar && (
        <Button className="mt-2 h-12 rounded-xl px-6" onClick={onCrear}>
          Nuevo asiento
        </Button>
      )}
    </div>
  );
}
