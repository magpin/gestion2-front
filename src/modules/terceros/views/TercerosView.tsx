"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  UserSquare2,
} from "lucide-react";

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
import { mensajeDeError } from "@/core/api/api";
import { aviso } from "@/lib/avisos";
import { FormularioTercero, type DatosTercero } from "../components/FormularioTercero";
import { tercerosApi } from "../services/terceros.service";
import type { TerceroResumen } from "../types/terceros.types";

const CLAVE = ["terceros"];

type Tipo = "Todos" | "Cliente" | "Proveedor";
type Estado = "Todos" | "Activo" | "Inactivo";

/** El `<form>` vive en el cuerpo del modal y el botón que lo envía, en el pie. */
const ID_FORMULARIO = "formulario-tercero";

/**
 * Clientes y proveedores.
 *
 * Una sola lista y no dos: el mismo NIT suele comprar y vender, y separarlos
 * obliga a mantener dos fichas del mismo señor que se desincronizan. Los filtros
 * de arriba son la forma de ver solo una cara cuando hace falta.
 *
 * Crear, editar y desactivar ocurren en modales sobre la lista. Salir a otra
 * pantalla para cada uno hace perder de vista dónde estaba la fila y obliga a
 * volver a filtrar al regresar.
 *
 * Nada se borra. Desactivar saca al tercero de las listas de digitación y
 * conserva su historia: un tercero con facturas emitidas no se puede quitar sin
 * dejar esos documentos sin a quién apuntar.
 */
export function TercerosView() {
  const queryClient = useQueryClient();

  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState<Tipo>("Todos");
  const [estado, setEstado] = useState<Estado>("Todos");
  const [pagina, setPagina] = useState(1);

  // Cambiar un filtro vuelve a la primera página: quedarse en la cuarta después
  // de acotar la lista muestra un vacío que parece "no hay nada".
  const filtrar = <T,>(set: (v: T) => void) => (valor: T) => {
    set(valor);
    setPagina(1);
  };

  /** null = ningún modal. Un id o "nuevo" = el formulario abierto. */
  const [editando, setEditando] = useState<string | null>(null);
  /** El tercero que espera confirmación para salir de las listas. */
  const [porDesactivar, setPorDesactivar] = useState<TerceroResumen | null>(null);

  const hayFiltro = busqueda.trim() !== "" || tipo !== "Todos" || estado !== "Todos";

  const limpiar = () => {
    setBusqueda("");
    setTipo("Todos");
    setEstado("Todos");
    setPagina(1);
  };

  const { data: resultado, isLoading } = useQuery({
    queryKey: [...CLAVE, busqueda, tipo, estado, pagina],
    queryFn: () =>
      tercerosApi.listar({
        q: busqueda.trim() || undefined,
        esCliente: tipo === "Cliente",
        esProveedor: tipo === "Proveedor",
        incluirInactivos: estado === "Todos",
        soloInactivos: estado === "Inactivo",
        pagina,
      }),
  });

  // La ficha completa solo se pide al abrir el formulario: la lista trae lo
  // justo para mostrarse, y traer todo de cada tercero encarecería la consulta
  // para llenar campos que nadie está mirando.
  const { data: ficha, isFetching: cargandoFicha } = useQuery({
    queryKey: [...CLAVE, "ficha", editando],
    queryFn: () => tercerosApi.porId(editando!),
    enabled: editando !== null && editando !== "nuevo",
  });

  const refrescar = () => queryClient.invalidateQueries({ queryKey: CLAVE });

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

      if (editando === "nuevo") return tercerosApi.crear(datos);

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
    onSuccess: async () => {
      await refrescar();
      aviso.exito(editando === "nuevo" ? "Tercero registrado" : "Cambios guardados");
      setEditando(null);
    },
    onError: (e: unknown) => aviso.error(mensajeDeError(e)),
  });

  const desactivar = useMutation({
    mutationFn: (id: string) => tercerosApi.desactivar(id),
    onSuccess: async () => {
      await refrescar();
      aviso.exito("Tercero desactivado");
      setPorDesactivar(null);
    },
    onError: (e: unknown) => aviso.error(mensajeDeError(e)),
  });

  const datos = resultado?.datos ?? [];
  const activar = useMutation({
    mutationFn: (id: string) => tercerosApi.activar(id),
    onSuccess: async () => {
      await refrescar();
      aviso.exito("Tercero reactivado");
    },
    onError: (e: unknown) => aviso.error(mensajeDeError(e)),
  });

  const terceros = estado === "Inactivo" ? datos.filter((t) => !t.activo) : datos;
  const creando = editando === "nuevo";

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-7 sm:px-10 lg:px-16">
      {/* El botón de crear vive en el encabezado, lejos de los filtros: es la
          acción de la pantalla, no una forma más de acotar la lista. */}
      <header className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-text">
            <span className="size-2 rounded-full bg-brand" />
            Directorio
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.04em]">
            Terceros<span className="text-brand">.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Clientes y proveedores, en un solo lugar. El mismo NIT puede ser los
            dos.
          </p>
        </div>

        <Button
          onClick={() => setEditando("nuevo")}
          className="h-auto gap-3 rounded-2xl px-5 py-3.5 font-semibold shadow-[0_8px_20px_rgb(0_0_0/0.15)] hover:-translate-y-0.5 hover:bg-brand hover:text-white"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-white/15">
            <Plus className="size-4" />
          </span>
          Nuevo tercero
        </Button>
      </header>

      {/* Los filtros no se apiñan: cada uno es una caja de 48px con su etiqueta
          encima, para saber qué acota sin abrirlo. */}
      <section className="mb-6 grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
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
            placeholder="Buscar por nombre o documento"
            aria-label="Buscar tercero"
            className="h-auto text-sm"
          />
        </InputGroup>

        <FiltroSelect
          etiqueta="Tipo"
          valor={tipo}
          opciones={["Todos", "Cliente", "Proveedor"]}
          alCambiar={filtrar(setTipo)}
        />
        <FiltroSelect
          etiqueta="Estado"
          valor={estado}
          opciones={["Todos", "Activo", "Inactivo"]}
          alCambiar={filtrar(setEstado)}
        />

        <Button
          variant="outline"
          onClick={limpiar}
          className="h-auto min-h-12 rounded-2xl px-4 text-muted-foreground hover:bg-card hover:text-foreground"
        >
          Limpiar
        </Button>
      </section>

      <div className="mb-3 px-1">
        <p className="text-sm text-muted-foreground">
          <strong className="font-semibold text-foreground">
            {terceros.length}
          </strong>{" "}
          de {resultado?.total ?? 0} terceros
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : terceros.length === 0 ? (
        <Vacio hayFiltro={hayFiltro} onCrear={() => setEditando("nuevo")} />
      ) : (
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          {/* En pantalla angosta la tabla se desplaza en lugar de comprimir las
              celdas: una columna de acciones apretada es una acción errada. */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead className="border-b border-border bg-muted/40 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th scope="col" className="px-6 py-4">
                    Tercero
                  </th>
                  <th scope="col" className="px-5 py-4">
                    Documento
                  </th>
                  <th scope="col" className="px-5 py-4">
                    Rol
                  </th>
                  <th scope="col" className="px-5 py-4">
                    Estado
                  </th>
                  <th scope="col" className="px-6 py-4 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {terceros.map((t) => (
                  <Fila
                    key={t.id}
                    tercero={t}
                    onEditar={() => setEditando(t.id)}
                    onDesactivar={() => setPorDesactivar(t)}
                    onActivar={() => activar.mutate(t.id)}
                    reactivando={activar.isPending}
                  />
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

      <Dialog
        open={editando !== null}
        onOpenChange={(abierto) => !abierto && setEditando(null)}
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
                alGuardar={(d) => guardar.mutate(d)}
              />
            )}
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-xl px-6"
              onClick={() => setEditando(null)}
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

      <AlertDialog
        open={porDesactivar !== null}
        onOpenChange={(abierto) => !abierto && setPorDesactivar(null)}
      >
        <AlertDialogContent className="gap-6 p-6 sm:max-w-md!">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-danger/10 text-danger">
              <UserSquare2 />
            </AlertDialogMedia>
            <AlertDialogTitle className="text-lg">
              ¿Desactivar este tercero?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[15px] leading-6">
              {porDesactivar?.nombre} deja de aparecer al digitar facturas y
              compras. No se borra: su historia y los documentos que ya tiene
              emitidos quedan intactos, y podés volver a verlo con “Ver
              inactivos”.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="-mx-6 -mb-6 p-6">
            <AlertDialogCancel className="h-11 rounded-xl px-6">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-11 rounded-xl bg-danger px-6 text-white hover:bg-danger/90"
              disabled={desactivar.isPending}
              onClick={() =>
                porDesactivar && desactivar.mutate(porDesactivar.id)
              }
            >
              {desactivar.isPending && <Loader2 className="size-4 animate-spin" />}
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * Un filtro: caja alta, etiqueta arriba y valor abajo.
 *
 * La etiqueta va dentro de la caja y siempre visible. Un desplegable suelto que
 * dice "Todos" no dice todos de qué, y con dos filtros al lado hay que abrirlos
 * para saber cuál es cuál.
 *
 * El `min-h-12` gana sobre el `h-8` del disparador —una altura mínima manda
 * sobre una fija— y por eso la caja crece sin pelear con el componente.
 */
function FiltroSelect<T extends string>({
  etiqueta,
  valor,
  opciones,
  alCambiar,
}: {
  etiqueta: string;
  valor: T;
  opciones: readonly T[];
  alCambiar: (valor: T) => void;
}) {
  return (
    <Select value={valor} onValueChange={(v) => alCambiar(v as T)}>
      <SelectTrigger
        aria-label={etiqueta}
        className="min-h-12 min-w-[145px] rounded-2xl border-border bg-card px-4 shadow-sm"
      >
        <span className="flex flex-col items-start">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {etiqueta}
          </span>
          <SelectValue className="text-sm font-semibold" />
        </span>
      </SelectTrigger>
      <SelectContent>
        {opciones.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Anterior y siguiente, con el rango a la vista.
 *
 * Sin esto la lista mentía: el servidor devuelve de a 50 y la pantalla mostraba
 * esos 50 como si fueran todos. Con 51 terceros, el 51 no existía.
 *
 * No se dibuja con una sola página: un paginador con los dos botones apagados
 * solo ocupa espacio.
 */
function Paginador({
  pagina,
  tamano,
  total,
  alCambiar,
}: {
  pagina: number;
  tamano: number;
  total: number;
  alCambiar: (pagina: number) => void;
}) {
  const paginas = tamano > 0 ? Math.ceil(total / tamano) : 1;
  if (paginas <= 1) return null;

  const desde = (pagina - 1) * tamano + 1;
  const hasta = Math.min(pagina * tamano, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-6 py-4">
      <p className="text-sm text-muted-foreground">
        {desde}–{hasta} de {total}
      </p>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          className="h-11 rounded-xl px-5"
          disabled={pagina <= 1}
          onClick={() => alCambiar(pagina - 1)}
        >
          <ChevronLeft className="size-4" />
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
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

/** Dos letras del nombre. Da a la fila un ancla visual antes que el texto. */
function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function Fila({
  tercero,
  onEditar,
  onDesactivar,
  onActivar,
  reactivando,
}: {
  tercero: TerceroResumen;
  onEditar: () => void;
  onDesactivar: () => void;
  onActivar: () => void;
  reactivando: boolean;
}) {
  return (
    <tr className="transition-colors hover:bg-muted/40">
      <td className={`px-6 py-5 ${tercero.activo ? "" : "opacity-60"}`}>
        <div className="flex items-center gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-xs font-bold text-muted-foreground">
            {iniciales(tercero.nombre)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{tercero.nombre}</p>
            {tercero.responsableIva && (
              <p className="mt-1 text-[13px] text-muted-foreground">
                Responsable de IVA
              </p>
            )}
          </div>
        </div>
      </td>

      <td className="px-5 py-5 font-mono text-[13px] text-muted-foreground">
        {tercero.tipoDocumento} {tercero.numeroDocumento}
        {tercero.dv ? `-${tercero.dv}` : ""}
      </td>

      <td className="px-5 py-5">
        <div className="flex flex-wrap gap-2">
          {tercero.esCliente && (
            <Badge variant="outline" className="h-7 px-3">
              Cliente
            </Badge>
          )}
          {tercero.esProveedor && (
            <Badge variant="outline" className="h-7 px-3">
              Proveedor
            </Badge>
          )}
        </div>
      </td>

      <td className="px-5 py-5">
        <span className="inline-flex items-center gap-2 text-[13px] font-semibold">
          <span
            className={`size-2 rounded-full ${
              tercero.activo ? "bg-success" : "bg-muted-foreground"
            }`}
          />
          {tercero.activo ? "Activo" : "Inactivo"}
        </span>
      </td>

      {/* Las acciones llevan etiqueta: un icono solo obliga a adivinar cuál de
          los dos es el que no se puede deshacer. */}
      <td className="px-6 py-5">
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            className="h-11 rounded-xl px-5"
            onClick={onEditar}
          >
            <Pencil className="size-4" />
            Editar
          </Button>
          {/* Desactivar pide confirmación y reactivar no: sacarlo de las listas
              sorprende, devolverlo no. */}
          {tercero.activo ? (
            <Button
              variant="ghost"
              className="h-11 rounded-xl px-5 text-muted-foreground hover:text-danger"
              onClick={onDesactivar}
            >
              Desactivar
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="h-11 rounded-xl px-5 text-muted-foreground"
              disabled={reactivando}
              onClick={onActivar}
            >
              {reactivando ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RotateCcw className="size-4" />
              )}
              Reactivar
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

function Vacio({
  hayFiltro,
  onCrear,
}: {
  hayFiltro: boolean;
  onCrear: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-20 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <UserSquare2 className="size-6" />
      </span>
      <p className="text-lg font-semibold">
        {hayFiltro ? "Ningún tercero coincide" : "Todavía no hay terceros"}
      </p>
      <p className="max-w-md text-sm leading-6 text-muted-foreground">
        {hayFiltro
          ? "Probá con otro texto, o quitá los filtros."
          : "Acá van los clientes a quienes les facturás y los proveedores a quienes les comprás."}
      </p>
      {!hayFiltro && (
        <Button className="mt-2 h-12 rounded-xl px-6" onClick={onCrear}>
          <Plus className="size-4" />
          Nuevo tercero
        </Button>
      )}
    </div>
  );
}
