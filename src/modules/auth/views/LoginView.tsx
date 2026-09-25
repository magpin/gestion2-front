"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CampoPassword } from "@/components/shared/CampoPassword";
import { Button } from "@/components/ui/button";
import { loginSchema, type LoginFormData } from "@/lib/validators";
import { NOMBRE_SISTEMA } from "@/modules/landing/components/Marca";
import { useLogin } from "../hooks/useAuth";
import { sesionPlataforma } from "@/modules/plataforma/services/plataforma.service";
import styles from "../login.module.css";

/**
 * La columna del formulario: ayuda arriba, campos al centro, pie abajo.
 *
 * Del diseño quedaron fuera dos controles, y es a propósito:
 *
 *  - «Recordar este equipo». `LoginPayload` es `{ email, password }` y nada
 *    más. Un checkbox que no viaja al backend es un control que miente sobre lo
 *    que hace.
 *  - «¿La olvidaste?». No hay endpoint de recuperación. Un enlace muerto en la
 *    puerta de entrada es peor que su ausencia: quien lo necesita, lo necesita
 *    justo ahí.
 *
 * Los dos vuelven el día que el backend los sostenga.
 *
 * La duración de la sesión sí es real: `JWT_EXPIRES_IN=8h`.
 */
const HORAS_DE_SESION = 8;

export function LoginView() {
  const login = useLogin();
  const router = useRouter();

  // Hasta que el navegador termine de preparar la página, el botón queda
  // apagado. Si no, un clic apurado manda el formulario por la vía del
  // navegador —un GET— y la contraseña termina en la URL, o sea en el
  // historial y en los registros del servidor.
  const listo = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

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
    <>
      <div
        className={`${styles.fade} flex justify-end gap-1.5 text-sm text-muted-foreground`}
      >
        <span>¿Necesitas ayuda?</span>
        <a
          href="mailto:soporte@erpgestion.co"
          className="font-medium text-brand-text no-underline hover:text-brand-hover"
        >
          Contactar soporte
        </a>
      </div>

      <div className="flex grow items-center justify-center py-10">
        <div className="flex w-full max-w-[360px] flex-col gap-8">
          <div className={`${styles.up} ${styles.d1} flex flex-col gap-1.5`}>
            <h1 className="m-0 text-[26px] font-semibold tracking-[-0.6px]">
              Bienvenido de nuevo
            </h1>
            <p className="m-0 text-sm leading-normal text-muted-foreground">
              Ingresa con tu cuenta para continuar.
            </p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4.5"
            noValidate
          >
            <div className={`${styles.up} ${styles.d2} flex flex-col gap-1.5`}>
              <label htmlFor="email" className="text-[13px] font-medium">
                Correo electrónico
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="nombre@empresa.com"
                className="h-11 rounded-[0.6rem]"
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? "email-error" : undefined}
                {...register("email")}
              />
              {errors.email && (
                <p
                  id="email-error"
                  role="alert"
                  className="text-xs text-destructive"
                >
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className={`${styles.up} ${styles.d3} flex flex-col gap-1.5`}>
              <label htmlFor="password" className="text-[13px] font-medium">
                Contraseña
              </label>
              <CampoPassword
                id="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-11 rounded-[0.6rem]"
                aria-invalid={errors.password ? true : undefined}
                aria-describedby={
                  errors.password ? "password-error" : undefined
                }
                {...register("password")}
              />
              {errors.password && (
                <p
                  id="password-error"
                  role="alert"
                  className="text-xs text-destructive"
                >
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={login.isPending || !listo}
              className={`${styles.up} ${styles.d5} mt-3.5 h-11 w-full rounded-[0.6rem]`}
            >
              {login.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Ingresar"
              )}
            </Button>
          </form>

          <div
            className={`${styles.up} ${styles.d6} flex items-center gap-2 text-xs text-muted-foreground`}
          >
            <Lock size={14} strokeWidth={1.8} className="shrink-0" />
            <span>
              Conexión cifrada · la sesión se cierra a las {HORAS_DE_SESION}{" "}
              horas
            </span>
          </div>
        </div>
      </div>

      <footer
        className={`${styles.fade} flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:justify-between`}
      >
        <span>
          © {new Date().getFullYear()} {NOMBRE_SISTEMA}
        </span>
        <div className="flex gap-5">
          <Link
            href="/terminos"
            className="text-muted-foreground no-underline hover:text-foreground"
          >
            Términos
          </Link>
          <Link
            href="/tratamiento-de-datos"
            className="text-muted-foreground no-underline hover:text-foreground"
          >
            Tratamiento de datos
          </Link>
        </div>
      </footer>
    </>
  );
}
