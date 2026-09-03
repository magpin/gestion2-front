"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, Loader2, RefreshCw } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampoPassword } from "@/components/shared/CampoPassword";
import { Campo } from "@/modules/configuracion/components/Campo";
import { CromoPlataforma } from "../components/CromoPlataforma";
import { plataformaService } from "../services/plataforma.service";

const esquema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(12, "Mínimo 12 caracteres"),
});

type Datos = z.infer<typeof esquema>;

/** Alfabeto sin caracteres que se confundan al dictarla: sin l, I, 0, O. */
function generarClave(): string {
  const alfabeto = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
}

/**
 * Dar de alta a un cliente: correo y contraseña.
 *
 * De la empresa no se pregunta nada. El NIT, el marco NIIF y la fecha de inicio
 * de operaciones los sabe el contador del cliente, no quien vende el sistema, y
 * preguntarlos en la venta lleva a inventarlos. El director crea su empresa
 * cuando entra, y ahí queda como su director.
 */
export function CrearCuentaView() {
  const router = useRouter();
  const [creado, setCreado] = useState<Datos | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<Datos>({
    resolver: zodResolver(esquema),
    defaultValues: { email: "", password: generarClave() },
  });

  const crear = form.handleSubmit(async (d) => {
    setError(null);
    try {
      await plataformaService.crearCuenta({ email: d.email, password: d.password });
      setCreado(d);
    } catch (e) {
      const cuerpo = (e as { response?: { data?: { message?: string; error?: string } } })?.response
        ?.data;
      setError(cuerpo?.message ?? cuerpo?.error ?? "No se pudo crear la cuenta");
    }
  });

  if (creado) {
    return (
      <CromoPlataforma>
        <div className="mx-auto flex max-w-md flex-col gap-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-muted text-success">
              <Check className="size-5" strokeWidth={3} />
            </span>
            <h1 className="text-xl font-semibold tracking-tight">Cuenta creada</h1>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Entrégale estos datos — no se vuelven a mostrar
            </p>
            <div className="flex flex-col gap-1 font-mono text-sm">
              <span className="select-all">{creado.email}</span>
              <span className="select-all font-semibold">{creado.password}</span>
            </div>
            <Button
              variant="outline"
              className="self-start"
              onClick={async () => {
                await navigator.clipboard.writeText(`${creado.email}\n${creado.password}`);
                setCopiado(true);
              }}
            >
              {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copiado ? "Copiado" : "Copiar"}
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Al entrar creará su empresa y quedará como director.
          </p>

          <div className="flex gap-2">
            <Button onClick={() => router.push("/plataforma")}>Ver cuentas</Button>
            <Button
              variant="ghost"
              onClick={() => {
                setCreado(null);
                setCopiado(false);
                form.reset({ email: "", password: generarClave() });
              }}
            >
              Crear otra
            </Button>
          </div>
        </div>
      </CromoPlataforma>
    );
  }

  return (
    <CromoPlataforma>
      <form onSubmit={crear} className="mx-auto flex max-w-md flex-col gap-5" noValidate>
        <h1 className="text-xl font-semibold tracking-tight">Nueva cuenta</h1>

        <Campo id="email" etiqueta="Correo" error={form.formState.errors.email?.message}>
          <Input id="email" type="email" autoComplete="off" {...form.register("email")} />
        </Campo>

        <Campo
          id="password"
          etiqueta="Contraseña"
          ayuda="Generada. Se puede editar."
          error={form.formState.errors.password?.message}
        >
          <div className="flex gap-2">
            <CampoPassword
              id="password"
              autoComplete="new-password"
              className="font-mono"
              {...form.register("password")}
            />
            <Button
              type="button"
              variant="outline"
              aria-label="Generar otra contraseña"
              onClick={() => form.setValue("password", generarClave())}
            >
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </Campo>

        {error && (
          <span role="alert" className="text-xs text-danger">
            {error}
          </span>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Crear cuenta
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/plataforma")}>
            Cancelar
          </Button>
        </div>
      </form>
    </CromoPlataforma>
  );
}
