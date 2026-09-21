import { Destello, Marca, Visto } from "@/modules/landing/components/Marca";
import styles from "../login.module.css";

/**
 * El panel oscuro del login: marca arriba, el collage en el medio, la promesa
 * abajo.
 *
 * Reemplaza al collage de ilustraciones que había antes. El cambio no es solo
 * de estilo: lo que se muestra ahora es el producto —un asiento real que
 * cuadra, un ingreso que sube, el asistente reportando una conciliación—, no
 * una escena genérica de gente trabajando con datos.
 *
 * `aria-hidden` sobre el collage: es decorativo y su contenido está en el
 * titular de abajo. Se oculta entero por debajo de `md`, donde le robaría la
 * pantalla al formulario, que es lo que la persona vino a usar.
 *
 * Toma las piezas de marca de `modules/landing`: el logo, el destello y el
 * visto son los mismos de la cara pública. Entrar al sistema tiene que
 * parecerse a lo que la landing prometió.
 */

const ASIENTO = [
  { cuenta: "1105", nombre: "Caja", debe: "1.190.000", haber: "", retraso: styles.r2 },
  { cuenta: "4135", nombre: "Ventas", debe: "", haber: "1.000.000", retraso: styles.r3 },
  { cuenta: "2408", nombre: "IVA", debe: "", haber: "190.000", retraso: styles.r4 },
];

/** Las barras del mes. La última es la del mes en curso: es la única naranja. */
const BARRAS = [42, 58, 50, 72, 66, 100];

export function PanelMarcaLogin() {
  return (
    <section
      className={`${styles.trama} order-1 hidden flex-col justify-between p-12 text-rail-foreground md:flex`}
    >
      <div className={styles.fade}>
        <Marca invertido />
      </div>

      <div
        aria-hidden="true"
        className="relative mx-auto hidden h-[450px] w-full max-w-[560px] lg:block"
      >
        {/* El asiento: la pieza principal, arriba a la izquierda */}
        <div
          className={`${styles.cardA} absolute top-0 left-0 flex w-[440px] flex-col gap-4 rounded-lg border border-rail-line bg-rail-foreground/5 p-5 font-mono text-[13px]`}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-rail-foreground">Asiento 0142</span>
            <span
              className={`${styles.pop} flex items-center gap-1.5 rounded-full border border-success/40 bg-success/15 px-2.5 py-0.5 font-sans text-xs font-medium text-secondary`}
            >
              <Visto size={12} strokeWidth={2.5} />
              Cuadra
            </span>
          </div>
          <div className="flex flex-col">
            <div
              className={`${styles.row} ${styles.r1} grid grid-cols-[2fr_1fr_1fr] border-b border-rail-line pb-2 text-[11px] uppercase tracking-[0.8px] text-rail-muted`}
            >
              <span>Cuenta</span>
              <span className="text-right">Debe</span>
              <span className="text-right">Haber</span>
            </div>
            {ASIENTO.map(({ cuenta, nombre, debe, haber, retraso }) => (
              <div
                key={cuenta}
                className={`${styles.row} ${retraso} grid grid-cols-[2fr_1fr_1fr] border-b border-rail-line py-2.5 text-secondary`}
              >
                <span>
                  <span className="text-rail-muted">{cuenta}</span> {nombre}
                </span>
                <span className="text-right">{debe}</span>
                <span className="text-right">{haber}</span>
              </div>
            ))}
            <div
              className={`${styles.row} ${styles.r5} grid grid-cols-[2fr_1fr_1fr] pt-2.5 font-medium text-rail-foreground`}
            >
              <span>Sumas</span>
              <span className="text-right">1.190.000</span>
              <span className="text-right">1.190.000</span>
            </div>
          </div>
        </div>

        {/* Los ingresos del mes, a la derecha y debajo del asiento. Antes iba
            encima (`top-[150px]`) y tapaba la columna Haber justo donde están
            los números —van alineados a la derecha—, y como las tarjetas son
            translúcidas se leían a través: «Ingresos por mes» sobre «190.000».
            El asiento termina en 255 px: esta arranca después. */}
        <div
          className={`${styles.cardB} ${styles.sombraFlotante} absolute top-[266px] right-0 flex w-[250px] flex-col gap-4 rounded-lg border border-rail-line bg-rail-foreground/5 p-4.5`}
        >
          <span className="text-xs text-rail-muted">Ingresos por mes</span>
          <div className="flex h-24 items-end gap-2.5">
            {BARRAS.map((alto, i) => (
              <div
                key={i}
                style={{ height: `${alto}%` }}
                className={`grow rounded-[0.3rem] ${
                  i === BARRAS.length - 1 ? "bg-brand" : "bg-rail-line"
                }`}
              />
            ))}
          </div>
        </div>

        {/* El asistente, abajo: escribe y después reporta. 276 px y no 310:
            con 310 llegaba a x 334 y se montaba sobre los ingresos, que
            empiezan en x 310. */}
        <div
          className={`${styles.cardC} ${styles.sombraFlotanteFuerte} absolute bottom-0 left-6 flex w-[276px] flex-col gap-3 rounded-lg border border-rail-line bg-rail-foreground/5 px-4.5 py-4`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Destello size={16} className="text-brand" />
              <span className="text-xs font-medium text-secondary">Asistente IA</span>
            </div>
            <span className="text-[11px] text-rail-muted">ahora</span>
          </div>
          <div className="relative min-h-15">
            <div
              className={`${styles.typing} absolute top-1 left-0 flex gap-1.5 rounded-[0.6rem] bg-rail-foreground/10 px-3 py-2.5`}
            >
              <span className={`${styles.dot} size-1.5 rounded-full bg-rail-muted`} />
              <span
                className={`${styles.dot} ${styles.dot2} size-1.5 rounded-full bg-rail-muted`}
              />
              <span
                className={`${styles.dot} ${styles.dot3} size-1.5 rounded-full bg-rail-muted`}
              />
            </div>
            <p className={`${styles.msg} m-0 text-[13px] leading-[1.55] text-secondary`}>
              Concilié 24 movimientos del extracto bancario. 2 necesitan tu revisión.
            </p>
          </div>
          <div className={`${styles.msg2} flex gap-2`}>
            <span className="rounded-[0.45rem] bg-secondary px-3 py-1.5 text-xs font-medium text-rail">
              Revisar
            </span>
            <span className="rounded-[0.45rem] border border-rail-line px-3 py-1.5 text-xs font-medium text-rail-muted">
              Ver resumen
            </span>
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
          Contabilidad, facturación e impuestos, con un asistente de IA que concilia, clasifica
          y te avisa lo que necesita tu ojo.
        </p>
      </div>
    </section>
  );
}
