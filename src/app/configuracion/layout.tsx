// El asistente ocupa la pantalla entera: no lleva la barra del area de trabajo.
// Es una tarea con principio y fin, y el resto del sistema esperaria a que
// termine de todas formas.
export default function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-background">{children}</div>;
}
