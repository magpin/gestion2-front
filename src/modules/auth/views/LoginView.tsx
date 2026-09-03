"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CampoPassword } from "@/components/shared/CampoPassword";
import { Button } from "@/components/ui/button";
import { loginSchema, type LoginFormData } from "@/lib/validators";
import { useLogin } from "../hooks/useAuth";
import { sesionPlataforma } from "@/modules/plataforma/services/plataforma.service";

export function LoginView() {
  const login = useLogin();
  const router = useRouter();

  // El proxy no puede saberlo: la sesión de plataforma vive en localStorage y él
  // solo ve cookies. Sin esto, un administrador que vuelve tendría que escribir
  // la clave otra vez pese a tener sesión abierta.
  useEffect(() => {
    if (sesionPlataforma.token()) router.replace("/plataforma");
  }, [router]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: LoginFormData) => login.mutate(data);

  return (
    <div className="w-full">
      <div className="mb-12 flex items-center gap-2 text-primary">
        <Sparkles size={18} strokeWidth={1.5} />
        <span className="text-xs font-medium uppercase tracking-widest">ERP Gestión</span>
      </div>

      <h1 className="text-4xl font-semibold tracking-tight text-foreground">Iniciar sesión</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Ingresa tus credenciales para continuar
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-10 space-y-6" noValidate>
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-foreground">
            Email
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="tu@empresa.com"
            className="h-11"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
          {errors.email && (
            <p id="email-error" role="alert" className="text-xs text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-foreground">
            Contraseña
          </label>
          <CampoPassword
            id="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className="h-11"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? "password-error" : undefined}
            {...register("password")}
          />
          {errors.password && (
            <p id="password-error" role="alert" className="text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" disabled={login.isPending} className="h-11 w-full">
          {login.isPending ? <Loader2 className="size-4 animate-spin" /> : "Iniciar sesión"}
        </Button>
      </form>
    </div>
  );
}
