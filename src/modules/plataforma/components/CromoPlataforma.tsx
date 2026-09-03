"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { plataformaService, sesionPlataforma } from "../services/plataforma.service";

/**
 * El marco de la administración del producto.
 *
 * Se distingue a propósito del área de trabajo del cliente: quien administra
 * entra y sale de cuentas ajenas, y confundir en cuál de los dos sistemas está
 * parado es cómo se suspende al cliente equivocado.
 */
export function CromoPlataforma({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!sesionPlataforma.token()) {
      router.replace("/login");
      return;
    }
    plataformaService
      .yo()
      .then((a) => setEmail(a.email))
      .catch(() => router.replace("/login"));
  }, [router]);

  return (
    <div className="min-h-dvh bg-background">
      <header className="flex h-14 items-center gap-3 border-b border-border bg-primary px-4 text-primary-foreground md:px-8">
        <Link href="/plataforma" className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-md bg-brand text-primary">
            <ShieldCheck className="size-4" />
          </span>
          <span className="text-sm font-semibold">Administración</span>
        </Link>

        <div className="ml-auto flex items-center gap-3">
          {email && <span className="hidden text-xs opacity-80 sm:inline">{email}</span>}
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
            onClick={() => {
              sesionPlataforma.cerrar();
              router.replace("/login");
            }}
          >
            <LogOut className="size-4" />
            Salir
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-7 md:px-8">{children}</main>
    </div>
  );
}
