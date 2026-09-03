import { AuthIlustracionPanel } from "@/modules/auth/components/AuthIlustracionPanel";

// En móvil la ilustración va arriba y el formulario abajo (order), pero en el DOM
// el formulario sigue primero: es lo que importa y el panel es decorativo. La fila
// de la ilustración es `auto` y la del formulario `1fr`, así el panel ocupa lo suyo
// y nunca empuja los campos fuera de la pantalla.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh grid-cols-1 grid-rows-[auto_1fr] md:grid-cols-[2fr_3fr] md:grid-rows-1">
      <main className="order-2 flex items-center justify-center px-6 py-10 sm:px-12 md:order-1 md:py-16 lg:px-16">
        <div className="w-full max-w-sm">{children}</div>
      </main>
      <AuthIlustracionPanel />
    </div>
  );
}
