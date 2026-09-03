# Registro de datos MOCK — tableros del contador

> ⚠️ **Temporal.** Estos mocks existen solo para verificar que los gráficos de los
> tableros analíticos del contador renderizan cuando el rango real devuelve vacío
> (p. ej. "mes en curso" sin ventas en el seed). **Borrar antes de producción.**

## Cómo activarlos
Poner en `frontend/.env.local`:

```
NEXT_PUBLIC_MOCK_CONTADOR=1
```

Con el flag en `1`, cada hook de estadísticas devuelve su mock **solo si** el backend
responde vacío (0 registros). Sin el flag (o en producción), nunca se usan.

## Archivos con mock (borrar al terminar)

| Archivo | Qué contiene | Cómo quitarlo |
|---|---|---|
| `src/modules/dashboard/ventas/mocks/estadisticas.mock.ts` | Dataset ficticio `EstadisticasVentas` (KPIs, serie diaria contado/crédito, top clientes, por asesor) | Borrar el archivo |
| `src/modules/dashboard/ventas/hooks/useVentas.ts` (`useEstadisticasVentas`) | `import` del mock + rama `select` que lo devuelve bajo el flag | Quitar el import y restaurar `select: (respuesta) => respuesta.data` |
| `src/modules/dashboard/inicio/mocks/dashboard-contador.mock.ts` | Dataset ficticio `DashboardResumen` para el Inicio del contador | Borrar el archivo |
| `src/modules/dashboard/inicio/views/InicioContadorView.tsx` | `import` del mock + variable `usarMock` que lo aplica bajo el flag | Quitar el import y la rama `usarMock` (dejar solo datos reales) |
| `src/modules/dashboard/taller/mocks/tallerStats.mock.ts` | Dataset ficticio `EstadisticasTaller` (KPIs, por técnico, por estado, fallas) | Borrar el archivo |
| `src/modules/dashboard/taller/hooks/useTallerStats.ts` (`useEstadisticasTaller`) | `import` del mock + rama `select` que lo devuelve bajo el flag | Quitar el import y restaurar `select: (respuesta) => respuesta.data` |
| ~~`compras/mocks/estadisticas.mock.ts`~~ | **Retirado el 19/08**: `GET /compras/estadisticas` no existe en el backend de 32 tablas. Movido a `src/_pendiente/modules/comprasContador/` junto con su hook y su vista | Ya no se usa |
| `src/modules/dashboard/gastos/mocks/estadisticas.mock.ts` | Dataset ficticio `EstadisticasGastos` (KPIs, por día, por cuenta, por tipo) | Borrar el archivo |
| `src/modules/dashboard/gastos/hooks/useEstadisticasGastos.ts` | `import` del mock + rama `select` que lo devuelve bajo el flag | Quitar el import y restaurar `select: (respuesta) => respuesta.data` |
| `src/modules/dashboard/asientos/mocks/estadisticas.mock.ts` | Dataset ficticio `EstadisticasAsientos` (KPIs, por origen, cuentas movidas, por día) | Borrar el archivo |
| `src/modules/dashboard/asientos/hooks/useEstadisticasAsientos.ts` | `import` del mock + rama `select` que lo devuelve bajo el flag | Quitar el import y restaurar `select: (respuesta) => respuesta.data` |
| `src/modules/dashboard/nomina/mocks/estadisticas.mock.ts` | Dataset ficticio `EstadisticasNomina` (KPIs, por período, tabla por empleado) | Borrar el archivo |
| `src/modules/dashboard/nomina/hooks/useEstadisticasNomina.ts` | `import` del mock + rama `select` que lo devuelve bajo el flag | Quitar el import y restaurar `select: (respuesta) => respuesta.data` |
| ~~`caja/mocks/estadisticas.mock.ts`~~ | **Retirado el 19/08**: `GET /caja/estadisticas` tampoco existe. La caja nueva compone sus tres cifras con `/caja/saldo` y `/cartera` | Ya no se usa |

## Checklist de limpieza
- [ ] Borrar `mocks/estadisticas.mock.ts` (Ventas)
- [ ] Restaurar `useEstadisticasVentas` en `hooks/useVentas.ts`
- [ ] Borrar `mocks/dashboard-contador.mock.ts` (Inicio)
- [ ] Quitar la rama `usarMock` en `InicioContadorView.tsx`
- [ ] Borrar `mocks/tallerStats.mock.ts` (Taller)
- [ ] Restaurar `useEstadisticasTaller` en `hooks/useTallerStats.ts`
- [x] Compras: retirado — el endpoint no existe
- [ ] Borrar `mocks/estadisticas.mock.ts` (Gastos)
- [ ] Restaurar `useEstadisticasGastos` en `hooks/useEstadisticasGastos.ts`
- [ ] Borrar `mocks/estadisticas.mock.ts` (Asientos)
- [ ] Restaurar `useEstadisticasAsientos` en `hooks/useEstadisticasAsientos.ts`
- [ ] Borrar `mocks/estadisticas.mock.ts` (Nómina)
- [ ] Restaurar `useEstadisticasNomina` en `hooks/useEstadisticasNomina.ts`
- [x] Caja: retirado — el endpoint no existe
- [ ] Quitar `NEXT_PUBLIC_MOCK_CONTADOR` de `.env.local`
- [ ] Borrar este archivo (`MOCKS-CONTADOR.md`)
