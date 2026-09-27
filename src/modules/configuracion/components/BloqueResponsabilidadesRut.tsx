"use client";

import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectorResponsabilidadRut } from "@/modules/catalogos/components/SelectorResponsabilidadRut";
import { Bloque } from "./Bloque";
import { CONTROL, FilaVigencia, ListaVigencia, Pildora } from "./Comunes";
import { Campo } from "./Campo";
import { useGuardar } from "../hooks/useGuardar";
import { legalApi } from "../services/nucleo.service";

// Vivía en «Situación legal». Desde el paso «Impuestos» (plan motor de
// retenciones, §0.7.3) va plegado bajo «Ver los códigos del RUT»: las preguntas
// en lenguaje simple escriben estos mismos códigos, y el contador que prefiera
// la lista técnica la sigue teniendo.

const HOY = new Date().toISOString().slice(0, 10);
const FECHA = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato AAAA-MM-DD");

const esquemaResponsabilidad = z.object({
  codigo: z
    .number({ message: "Elegí una responsabilidad del RUT" })
    .int()
    .min(1),
  fechaInicio: FECHA,
});

/**
 * Las responsabilidades vigentes, y qué significa cada una hoy.
 *
 * Un código suprimido se veía igual que cualquier otro —"11 · Ventas régimen
 * común"— pero el motor lo trata como el vigente que lo reemplazó, porque eso
 * es lo que dice la DIAN. Resultado: el plan de cuentas proponía IVA a quien
 * miraba su lista y no veía IVA por ningún lado.
 *
 * Ahora el reemplazo va escrito. La regla no cambió; lo que cambió es que se ve.
 */
function ResponsabilidadesVigentes({
  filas,
}: {
  filas: Array<Record<string, unknown>>;
}) {
  if (filas.length === 0) return null;

  return (
    <ListaVigencia>
      {filas.map((f) => {
        const suprimido = f.codigo_vigente === false;
        const reemplazo = f.codigo_reemplazo as number | null;
        const fe = f.codigo_dian_fe as string | null;

        return (
          <FilaVigencia
            key={String(f.id)}
            codigo={String(f.codigo)}
            nombre={String(f.descripcion ?? "")}
            /* El tachado y el "usa el código X" los pone `FilaVigencia`: el
               código sigue ahí porque el RUT lo dice, pero el motor trata el
               reemplazo, y verlo tachado es lo que evita buscar IVA en una
               lista donde el IVA está bajo otro número. */
            suprimida={suprimido && reemplazo !== null ? String(reemplazo) : undefined}
            etiquetas={
              /* Solo seis de las 48 viajan en el XML de la factura. Verlo acá
                 ahorra ir a buscarlo al anexo técnico. */
              fe ? <Pildora>Va en la factura · {fe}</Pildora> : undefined
            }
          />
        );
      })}
    </ListaVigencia>
  );
}

/**
 * La casilla 53 del RUT, tal como la imprime la DIAN.
 *
 * Es lo único que se captura de la situación tributaria. Antes había además una
 * sección "Condición tributaria" con su propia lista: la misma verdad pedida dos
 * veces, en dos vocabularios, y sin nada que impidiera contradecirse. Ahora se
 * carga el RUT y el backend deriva la condición que el motor de impuestos
 * necesita —el código 48 abre RESPONSABLE_IVA y con eso enciende las cuentas de
 * IVA en el plan—.
 *
 * Ninguno de los cuarenta y ocho códigos está escrito acá: salen de
 * `responsabilidad_tributaria` y se buscan por número o por descripción.
 */
export function BloqueResponsabilidades({ pendiente }: { pendiente: boolean }) {
  const { data: filas = [] } = useQuery({
    queryKey: ["responsabilidades-empresa"],
    queryFn: legalApi.responsabilidadesRut,
  });
  const vigentes = filas.filter((f) => f.fecha_fin === null);

  const form = useForm<z.infer<typeof esquemaResponsabilidad>>({
    resolver: zodResolver(esquemaResponsabilidad),
    defaultValues: { fechaInicio: HOY },
  });

  const guardar = useGuardar<z.infer<typeof esquemaResponsabilidad>>({
    fn: (d) => legalApi.abrirResponsabilidadRut(d),
    exito: "Responsabilidad registrada",
    invalidar: [
      ["responsabilidades-empresa"],
      ["plan-cuentas", "sugerencia"],
      ["empresa-impuestos"],
    ],
    // El código se limpia y la fecha queda: un RUT trae varias responsabilidades
    // y todas empiezan a regir el mismo día.
    alTerminar: () =>
      form.reset({ fechaInicio: form.getValues("fechaInicio") }),
  });

  const errores = form.formState.errors;
  const codigo = form.watch("codigo");

  return (
    <Bloque
      titulo="Responsabilidades del RUT"
      descripcion="La casilla 53, tal como la imprime la DIAN. De acá sale si la empresa cobra IVA, si retiene y bajo qué régimen declara."
      pendiente={pendiente}
    >
      <ResponsabilidadesVigentes filas={vigentes} />

      <div className="grid items-end gap-3 sm:grid-cols-[1fr_152px_auto]">
        <Campo
          id="responsabilidad"
          etiqueta="Responsabilidad, calidad o atributo"
          error={errores.codigo?.message}
        >
          <SelectorResponsabilidadRut
            className={CONTROL}
            id="responsabilidad"
            valor={codigo ?? null}
            invalido={Boolean(errores.codigo)}
            yaRegistrados={vigentes.map((f) => Number(f.codigo))}
            onCambio={(c) =>
              form.setValue("codigo", c, { shouldValidate: true })
            }
          />
        </Campo>

        <Campo
          id="respDesde"
          etiqueta="Vigente desde"
          error={errores.fechaInicio?.message}
        >
          <Input
            id="respDesde"
            className="font-mono"
            {...form.register("fechaInicio")}
          />
        </Campo>

        <Button
          variant="outline"
          onClick={form.handleSubmit((d) => guardar.mutate(d))}
          disabled={guardar.isPending}
        >
          <Plus className="size-4" />
          Agregar
        </Button>
      </div>
    </Bloque>
  );
}
