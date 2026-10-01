import { Maria } from "@/modules/asistente/components/Maria";
import { Marca } from "@/modules/landing/components/Marca";
import styles from "../login.module.css";

/**
 * El panel oscuro del login: marca arriba, el collage en el medio, la promesa
 * abajo.
 *
 * El collage muestra el producto, no una escena genérica: María reportando una
 * conciliación, y dos gráficos que cuentan lo mismo que ella dice. Antes la
 * pieza principal era un asiento contable en tabla; el dueño pidió el 25 sep
 * de 2026 que el protagonismo fuera de María y de los gráficos.
 *
 * `aria-hidden` sobre el collage: es decorativo y su contenido está en el
 * titular de abajo. Se oculta por debajo de `lg`, donde le robaría la pantalla
 * al formulario, que es lo que la persona vino a usar.
 *
 * Va en columna y no con posiciones a mano: las tarjetas ya no se pisan entre
 * ellas ni con el titular.
 *
 * Toma las piezas de marca de `modules/landing`: el logo es el mismo de la cara
 * pública. Entrar al sistema tiene que parecerse a lo que la landing prometió.
 */

/** Los ingresos de los últimos seis meses. El último es el mes en curso: el único naranja. */
const BARRAS = [
  { mes: "A", alto: 42 },
  { mes: "M", alto: 58 },
  { mes: "J", alto: 50 },
  { mes: "J", alto: 72 },
  { mes: "A", alto: 66 },
  { mes: "S", alto: 100 },
];

/** La misma conciliación que reporta María: 24 movimientos, 2 por revisar. */
const CONCILIADOS = 24;
const MOVIMIENTOS = 26;

export function PanelMarcaLogin() {
  return (
    <section
      className={`${styles.trama} order-1 hidden flex-col justify-between gap-10 p-12 text-rail-foreground md:flex`}
    >
      <div className={styles.fade}>
        <Marca invertido />
      </div>

      <div aria-hidden="true" className="mx-auto hidden w-full max-w-[540px] flex-col gap-4 lg:flex">
        {/* María: la pieza principal. Grande —a 64 px se ven su aura y la
            mano—, saludando, que es lo que hace al abrir una conversación. */}
        <div
          className={`${styles.cardA} ${styles.sombraFlotanteFuerte} flex items-start gap-5 rounded-xl border border-rail-line bg-rail-foreground/5 px-6 py-5`}
        >
          {/* El panel es oscuro en los dos temas, así que la cara va clara en
              los dos. `invertida` no alcanza: invierte según el tema, y en
              oscuro la dejaba negra sobre negro. Se fijan sus dos tintas
              para este panel y nada más. */}
          <span className="mt-1 ml-1 flex [--primary-foreground:var(--neutral-900)] [--primary:var(--neutral-0)]">
            <Maria estado="reposo" tamano={64} intensidad="suave" saluda />
          </span>
          <div className="flex min-w-0 grow flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-rail-foreground">María</span>
              <span className="text-[11px] text-rail-muted">ahora</span>
            </div>
            <div className="relative min-h-[46px]">
              <div
                className={`${styles.typing} absolute top-0 left-0 flex gap-1.5 rounded-[0.6rem] bg-rail-foreground/10 px-3 py-2.5`}
              >
                <span className={`${styles.dot} size-1.5 rounded-full bg-rail-muted`} />
                <span className={`${styles.dot} ${styles.dot2} size-1.5 rounded-full bg-rail-muted`} />
                <span className={`${styles.dot} ${styles.dot3} size-1.5 rounded-full bg-rail-muted`} />
              </div>
              <p className={`${styles.msg} m-0 text-[15px] leading-[1.55] text-rail-foreground`}>
                Concilié 24 movimientos del extracto bancario. 2 necesitan su revisión.
              </p>
            </div>
            <div className={`${styles.msg2} flex gap-2`}>
              <span className="rounded-[0.45rem] bg-rail-foreground px-3 py-1.5 text-xs font-medium text-rail">
                Revisar
              </span>
              <span className="rounded-[0.45rem] border border-rail-line px-3 py-1.5 text-xs font-medium text-rail-muted">
                Ver resumen
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[3fr_2fr] gap-4">
          {/* Ingresos por mes: barras con su mes debajo. Crecen desde la base,
              una tras otra. */}
          <div
            className={`${styles.cardB} ${styles.sombraFlotante} flex flex-col gap-4 rounded-xl border border-rail-line bg-rail-foreground/5 p-5`}
          >
            <span className="text-xs text-rail-muted">Ingresos por mes</span>
            <div className="flex flex-col gap-2">
              <div className="flex h-32 items-end gap-2">
                {BARRAS.map(({ alto }, i) => (
                  <div
                    key={i}
                    style={{ height: `${alto}%`, animationDelay: `${700 + i * 70}ms` }}
                    className={`${styles.barra} grow rounded-t-[4px] ${
                      i === BARRAS.length - 1 ? "bg-brand" : "bg-rail-line"
                    }`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                {BARRAS.map(({ mes }, i) => (
                  <span
                    key={i}
                    className={`grow basis-0 text-center font-mono text-[10px] ${
                      i === BARRAS.length - 1 ? "text-rail-foreground" : "text-rail-muted"
                    }`}
                  >
                    {mes}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Conciliación: el aro cuenta lo mismo que el mensaje de María. */}
          <div
            className={`${styles.cardD} ${styles.sombraFlotante} flex flex-col gap-3 rounded-xl border border-rail-line bg-rail-foreground/5 p-5`}
          >
            <span className="text-xs text-rail-muted">Conciliación</span>
            <div className="flex grow flex-col items-center justify-center gap-2">
              <AroConciliacion />
              <span className="text-[11px] text-rail-muted">
                {MOVIMIENTOS - CONCILIADOS} por revisar
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={`${styles.up} ${styles.d3} flex flex-col gap-2.5`}>
        {/* Inter, no la serif de la landing: el prototipo del login no la carga.
            Adentro del sistema manda `--font-heading`, y este panel ya es
            adentro — es la primera pantalla del producto, no la última de la
            venta. */}
        <h2 className="m-0 text-[clamp(1.75rem,3.5vw,2.25rem)] font-semibold leading-[1.1] tracking-[-1px]">
          Cada asiento, cuadrado.
        </h2>
        <p className="m-0 max-w-[420px] text-[15px] leading-relaxed text-rail-muted">
          Contabilidad, facturación e impuestos, con María: la asistente de IA que concilia,
          clasifica y le avisa lo que requiere su atención.
        </p>
      </div>
    </section>
  );
}

/**
 * El aro de 24 de 26. Arranca en las doce y avanza en sentido horario, como el
 * arco de avance de María: la misma forma para la misma idea.
 */
function AroConciliacion() {
  const radio = 36;
  const circunferencia = 2 * Math.PI * radio;
  const hecho = (CONCILIADOS / MOVIMIENTOS) * circunferencia;
  return (
    <div className="relative size-[92px]">
      <svg width="92" height="92" viewBox="0 0 92 92" fill="none">
        <circle cx="46" cy="46" r={radio} className="stroke-rail-line" strokeWidth="7" />
        <circle
          cx="46"
          cy="46"
          r={radio}
          className={`${styles.aro} stroke-brand`}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${hecho} ${circunferencia}`}
          transform="rotate(-90 46 46)"
          style={{ ["--aro-desde" as string]: `${hecho}` }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-[15px] font-medium text-rail-foreground">
        {CONCILIADOS}/{MOVIMIENTOS}
      </span>
    </div>
  );
}
