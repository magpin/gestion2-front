import { PanelMarcaLogin } from "@/modules/auth/components/PanelMarcaLogin";

// El panel de marca a la izquierda y el formulario a la derecha, como en el
// diseño. En el DOM el formulario va primero —es lo que la persona vino a usar,
// y el panel es decorativo— y `order` los acomoda: así el teclado y los
// lectores de pantalla llegan a los campos sin atravesar el collage.
//
// Por debajo de `md` el panel no se reordena: desaparece. Antes iba arriba en
// móvil, pero el collage de ahora son tres tarjetas superpuestas de 450px de
// alto; encogerlas hasta que quepan las vuelve ilegibles, y dejarlas empuja los
// campos fuera de la pantalla. Una pantalla de entrada tiene un solo trabajo.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh grid-cols-1 md:grid-cols-[680px_1fr]">
      <main className="order-2 flex flex-col px-6 py-10 sm:px-12 md:py-12 lg:px-16">
        {children}
      </main>
      <PanelMarcaLogin />
    </div>
  );
}
