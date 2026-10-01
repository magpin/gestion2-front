import { CORREO_SOPORTE, PaginaLegal, PorCompletar } from "../components/PaginaLegal";

/**
 * Política de tratamiento de datos personales (Ley 1581 de 2012 y Decreto 1377
 * de 2013, compilado en el Decreto 1074 de 2015).
 *
 * BORRADOR redactado contra lo que el sistema hace hoy (25 sep 2026): RLS por
 * empresa, AES-256-GCM en credenciales DIAN, lectura de documentos con un
 * proveedor de IA en EE.UU. Tiene que revisarlo un abogado antes de publicarse
 * en producción, y completar lo marcado con `PorCompletar`.
 */
export function TratamientoDatosView() {
  return (
    <PaginaLegal titulo="Política de tratamiento de datos personales" vigencia="[por definir]">
      <section>
        <h2>1. Quién es el responsable</h2>
        <p>
          <strong>ERP Gestión</strong> es operado por <PorCompletar>razón social</PorCompletar>, NIT{" "}
          <PorCompletar>NIT</PorCompletar>, con domicilio en <PorCompletar>dirección y ciudad</PorCompletar>,
          Colombia. Correo para temas de datos personales: <strong>{CORREO_SOPORTE}</strong>. Teléfono:{" "}
          <PorCompletar>teléfono</PorCompletar>.
        </p>
        <p>
          Esta política cumple la Ley 1581 de 2012, el Decreto 1377 de 2013 (compilado en el
          Decreto 1074 de 2015) y las demás normas que las modifiquen o complementen.
        </p>
      </section>

      <section>
        <h2>2. En qué calidad tratamos los datos</h2>
        <p>ERP Gestión trata datos personales en dos calidades distintas:</p>
        <ul>
          <li>
            <strong>Como responsable</strong>, de los datos de las personas que usan el sistema:
            nombre, correo, rol, empresas a las que tienen acceso y registros de uso y seguridad.
          </li>
          <li>
            <strong>Como encargado</strong>, de los datos que cada empresa cliente carga en el
            sistema para llevar su contabilidad: sus terceros (clientes, proveedores, empleados),
            facturas, soportes y demás documentos. En ese caso la empresa cliente es la
            responsable, y ERP Gestión los trata solo por cuenta de ella y según sus instrucciones.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Qué datos tratamos</h2>
        <ul>
          <li>
            <strong>De los usuarios:</strong> nombre, correo electrónico, contraseña (guardada de
            forma irreversible, nunca en texto), rol, empresas asignadas, fecha y hora de acceso y
            acciones hechas en el sistema.
          </li>
          <li>
            <strong>De las empresas clientes y sus terceros:</strong> razón social o nombre,
            documento de identidad o NIT, dirección, teléfono, correo, responsabilidades
            tributarias, y la información de las facturas, pedidos, extractos y demás documentos
            que se registran o se suben.
          </li>
          <li>
            <strong>Credenciales ante la DIAN</strong> (certificado y PIN), cuando la empresa las
            carga para su numeración.
          </li>
        </ul>
        <p>
          No pedimos datos sensibles ni datos de menores de edad. Si aparecen en un documento que
          sube la empresa, se tratan solo como parte de ese documento y bajo la responsabilidad de
          quien lo sube.
        </p>
      </section>

      <section>
        <h2>4. Para qué los usamos</h2>
        <ul>
          <li>Crear y administrar las cuentas y el acceso de cada persona según su rol.</li>
          <li>
            Prestar el servicio contable: registrar ventas, compras, pagos, inventario y asientos,
            y generar libros y reportes.
          </li>
          <li>
            Que María, la asistente de inteligencia artificial, lea los documentos que le suben,
            responda preguntas sobre la información de la empresa y proponga registros. María
            propone; los registros los aprueba siempre una persona.
          </li>
          <li>Dar soporte, avisar sobre el servicio y atender consultas y reclamos.</li>
          <li>Proteger la seguridad del sistema, prevenir fraudes y cumplir obligaciones legales.</li>
        </ul>
        <p>No vendemos ni alquilamos datos personales, ni los usamos para publicidad de terceros.</p>
      </section>

      <section>
        <h2>5. Inteligencia artificial y proveedores fuera de Colombia</h2>
        <p>
          Para leer documentos y responder preguntas, María envía el contenido necesario a un
          proveedor de inteligencia artificial (Anthropic, PBC, en Estados Unidos). Ese proveedor
          lo procesa solo para devolver la respuesta,{" "}
          <PorCompletar>
            confirmar con su contrato: sin usarlo para entrenar sus modelos y con los plazos de
            retención que aplican
          </PorCompletar>
          .
        </p>
        <p>
          Los datos se almacenan en servidores de <PorCompletar>proveedor de alojamiento y país</PorCompletar>.
        </p>
        <p>
          Estas transmisiones internacionales se hacen con proveedores que ofrecen niveles
          adecuados de protección y con contratos que los obligan a tratar los datos solo para
          prestar el servicio, conforme al artículo 26 de la Ley 1581 de 2012 y a las instrucciones
          de la Superintendencia de Industria y Comercio.
        </p>
      </section>

      <section>
        <h2>6. Cómo los protegemos</h2>
        <ul>
          <li>
            La información de cada empresa queda aislada de la de las demás en la base de datos,
            incluso dentro de una misma cuenta.
          </li>
          <li>Las credenciales ante la DIAN se guardan cifradas.</li>
          <li>Cada persona ve solo lo que su rol le permite.</li>
          <li>Las conexiones van cifradas y la sesión se cierra a las 8 horas.</li>
          <li>
            Hay respaldos diarios de la base de datos, y cada documento guarda una huella que
            permite comprobar que no fue alterado.
          </li>
        </ul>
      </section>

      <section>
        <h2>7. Sus derechos como titular</h2>
        <p>Según el artículo 8 de la Ley 1581 de 2012, usted tiene derecho a:</p>
        <ol>
          <li>Conocer, actualizar y rectificar sus datos.</li>
          <li>Pedir prueba de la autorización que otorgó, salvo cuando la ley no la exija.</li>
          <li>Saber qué uso se le ha dado a sus datos.</li>
          <li>
            Presentar quejas ante la Superintendencia de Industria y Comercio, después de haber
            agotado el trámite de consulta o reclamo ante nosotros.
          </li>
          <li>
            Revocar la autorización o pedir que se supriman sus datos, cuando no exista un deber
            legal o contractual de conservarlos.
          </li>
          <li>Acceder gratis a sus datos personales.</li>
        </ol>
        <p>
          Si sus datos los cargó una empresa cliente (por ejemplo, porque usted es su proveedor),
          esa empresa es la responsable: puede dirigirse a ella, o escribirnos y le trasladamos su
          solicitud.
        </p>
      </section>

      <section>
        <h2>8. Cómo hacer una consulta o un reclamo</h2>
        <p>
          Escriba a <strong>{CORREO_SOPORTE}</strong> con su nombre, su documento de identidad, lo
          que solicita y cómo contactarlo.
        </p>
        <ul>
          <li>
            <strong>Consultas:</strong> respondemos en máximo 10 días hábiles. Si no alcanzamos, le
            avisamos el motivo y respondemos en máximo 5 días hábiles más.
          </li>
          <li>
            <strong>Reclamos</strong> (corregir, actualizar, suprimir o revocar): respondemos en
            máximo 15 días hábiles, prorrogables 8 días hábiles más con aviso. Si el reclamo está
            incompleto, le pedimos lo que falta dentro de los 5 días siguientes; si pasan 2 meses
            sin que lo complete, se entiende que desistió.
          </li>
        </ul>
      </section>

      <section>
        <h2>9. Autorización y conservación</h2>
        <p>
          Al crear la cuenta, la persona autoriza el tratamiento de sus datos según esta política.
          Conservamos los datos mientras la cuenta esté activa y después durante el tiempo que
          exijan las normas contables, tributarias y comerciales (los libros y soportes contables
          se conservan por el término que fije la ley). Al terminar, se suprimen o se anonimizan.
        </p>
      </section>

      <section>
        <h2>10. Cambios a esta política</h2>
        <p>
          Si cambiamos algo sustancial, lo avisamos en el sistema y por correo antes de que empiece
          a regir. <PorCompletar>Registro Nacional de Bases de Datos: confirmar si aplica y el número</PorCompletar>.
        </p>
      </section>
    </PaginaLegal>
  );
}
