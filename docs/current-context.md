# Contexto actual — bonsight-next

Fecha de snapshot: 2026-09-03 (snapshot anterior: 2026-07-10, ver abajo)

## Resumen ejecutivo

El repositorio `bonsight-next` es una app Next.js que concentra varias experiencias de producto en un mismo monorepo:

- Bonsight / advisor y chat widget
- Kai (agente interno y panel multi-tenant para clientes)
- Aria (analista digital + Sprint board interno del equipo de Bonsight)
- Labs (gestión de proyectos multi-tenant para clientes: experimental / civil / seguimiento)
- Quiniela (admin, seguimiento, overview, resultados y proyección)

La rama activa es `main`. Hay además una rama `planning/kai-absorbe-aria` (pusheada, sin mergear) con la propuesta de fusión Kai+Aria (ADR-010) — solo visión, sin implementación.

## Áreas activas del proyecto

### 1. Labs (foco actual)
- Gestión de proyectos multi-tenant en `/labs/{tenant}` — tres tipos: `experimental`, `civil`, `seguimiento`
- Admin en `/labs/admin/{tenant}` — equipo, capacidades habilitadas por tenant, Drive
- **6 features completas localmente sin commitear** — ver `docs/ai-handoff.md` (sección "Snapshot local actual") para el detalle completo: gastos con factura en Presupuesto, Criterios de éxito estructurados, Nueva Prueba precargada, aporte con campos editables

### 2. Kai
- Panel admin multi-tenant en `/kai/admin`, vistas cliente en `/kai/[tenant]`
- Dashboard de costos de IA compartido con Aria y Labs en `/kai/admin/costs`

### 3. Aria
- Chat de BI en `/aria/[tenant]` (acceso protegido `ARIA_ACCESS_CODE`)
- Sprint board interno del equipo de Bonsight, con jerarquía padre/subtareas (lee Parent item/Sub-item de Notion)

### 4. Quiniela
- Admin y overview para resultados globales, seguimiento por participante, proyección

## Archivos clave a revisar primero

- `docs/ai-handoff.md` — leer primero, tiene el snapshot más reciente arriba de todo
- `docs/project-state.json`
- `lib/labs/experiments.js` — data layer de Labs (proyectos, tareas, partidas, gastos)
- `app/labs/[tenant]/LabsClientTenant.jsx` — toda la UI cliente de Labs (archivo grande)
- `app/api/aria/[tenant]/route.js`
- `app/api/kai/[tenant]/route.js`
- `lib/kai/usage.js` — tracking de costos de IA, compartido por Kai/Aria/Labs

## Variables de entorno importantes

```bash
OPENAI_API_KEY
ANTHROPIC_API_KEY
KV_REST_API_URL
KV_REST_API_TOKEN
ARIA_ACCESS_CODE
KAI_ACCESS_CODE
LABS_ACCESS_CODE
```

## Comandos útiles para trabajar localmente

```bash
npm install
npm run dev
# o, si se necesita escuchar en la red local:
HOST=0.0.0.0 npm run dev
```

## Estado del working tree al tomar este snapshot

6 archivos modificados + 1 carpeta nueva en Labs (ver `git status --short`), todo relacionado a la feature de gastos/criterios/aportar — sin commitear. Nada más pendiente fuera de Labs.

## Nota de continuidad

Para continuar una sesión posterior, revisar primero `docs/ai-handoff.md` (tiene el snapshot fechado más reciente arriba de todo el archivo) y después `docs/project-state.json`.

---

## Snapshot anterior (2026-07-10, histórico)

En ese momento la rama activa era `main`, último commit `921a767`, y el foco era el panel admin multi-tenant de Kai (ya completo y en producción). Labs todavía no existía como producto.
