"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// Un clic afuera no cierra: se perdía lo escrito en un formulario por rozar el
// fondo. Se cierra con la ✕, con un botón o con Esc.
function Dialog({ disablePointerDismissal = true, ...props }: DialogPrimitive.Root.Props) {
  return (
    <DialogPrimitive.Root
      data-slot="dialog"
      disablePointerDismissal={disablePointerDismissal}
      {...props}
    />
  )
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/20 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

/**
 * El diálogo se dimensiona por contenido, no por defecto: un formulario de
 * quince campos en un `max-w-sm` obliga a apilar todo en una columna y a hacer
 * scroll por campos que caben perfectamente al lado.
 */
function DialogContent({
  className,
  size = "default",
  ...props
}: DialogPrimitive.Popup.Props & {
  /** `pantalla`: a pantalla completa en el móvil y como `lg` desde `sm` (pantalla 68). */
  size?: "default" | "lg" | "xl" | "pantalla"
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        data-size={size}
        className={cn(
          "group/dialog-content fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-popover text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none data-[size=default]:sm:max-w-lg data-[size=lg]:sm:max-w-3xl data-[size=xl]:sm:max-w-5xl data-[size=pantalla]:sm:max-w-3xl data-[size=pantalla]:max-sm:inset-0 data-[size=pantalla]:max-sm:h-dvh data-[size=pantalla]:max-sm:max-h-dvh data-[size=pantalla]:max-sm:w-full data-[size=pantalla]:max-sm:translate-x-0 data-[size=pantalla]:max-sm:translate-y-0 data-[size=pantalla]:max-sm:rounded-none data-[size=pantalla]:max-sm:ring-0 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      />
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "flex shrink-0 items-start justify-between gap-6 border-b border-border px-6 py-5 sm:px-8",
        className
      )}
      {...props}
    />
  )
}

/** El cuerpo es lo único que hace scroll: encabezado y acciones quedan fijos. */
function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn("min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex shrink-0 flex-col-reverse gap-3 border-t border-border bg-muted/40 px-6 py-5 sm:flex-row sm:justify-end sm:px-8",
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("font-heading text-xl font-semibold tracking-tight", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("mt-1.5 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

/** La X de cerrar. Con etiqueta accesible porque el icono solo no dice nada. */
function DialogCloseIcon({ className, ...props }: DialogPrimitive.Close.Props) {
  return (
    <DialogPrimitive.Close
      data-slot="dialog-close-icon"
      aria-label="Cerrar"
      className={cn("shrink-0 text-muted-foreground", className)}
      render={<Button type="button" variant="ghost" size="icon" />}
      {...props}
    >
      <X className="size-4" />
    </DialogPrimitive.Close>
  )
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogCloseIcon,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
