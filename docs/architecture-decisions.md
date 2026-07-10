# Architecture Decision Records — bonsight-next

> Fuente de verdad para decisiones arquitectónicas y de producto permanentes.  
> Cualquier IA que trabaje en este repo debe leer este archivo antes de proponer cambios estructurales.

---

## ADR-001: Monorepo único para todos los agentes
**Fecha:** 2025-Q4  
**Estado:** Aceptado

**Contexto:**  
El proyecto tiene tres agentes (Advisor, Kai, Aria) que comparten infraestructura (Redis, OpenAI, Next.js) y código base. La alternativa era un repo o app separada por agente.

**Decisión:**  
Todo vive en el mismo repositorio `bonsight-next` bajo Next.js 15 App Router. Los agentes se separan a nivel de ruta (`/kai/*`, `/aria/*`) y subdominio (`kai.bonsight.co`, `aria.bonsight.co`), no a nivel de repositorio ni de proceso.

**Consecuencias:**  
- Un solo deploy en Vercel sirve los tres agentes.
- El middleware `proxy.js` hace el routing por subdominio (`host.startsWith('kai.')` → rewrite a `/kai/*`).
- Compartir librerías (`lib/businessMemory.js`) es trivial.
- Cada agente tiene su propio layout, CSS y namespace de rutas API.

---

## ADR-002: Arquitectura de tres agentes con roles diferenciados
**Fecha:** 2025-Q4  
**Estado:** Aceptado

**Contexto:**  
Se necesita un ecosistema de IA que cubra: adquisición de clientes (publico), consultoría interna (Bonsight team) y business intelligence (clientes).

**Decisión:**  
Tres agentes con responsabilidades separadas:

| Agente | Endpoint | Audiencia | Función |
|--------|----------|-----------|---------|
| **Advisor** | `bonsight.co/consulta` + widget flotante | Visitantes del sitio público | Conversión comercial — identifica necesidad y lleva a llamada/WA |
| **Kai** | `kai.bonsight.co` | Equipo interno Bonsight + clientes con acceso | Discovery estratégico — construye el perfil empresarial del cliente |
| **Aria** | `aria.bonsight.co` | Clientes con acceso | Business Intelligence — analiza datos (GA4, etc.) y genera insights |

**Consecuencias:**  
- Advisor no tiene persistencia de sesión (stateless, solo conv. in-memory).
- Kai escribe a Business Memory (Redis) que Aria consume.
- Aria es read-heavy sobre GA4 + Redis, write-heavy sobre investigaciones.

---

## ADR-003: Business Memory como capa compartida entre agentes
**Fecha:** 2025-Q4  
**Estado:** Aceptado

**Contexto:**  
Kai hace discovery empresarial. Aria necesita ese contexto para dar insights relevantes. Sin una capa compartida, son sistemas paralelos sin conocimiento mutuo.

**Decisión:**  
`lib/businessMemory.js` es la fuente de verdad compartida, usando Upstash Redis con namespace `business:{tenantId}:profile` y `business:{tenantId}:memory`.

**Consecuencias:**  
- Kai escribe a `business:bonsight:profile` durante la conversación.
- Aria lee `business:bonsight:profile` en cada request via `getBusinessProfile(tenantId)`.
- El perfil estático en `lib/aria/clientProfile.js` actúa como seed inicial para el tenant `bonsight` (si no existe en Redis, se carga el default).
- `lib/businessMemory.js` expone: `getBusinessProfile`, `setBusinessProfile`, `getBusinessMemory`, `updateBusinessMemory`.

---

## ADR-004: Autenticación por cookie SHA-256 (sin auth framework)
**Fecha:** 2025-Q4  
**Estado:** Aceptado

**Contexto:**  
Los agentes internos (Kai, Aria) necesitan protección de acceso. El uso de NextAuth u otro framework de auth añadiría complejidad innecesaria para audiencias muy pequeñas (equipo interno + clientes específicos).

**Decisión:**  
Auth mediante cookie httpOnly que contiene `sha256(ACCESS_CODE)`. El ACCESS_CODE es una variable de entorno. El middleware y los Server Components validan la cookie en cada request.

**Consecuencias:**  
- `ARIA_ACCESS_CODE` en Vercel env → cookie `aria_auth`.
- `KAI_ACCESS_CODE` en Vercel env → cookie `kai_auth`.
- `lib/aria/auth.js` y `lib/kai/auth.js` son la implementación (sin framework).
- No hay tokens de sesión, rotación, ni multi-user. Un password compartido por agente.
- El proxy.js maneja el redirect a `/login` cuando la cookie no matchea.

---

## ADR-005: Upstash Redis como base de datos de estado
**Fecha:** 2025-Q4  
**Estado:** Aceptado

**Contexto:**  
El proyecto necesita persistencia sin operaciones de base de datos complejas. Las conversaciones, perfiles empresariales e investigaciones son estructuras JSON simples con acceso por clave.

**Decisión:**  
Upstash Redis (via `@upstash/redis`) como única base de datos. Namespaces por agente:

| Namespace | Contenido |
|-----------|-----------|
| `business:{tenantId}:profile` | Perfil empresarial (escrito por Kai, leído por Aria) |
| `business:{tenantId}:memory` | Business memory acumulada (advisor captures + kai updates) |
| `kai:{tenantId}:conversation:{id}:messages` | Mensajes de una conversación Kai |
| `kai:{tenantId}:conversation:{id}:meta` | Metadata de conversación (título, fechas) |
| `kai:{tenantId}:conversations` | Sorted set de IDs de conversación por fecha |
| `kai:{tenantId}:meta` | Metadata del tenant (nombre, país, industria, status) |
| `kai:tenants` | Array JSON de slugs de tenants registrados |
| `aria:{businessId}:investigations` | Sorted set de IDs de investigaciones |
| `aria:{businessId}:investigation:{id}:*` | Datos de investigación (meta, messages, metrics) |

**Consecuencias:**  
- Todo el estado es JSON serializado en Redis. No hay migrations ni schemas.
- `kv.get` / `kv.set` son las operaciones primarias. Sorted sets para listas ordenadas.
- El único cliente es `Redis` de `@upstash/redis`. Credentials: `KV_REST_API_URL` + `KV_REST_API_TOKEN`.

---

## ADR-006: Subdominios vía proxy.js (middleware Next.js)
**Fecha:** 2025-Q4  
**Estado:** Aceptado

**Contexto:**  
Cada agente necesita su propio subdominio (`kai.bonsight.co`, `aria.bonsight.co`) para separación visual y de acceso, pero todos corren en el mismo Next.js deployment.

**Decisión:**  
`proxy.js` exportado como `middleware` de Next.js. Detecta el host header y reescribe la URL internamente (sin redirect):
- `kai.*` → `/kai{pathname}` (con auth check)
- `aria.*` → `/aria{pathname}` (con auth check)
- todo lo demás → routing i18n con locale `/es` o `/en`

**Consecuencias:**  
- El matcher excluye `/api`, `/aria`, `/kai`, `/quiniela`, y assets estáticos para evitar loops.
- Los subdominios deben configurarse en Vercel como dominios del proyecto.
- La auth check está en el middleware (redirect a login) Y en los Server Components (doble protección).

---

## ADR-007: Multi-tenant Kai — un tenant por cliente
**Fecha:** 2026-06  
**Estado:** En implementación

**Contexto:**  
Kai inicialmente era single-tenant (`TENANT_ID = 'bonsight'`). Para escalar a múltiples clientes, cada cliente necesita su propia instancia de Kai con su propio perfil y conversaciones.

**Decisión:**  
Sistema multi-tenant basado en slugs. Cada cliente tiene:
- URL: `kai.bonsight.co/{slug}` (reescrita desde el subdominio por proxy.js)
- Admin: `kai.bonsight.co/admin/{slug}`
- Datos: namespace `kai:{slug}:*` en Redis

La gestión de tenants vive en `lib/kai/tenants.js`. El registro de todos los tenants está en la clave `kai:tenants` (JSON array de slugs).

**Consecuencias:**  
- `app/kai/admin/` es el panel de administración (solo acceso con `KAI_ACCESS_CODE`).
- `app/kai/[tenant]/` es la interfaz del cliente externo.
- `app/api/kai/[tenant]/route.js` es el endpoint de chat por tenant.
- `app/api/kai/tenants/route.js` es el CRUD de tenants (GET + POST).
- El tenant `bonsight` (uso interno) sigue funcionando en `/kai` (root) con el sistema antiguo.

---

## ADR-008: Modelos de IA por agente
**Fecha:** 2025-Q4  
**Estado:** Aceptado

**Contexto:**  
Cada agente tiene diferentes requisitos de latencia, profundidad y costo.

**Decisión:**  

| Agente | Modelo | Proveedor | Justificación |
|--------|--------|-----------|---------------|
| Advisor | `gpt-4o-mini` | OpenAI | Volumen alto (público), latencia baja, costo bajo |
| Kai | `gpt-4o-mini` | OpenAI | Conversaciones moderadas, calidad suficiente |
| Aria | `claude-opus-4-8` (o similar) | Anthropic | Análisis profundo de datos, calidad máxima |

**Consecuencias:**  
- `OPENAI_API_KEY` requerida para Advisor y Kai.
- `ANTHROPIC_API_KEY` requerida para Aria.
- Los modelos pueden cambiarse sin cambios de arquitectura (son constantes en cada route handler).

---

## ADR-009: i18n sin librería externa (header x-locale)
**Fecha:** 2025-Q4  
**Estado:** Aceptado

**Contexto:**  
El sitio público soporta español e inglés. La alternativa era `next-intl` u otra librería de i18n.

**Decisión:**  
i18n manual basado en rutas `/es/*` y `/en/*`. El middleware detecta el locale y lo propaga via el header `x-locale`. Los componentes leen el locale con `usePathname()` (client) o `headers().get('x-locale')` (server).

**Consecuencias:**  
- `defaultLocale = 'en'`. Paths sin locale redirigen a `/en/*`.
- Objetos `T = { es: {...}, en: {...} }` en cada componente que necesita traducciones.
- Sin archivos de mensajes ni namespaces de i18n.
