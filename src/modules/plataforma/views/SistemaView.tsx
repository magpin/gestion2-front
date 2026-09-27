"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pause, Play, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { aviso } from "@/lib/avisos";
import { cn } from "@/lib/utils";
import { BotonBuscar } from "../components/BotonBuscar";
import {
  Encabezado,
  ErrorCarga,
  EsqueletoPagina,
  Mono,
  Pastilla,
  Tarjeta,
  Vacio,
} from "../components/piezas";
import { cuando, entero, fecha, hora } from "../lib/formato";
import { plataformaService } from "../services/plataforma.service";
import type { Anuncio, EstadoSistema } from "../types/plataforma.types";

const campo =
  "h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type Tono = "exito" | "advertencia" | "peligro" | "neutro";

const PROVEEDOR: Record<
  EstadoSistema["proveedorIa"]["estado"],
  { tono: Tono; texto: string }
> = {
  FUNCIONANDO: { tono: "exito", texto: "Funcionando" },
  INESTABLE: { tono: "advertencia", texto: "Con fallas" },
  CAIDO: { tono: "peligro", texto: "Caído" },
  SIN_DATOS: { tono: "neutro", texto: "Sin uso en 24 horas" },
};

const USOS: Record<string, string> = {
  CHAT: "Chat",
  LECTURA: "Lectura de documentos",
};

const ESTADO_ANUNCIO: Record<
  Anuncio["estado"],
  { tono: Tono | "info"; texto: string }
> = {
  VIGENTE: { tono: "exito", texto: "Se está viendo" },
  PROGRAMADO: { tono: "info", texto: "Programado" },
  TERMINADO: { tono: "neutro", texto: "Terminó" },
  RETIRADO: { tono: "neutro", texto: "Retirado" },
};

/**
 * El estado técnico en lenguaje llano, el interruptor de la IA y los
 * anuncios a los clientes. Nada de lo que muestra dice qué se conversó.
 */
export function SistemaView() {
  const qc = useQueryClient();
  const [dialogo, setDialogo] = useState<"pausa" | "anuncio" | null>(null);
  const estado = useQuery({
    queryKey: ["plataforma", "sistema"],
    queryFn: plataformaService.sistema,
    refetchInterval: 60_000,
  });
  const anuncios = useQuery({
    queryKey: ["plataforma", "anuncios"],
    queryFn: plataformaService.anuncios,
  });

  const reanudar = useMutation({
    mutationFn: plataformaService.reanudarIa,
    onSuccess: async () => {
      aviso.exito("La IA volvió a funcionar");
      await qc.invalidateQueries({ queryKey: ["plataforma"] });
    },
    onError: (e) => aviso.falla(e),
  });
  const retirar = useMutation({
    mutationFn: plataformaService.retirarAnuncio,
    onSuccess: async () => {
      aviso.exito("Anuncio retirado");
      await qc.invalidateQueries({ queryKey: ["plataforma", "anuncios"] });
    },
    onError: (e) => aviso.falla(e),
  });

  if (estado.isPending) return <EsqueletoPagina />;
  if (estado.isError || !estado.data)
    return (
      <>
        <Encabezado titulo="Sistema" />
        <ErrorCarga
          que="el estado del sistema"
          alReintentar={() => void estado.refetch()}
        />
      </>
    );

  const d = estado.data;
  const u = d.ultimas24h;
  const global = d.pausas.find((p) => p.cuentaId === null);

  return (
    <>
      <Encabezado
        titulo="Sistema"
        subtitulo={`Versión ${d.api.version}, en marcha desde el ${fecha(d.api.desde)} a las ${hora(d.api.desde)}.`}
        acciones={<BotonBuscar />}
      />

      {global && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warning bg-warning/10 p-4 text-sm">
          <Pause className="size-4 text-warning" aria-hidden />
          <span className="flex-1">
            <strong className="font-medium">
              La IA está en pausa para todas las cuentas
            </strong>{" "}
            (
            {global.usos
              .map((x) => USOS[x])
              .join(" y ")
              .toLowerCase()}
            ). {global.motivo}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => reanudar.mutate(global.id)}
          >
            <Play /> Reanudar
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Estado
          titulo="API"
          tono="exito"
          texto="Funcionando"
          nota="Respondió esta consulta."
        />
        <Estado
          titulo="Base de datos"
          tono={
            d.base.conectada
              ? d.base.aislamientoActivo
                ? "exito"
                : "peligro"
              : "peligro"
          }
          texto={d.base.conectada ? "Conectada" : "Sin conexión"}
          nota={
            d.base.conectada
              ? d.base.aislamientoActivo
                ? "El aislamiento entre clientes está activo."
                : "¡El aislamiento entre clientes no está activo! Revisar DB_APP_USERNAME."
              : "La API no alcanza la base."
          }
        />
        <Estado
          titulo="Proveedor de IA"
          tono={PROVEEDOR[d.proveedorIa.estado].tono}
          texto={PROVEEDOR[d.proveedorIa.estado].texto}
          nota={
            d.proveedorIa.ultimaRespuestaOk
              ? `Última respuesta buena: ${cuando(d.proveedorIa.ultimaRespuestaOk)}.`
              : "Todavía no contestó nada."
          }
        />
        <Tarjeta titulo="Últimas 24 horas" className="gap-2">
          <Fila texto="Respuestas del chat" valor={entero(u.respuestas)} />
          <Fila
            texto="Fallidas"
            valor={entero(u.respuestasFallidas)}
            alerta={u.respuestasFallidas > 0}
          />
          <Fila
            texto="Cortadas por largo"
            valor={entero(u.respuestasCortadas)}
          />
          <Fila texto="Documentos leídos" valor={entero(u.lecturas)} />
          <Fila
            texto="Lecturas fallidas"
            valor={entero(u.lecturasFallidas)}
            alerta={u.lecturasFallidas > 0}
          />
        </Tarjeta>
      </div>

      <Tarjeta
        titulo="Pausas de la IA"
        accion={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialogo("pausa")}
          >
            <Pause /> Pausar la IA
          </Button>
        }
      >
        <p className="m-0 text-[13px] text-muted-foreground">
          Sirve si el proveedor falla, si se dispara el gasto o si aparece un
          error en una herramienta. Con la pausa puesta, el asistente dice que
          está en pausa, no que falló, y no se gasta ni un token.
        </p>
        {d.pausas.length === 0 ? (
          <p className="m-0 text-sm">
            Ninguna pausa vigente. La IA funciona para todas las cuentas.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {d.pausas.map((p, i) => (
              <li
                key={p.id}
                className={cn(
                  "flex flex-wrap items-center gap-3 py-3",
                  i > 0 && "border-t border-border",
                )}
              >
                <span className="size-2 rounded-full bg-warning" aria-hidden />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium">
                    {p.cuenta ?? "Todas las cuentas"}:{" "}
                    {p.usos
                      .map((x) => USOS[x])
                      .join(" y ")
                      .toLowerCase()}
                  </span>
                  <span className="text-[13px] text-muted-foreground">
                    {p.motivo}. Desde {cuando(p.desde)}, por {p.admin}.
                  </span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={reanudar.isPending}
                  onClick={() => reanudar.mutate(p.id)}
                >
                  <Play /> Reanudar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      <Tarjeta
        titulo="Anuncios a los clientes"
        accion={
          <Button size="sm" onClick={() => setDialogo("anuncio")}>
            <Plus /> Nuevo anuncio
          </Button>
        }
      >
        {anuncios.isPending ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : !anuncios.data || anuncios.data.length === 0 ? (
          <Vacio
            titulo="Todavía no hay anuncios."
            texto="Un aviso de mantenimiento o una novedad sale como una franja arriba en el sistema de los clientes."
          />
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {anuncios.data.map((a, i) => (
              <li
                key={a.id}
                className={cn(
                  "flex flex-wrap items-start gap-3 py-3",
                  i > 0 && "border-t border-border",
                )}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{a.titulo}</span>
                    <Pastilla tono={ESTADO_ANUNCIO[a.estado].tono}>
                      {ESTADO_ANUNCIO[a.estado].texto}
                    </Pastilla>
                    {a.tono === "MANTENIMIENTO" && (
                      <Pastilla tono="advertencia">Mantenimiento</Pastilla>
                    )}
                  </span>
                  <span className="text-[13px]">{a.cuerpo}</span>
                  <span className="text-xs text-muted-foreground">
                    {a.cuentas === null
                      ? "Para todas las cuentas"
                      : `Para ${a.nombresCuentas.join(", ")}`}
                    . Del {fecha(a.desde)} {hora(a.desde)} al {fecha(a.hasta)}{" "}
                    {hora(a.hasta)}. {a.admin}.
                  </span>
                </span>
                {(a.estado === "VIGENTE" || a.estado === "PROGRAMADO") && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={retirar.isPending}
                    onClick={() => retirar.mutate(a.id)}
                  >
                    Retirar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      {dialogo === "pausa" && (
        <DialogoPausa alCerrar={() => setDialogo(null)} />
      )}
      {dialogo === "anuncio" && (
        <DialogoAnuncio alCerrar={() => setDialogo(null)} />
      )}
    </>
  );
}

function Estado({
  titulo,
  tono,
  texto,
  nota,
}: {
  titulo: string;
  tono: Tono;
  texto: string;
  nota: string;
}) {
  return (
    <Tarjeta titulo={titulo} className="gap-2">
      <Pastilla tono={tono}>
        <span
          className={cn(
            "size-1.5 rounded-full",
            {
              exito: "bg-success",
              advertencia: "bg-warning",
              peligro: "bg-danger",
              neutro: "bg-muted-foreground",
            }[tono],
          )}
          aria-hidden
        />
        {texto}
      </Pastilla>
      <span className="text-[13px] text-muted-foreground">{nota}</span>
    </Tarjeta>
  );
}

function Fila({
  texto,
  valor,
  alerta = false,
}: {
  texto: string;
  valor: string;
  alerta?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3 text-[13px]">
      <span className="text-muted-foreground">{texto}</span>
      <Mono className={cn(alerta && "font-medium text-danger")}>{valor}</Mono>
    </div>
  );
}

/** Buscar la cuenta por nombre, con la búsqueda de Ctrl K. */
function ElegirCuenta({
  valor,
  alElegir,
}: {
  valor: { id: string; nombre: string } | null;
  alElegir: (c: { id: string; nombre: string } | null) => void;
}) {
  const [texto, setTexto] = useState("");
  const busqueda = useQuery({
    queryKey: ["plataforma", "buscar", texto],
    queryFn: () => plataformaService.buscar(texto),
    enabled: texto.trim().length >= 2 && valor === null,
  });
  if (valor)
    return (
      <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
        {valor.nombre}
        <button
          type="button"
          className="text-xs text-muted-foreground hover:underline"
          onClick={() => alElegir(null)}
        >
          Cambiar
        </button>
      </div>
    );
  return (
    <div className="flex flex-col gap-1">
      <Input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Nombre de la cuenta"
      />
      {busqueda.data?.cuentas.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => alElegir({ id: c.id, nombre: c.nombre })}
          className="rounded-md px-3 py-1.5 text-left text-sm hover:bg-muted"
        >
          {c.nombre}
        </button>
      ))}
    </div>
  );
}

function DialogoPausa({ alCerrar }: { alCerrar: () => void }) {
  const qc = useQueryClient();
  const [alcance, setAlcance] = useState<"TODAS" | "UNA">("UNA");
  const [cuenta, setCuenta] = useState<{ id: string; nombre: string } | null>(
    null,
  );
  const [usos, setUsos] = useState<string[]>(["CHAT"]);
  const [motivo, setMotivo] = useState("");
  const listo =
    usos.length > 0 &&
    motivo.trim().length >= 3 &&
    (alcance === "TODAS" || cuenta !== null);

  const guardar = useMutation({
    mutationFn: () =>
      plataformaService.pausarIa({
        ...(alcance === "UNA" && cuenta ? { cuentaId: cuenta.id } : {}),
        usos,
        motivo: motivo.trim(),
      }),
    onSuccess: async () => {
      aviso.exito("IA en pausa", "Se reanuda desde esta misma pantalla.");
      await qc.invalidateQueries({ queryKey: ["plataforma"] });
      alCerrar();
    },
    onError: (e) => aviso.falla(e),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && alCerrar()}>
      <DialogContent>
        <DialogHeader>
          <div>
            <DialogTitle>Pausar la IA</DialogTitle>
            <DialogDescription>
              Los clientes ven que el asistente está en pausa. Nada de su
              contabilidad se afecta.
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-5">
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0 text-sm">
            <legend className="mb-1.5 font-medium">Para quién</legend>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={alcance === "UNA"}
                onChange={() => setAlcance("UNA")}
                className="accent-foreground"
              />
              Una cuenta
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={alcance === "TODAS"}
                onChange={() => setAlcance("TODAS")}
                className="accent-foreground"
              />
              Todas las cuentas
            </label>
          </fieldset>
          {alcance === "UNA" && (
            <ElegirCuenta valor={cuenta} alElegir={setCuenta} />
          )}
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0 text-sm">
            <legend className="mb-1.5 font-medium">Qué se pausa</legend>
            {Object.entries(USOS).map(([k, v]) => (
              <label key={k} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="size-4 accent-foreground"
                  checked={usos.includes(k)}
                  onChange={(e) =>
                    setUsos(
                      e.target.checked
                        ? [...usos, k]
                        : usos.filter((x) => x !== k),
                    )
                  }
                />
                {v}
              </label>
            ))}
          </fieldset>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Motivo</span>
            <Input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Falla del proveedor"
            />
          </label>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button
            disabled={!listo || guardar.isPending}
            onClick={() => guardar.mutate()}
          >
            {guardar.isPending && <Loader2 className="animate-spin" />}
            Pausar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** `datetime-local` usa la hora del navegador; se manda en ISO. */
const localAhora = (masHoras = 0) => {
  const d = new Date(Date.now() + masHoras * 3_600_000);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset(), 0, 0);
  return d.toISOString().slice(0, 16);
};

function DialogoAnuncio({ alCerrar }: { alCerrar: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    titulo: "",
    cuerpo: "",
    tono: "INFORMATIVO",
    desde: localAhora(),
    hasta: localAhora(24),
  });
  const [cuenta, setCuenta] = useState<{ id: string; nombre: string } | null>(
    null,
  );
  const [paraTodas, setParaTodas] = useState(true);
  const valido =
    f.titulo.trim().length >= 3 &&
    f.cuerpo.trim().length >= 3 &&
    f.desde !== "" &&
    f.hasta > f.desde &&
    (paraTodas || cuenta !== null);

  const guardar = useMutation({
    mutationFn: () =>
      plataformaService.publicarAnuncio({
        titulo: f.titulo.trim(),
        cuerpo: f.cuerpo.trim(),
        tono: f.tono,
        desde: new Date(f.desde).toISOString(),
        hasta: new Date(f.hasta).toISOString(),
        ...(paraTodas || !cuenta ? {} : { cuentas: [cuenta.id] }),
      }),
    onSuccess: async () => {
      aviso.exito("Anuncio publicado");
      await qc.invalidateQueries({ queryKey: ["plataforma", "anuncios"] });
      alCerrar();
    },
    onError: (e) => aviso.falla(e),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && alCerrar()}>
      <DialogContent size="lg">
        <DialogHeader>
          <div>
            <DialogTitle>Nuevo anuncio</DialogTitle>
            <DialogDescription>
              Sale como una franja arriba en el sistema de los clientes.
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody className="grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium">Título</span>
            <Input
              value={f.titulo}
              onChange={(e) => setF({ ...f, titulo: e.target.value })}
              maxLength={120}
              placeholder="Mantenimiento programado"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium">Texto</span>
            <Textarea
              value={f.cuerpo}
              onChange={(e) => setF({ ...f, cuerpo: e.target.value })}
              maxLength={600}
              rows={3}
              placeholder="El domingo 27 de 2:00 a 4:00 a. m. el sistema no estará disponible."
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Tipo</span>
            <select
              className={campo}
              value={f.tono}
              onChange={(e) => setF({ ...f, tono: e.target.value })}
            >
              <option value="INFORMATIVO">Novedad</option>
              <option value="MANTENIMIENTO">Mantenimiento</option>
            </select>
          </label>
          <div className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Para</span>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4 accent-foreground"
                checked={paraTodas}
                onChange={(e) => setParaTodas(e.target.checked)}
              />
              Todas las cuentas
            </label>
            {!paraTodas && <ElegirCuenta valor={cuenta} alElegir={setCuenta} />}
          </div>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Desde</span>
            <Input
              type="datetime-local"
              value={f.desde}
              onChange={(e) => setF({ ...f, desde: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Hasta</span>
            <Input
              type="datetime-local"
              value={f.hasta}
              onChange={(e) => setF({ ...f, hasta: e.target.value })}
            />
          </label>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button
            disabled={!valido || guardar.isPending}
            onClick={() => guardar.mutate()}
          >
            {guardar.isPending && <Loader2 className="animate-spin" />}
            Publicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
