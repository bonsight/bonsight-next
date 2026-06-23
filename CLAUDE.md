# Bonsight Next — Guía de desarrollo

## Visión general

Este proyecto es el monorepo de Bonsight. Contiene el sitio principal (marketing) y dos productos de IA:

- **Kai** (`kai.bonsight.co`) — Consultor estratégico que aprende el negocio del cliente a través de conversaciones. Investiga, hace preguntas y construye un Business Profile en Redis.
- **Aria** (`aria.bonsight.co`) — Partner de Business Intelligence. Analiza datos de fuentes conectadas (GA4, Search Console, Google Ads) y genera investigaciones con presentaciones visuales.

Ambos son multi-tenant: el tenant se pasa en la URL (`/kai/[tenant]/`, `/aria/[tenant]/`).

---

## Stack

- **Framework**: Next.js 16 App Router (no Pages Router)
- **Estilos**: CSS puro en archivos únicos por producto — no hay CSS modules ni Tailwind
- **IA**: Anthropic Claude (`claude-sonnet-4-6`) para Kai y Aria; OpenAI Whisper para transcripción de voz
- **Persistencia**: Redis via Upstash (`@upstash/redis`) — no hay base de datos SQL
- **Deploy**: Vercel (Hobby plan — serverless functions, timeout 10s)

---

## Estructura de archivos clave

```
app/
  kai/
    [tenant]/
      KaiClientView.jsx   ← layout principal de Kai (sidebar, secciones, Resumen, Participantes, etc.)
      KaiClientChat.jsx   ← componente de chat con Kai
      page.jsx            ← server component con auth guard por tenant
    admin/
      [tenant]/
        TenantDetail.jsx  ← panel de admin por tenant (5 tabs)
    kai.css               ← TODOS los estilos de Kai aquí (prefijo kcv- y kai-)
    login/page.jsx        ← login global de Kai (código de acceso)

  aria/
    [tenant]/
      AriaClientTenant.jsx ← cliente de Aria (chat, presentation cards)
    admin/
      [tenant]/
        AriaAdminDetail.jsx ← admin de Aria (Intelligence Sources, investigaciones)
    aria.css              ← todos los estilos de Aria

  api/
    kai/
      [tenant]/route.js   ← POST/PATCH/GET del chat de Kai (agentic loop)
      [tenant]/transcribe/route.js
      [tenant]/learnings/route.js
      [tenant]/participants/route.js
      [tenant]/intelligence-sources/route.js
    aria/
      [tenant]/route.js   ← POST del chat de Aria (agentic loop con tools)

lib/
  kai/
    auth.js               ← isKaiAuthorized() / isAuthorizedForTenant(tenant)
    tenants.js            ← getTenantMeta / getBusinessProfile / updateBusinessProfile
    memory.js             ← conversaciones en Redis (kai:{tenant}:conversation:*)
    learnings.js          ← aprendizajes detectados por Kai
    participants.js       ← participantes conocidos por tenant
    intelligenceSources.js ← config de fuentes de datos por tenant
    scoring.js            ← cálculo de Business Profile completeness (0-100%)
    artifacts.js          ← participant insights y regeneración de cache
  aria/
    auth.js               ← isAuthorized() para Aria
    memory.js             ← investigaciones en Redis (aria:{tenant}:investigation:*)
    ga4.js                ← queries a Google Analytics 4
    searchConsole.js      ← queries a Google Search Console
    googleAds.js          ← queries a Google Ads
    summarize.js          ← compresión de historial de Aria (HISTORY_LIMIT=12)
```

---

## Redis — patrones de keys

```
kai:{tenant}:profile                           ← Business Profile (objeto JSON)
kai:{tenant}:conversations                     ← sorted set con IDs de conversaciones
kai:{tenant}:conversation:{id}:messages        ← historial de mensajes
kai:{tenant}:conversation:{id}:meta            ← área, estado, participante confirmado
kai:{tenant}:learnings                         ← sorted set de aprendizajes
kai:{tenant}:participants                      ← lista de participantes conocidos
kai:{tenant}:intelligence_sources              ← config de GA4, Search Console, Ads

aria:{tenant}:investigations                   ← sorted set con IDs de investigaciones
aria:{tenant}:investigation:{id}:meta          ← título, fechas
aria:{tenant}:investigation:{id}:messages      ← historial de la investigación
```

---

## Sistema de Auth

Hay dos sistemas de auth para Kai, ambos usan cookies `httpOnly`:

| Cookie | Scope | Quién la usa |
|---|---|---|
| `kai_auth` | Global — acceso total a Kai admin | El equipo interno |
| `kai_auth_{tenant}` | Solo ese tenant | Usuarios externos (clientes) |

**Regla crítica**: Los routes `app/api/kai/[tenant]/*` deben usar `isAuthorizedForTenant(tenant)` (no `isKaiAuthorized()`). Esto acepta ambas cookies. Los routes de admin global (`/api/kai/route.js`) usan `isKaiAuthorized()`.

```js
// En routes de [tenant]:
import { isAuthorizedForTenant } from '@/lib/kai/auth';
const { tenant } = await params;
if (!(await isAuthorizedForTenant(tenant))) return Response.json({ error: 'No autorizado.' }, { status: 401 });

// En routes de admin global:
import { isKaiAuthorized } from '@/lib/kai/auth';
if (!(await isKaiAuthorized())) return Response.json({ error: 'No autorizado.' }, { status: 401 });
```

Aria tiene su propio auth (`lib/aria/auth.js`) completamente separado.

---

## Cómo funciona Kai (agentic loop)

1. El usuario envía un mensaje desde `KaiClientChat.jsx`
2. `POST /api/kai/[tenant]` carga el Business Profile, conversaciones previas y sugerencias pendientes de Aria
3. Construye el system prompt con el perfil actual y gaps detectados (`buildSystemPrompt`)
4. Llama a Claude con tools: `update_business_profile`, `save_conversation_checkpoint`, `save_session_memory`
5. Si Claude llama `update_business_profile`, actualiza Redis inmediatamente
6. La respuesta puede incluir bloques `[KAI_UPDATE]...[/KAI_UPDATE]` con aprendizajes detectados
7. El scoring (`lib/kai/scoring.js`) recalcula el % de cobertura por área

**Greeting especial**: el primer mensaje siempre es `{ role: 'user', content: '__greeting__' }`. Kai responde con un saludo contextual y reconoce al participante si hay historial.

---

## Cómo funciona Aria (agentic loop)

1. El usuario envía mensaje desde `AriaClientTenant.jsx`
2. `POST /api/aria/[tenant]` carga el Business Profile, intelligence sources configuradas y el historial de la investigación
3. Agentic loop con `MAX_ITERATIONS = 3`:
   - Aria puede llamar `query_ga4`, `query_search_console`, `query_google_ads` para obtener datos reales
   - Aria debe llamar `present_analysis` (card visual) O `present_advisory` al finalizar
   - Si agota iteraciones sin respuesta, hay un "forced response" de rescate
4. `summarizeIfNeeded` comprime el historial si supera 12 mensajes (guarda los últimos 5)
5. La respuesta puede incluir bloques `[ARIA_TOPICS]` (sugerencias de seguimiento) y `[ARIA_SUGGESTION]` (sugerencias para Kai)

---

## CSS — convenciones

- **Todo el CSS de Kai** va en `app/kai/kai.css`. No crear archivos CSS separados por componente.
- **Prefijos**: `kcv-` para clases de `KaiClientView`, `kai-` para el chat standalone
- **Mobile**: media queries en `@media (max-width: 768px)` al final de `kai.css`
- **Paleta Kai**: `--kai-bg: #0D1117`, `--kai-green: #20C997`, `--kai-surface: #1F2937`
- **Paleta Aria**: ver variables en `aria.css`
- Usar `100dvh` (no `100vh`) en mobile para evitar el gap de iOS Safari

---

## Variables de entorno

Todas necesarias en Vercel → Settings → Environment Variables:

```
# IA
ANTHROPIC_API_KEY          ← Claude (Kai + Aria)
OPENAI_API_KEY             ← Whisper transcripción de voz

# Redis (Upstash)
KV_REST_API_URL
KV_REST_API_TOKEN
KV_REST_API_READ_ONLY_TOKEN
KV_URL

# Kai
KAI_ACCESS_CODE            ← Código de acceso global de Kai (admin)
ALLOWED_TENANTS            ← Comma-separated: "bonsight,sesuveca,vivahogar" (vacío = todos)

# Google (para GA4/Search Console/Google Ads en Aria)
GOOGLE_SERVICE_ACCOUNT_JSON ← JSON completo de la service account de Google
```

---

## Tenants activos

Los tenants se crean en Redis con `lib/kai/tenants.js`. Cada tenant tiene:
- `name`: nombre de la empresa
- `industry`, `country`: metadatos
- `accessCode`: código de acceso para usuarios externos (opcional)
- `isDemo`: si es true, no permite escribir y usa datos de demostración

Para agregar un tenant: usar el admin de Kai en `/kai/admin`.

---

## Patrones importantes

### Params en Next.js 15 App Router
```js
// params es una Promise — siempre await
export async function GET(req, { params }) {
  const { tenant } = await params;
}
```

### Commits a producción
Siempre preguntar qué cambios incluir antes de hacer `git commit && git push`. Kai y Aria tienen cambios separados y se despliegan juntos pero hay que tener cuidado con dependencias entre archivos.

### Nunca commitear archivos Aria sin verificar
Los routes de Aria (`app/api/aria/[tenant]/route.js`) tienen lógica compleja de intelligence sources que puede tener dependencias de `lib/aria/ga4.js`, `lib/aria/googleAds.js`, `lib/aria/searchConsole.js`. Si se commitean routes de Aria, asegurarse de que los lib files correspondientes también estén commitados.

---

## Desarrollo local

```bash
npm install
npm run dev
```

El sitio corre en `localhost:3000`. Para testear Kai: `localhost:3000/kai/bonsight`. Para Aria: `localhost:3000/aria/bonsight`.

Las variables de entorno van en `.env.local` (no commitear).
