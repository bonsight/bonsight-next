import { getIntelligenceSources } from '@/lib/kai/intelligenceSources';

// Acceso a GitHub para los proyectos de Desarrollo, con el token del tenant (Admin → Fuentes →
// GitHub). Todo es lectura salvo commentOnCommit, que deja en GitHub el resumen de un commit
// formalizado en Kai. Cada respuesta se recorta antes de llegarle a Kai para no llenarle el
// contexto.

const API = 'https://api.github.com';
const MAX_FILE_CHARS = 20000;
const MAX_TOTAL_CHARS = 60000;
const MAX_PATCH_CHARS = 3000;
const MAX_TREE_ENTRIES = 400;
const REPO_RE = /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/;

// Un tenant puede conectar varias cuentas u organizaciones de GitHub, cada una con su token.
// Se guardan en config.connections: [{ id, token, accountLogin, owners, repoCount, lastValidatedAt }].
// Los tenants que conectaron antes un único token (config.token) se leen como una sola conexión.
export function githubConnectionsFromConfig(config) {
  if (Array.isArray(config?.connections)) return config.connections.filter((c) => c?.token);
  if (config?.token) {
    return [{
      id: 'default', token: config.token, accountLogin: config.accountLogin ?? null,
      owners: config.owners ?? (config.accountLogin ? [config.accountLogin] : []),
      repoCount: config.repoCount ?? 0, lastValidatedAt: config.lastValidatedAt ?? null,
    }];
  }
  return [];
}

export async function getGithubConnections(tenant) {
  const sources = await getIntelligenceSources(tenant);
  const gh = sources.find((s) => s.id === 'github');
  if (!gh || gh.status !== 'active') return [];
  return githubConnectionsFromConfig(gh.config);
}

// Solo dice si hay alguna conexión (para chequeos de "GitHub está conectado").
export async function getGithubToken(tenant) {
  return (await getGithubConnections(tenant))[0]?.token ?? null;
}

// Etiqueta legible de una conexión: los dueños de los repos que ve (cuenta u organizaciones).
export function githubConnectionLabel(c) {
  const owners = c?.owners?.length ? c.owners : c?.accountLogin ? [c.accountLogin] : [];
  return owners.join(', ') || 'GitHub';
}

// Token para un repo de un proyecto: la conexión con que se eligió; si ya no existe (o el repo es
// de antes de las conexiones múltiples), la que tiene acceso al dueño del repo; si no, la primera.
export async function getGithubTokenForRepo(tenant, repo) {
  const conns = await getGithubConnections(tenant);
  if (!conns.length) return null;
  const owner = String(repo?.fullName ?? '').split('/')[0].toLowerCase();
  const byId = repo?.connectionId && conns.find((c) => c.id === repo.connectionId);
  const byOwner = conns.find((c) => (c.owners ?? []).some((o) => o.toLowerCase() === owner) || c.accountLogin?.toLowerCase() === owner);
  return (byId || byOwner || conns[0]).token;
}

export function isValidRepoName(fullName) {
  return typeof fullName === 'string' && REPO_RE.test(fullName.trim());
}

async function ghFetch(token, path, { raw = false, textMatch = false } = {}) {
  const accept = raw ? 'application/vnd.github.raw+json' : textMatch ? 'application/vnd.github.text-match+json' : 'application/vnd.github+json';
  const res = await fetch(`${API}${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: accept,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'bonsight-kai',
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('El token de GitHub no es válido o venció. Hay que renovarlo en Admin → Fuentes.');
    if (res.status === 403 || res.status === 429) {
      const remaining = res.headers.get('x-ratelimit-remaining');
      throw new Error(remaining === '0'
        ? 'GitHub limitó las consultas por un momento. Intenta de nuevo en un minuto.'
        : 'El token de GitHub no tiene permiso para esto.');
    }
    if (res.status === 404) throw new Error('No se encontró en GitHub, o el token no tiene acceso a ese repositorio.');
    if (res.status === 422) throw new Error('GitHub no pudo procesar esa consulta.');
    throw new Error(`GitHub respondió con un error (${res.status}).`);
  }
  return raw ? res.text() : res.json();
}

const encodePath = (p) => String(p ?? '').replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
const clip = (text, max) => (text.length > max ? `${text.slice(0, max)}\n… [recortado: ${text.length - max} caracteres más]` : text);

// ── Admin ────────────────────────────────────────────────────────────────

export async function validateGithubToken(token) {
  const user = await ghFetch(token, '/user');
  const repos = await listAccessibleRepos(token);
  const owners = [...new Set(repos.map((r) => r.fullName.split('/')[0]))];
  return { accountLogin: user.login, owners: owners.length ? owners : [user.login], repoCount: repos.length };
}

export async function listAccessibleRepos(token) {
  const all = [];
  // Hasta 3 páginas (300 repos): de sobra para elegir, sin pasarse del timeout.
  for (let page = 1; page <= 3; page += 1) {
    const repos = await ghFetch(token, `/user/repos?per_page=100&page=${page}&sort=pushed&affiliation=owner,collaborator,organization_member`);
    all.push(...repos);
    if (repos.length < 100) break;
  }
  return all.map((r) => ({ fullName: r.full_name, private: r.private, defaultBranch: r.default_branch, pushedAt: r.pushed_at, description: r.description }));
}

export async function getRepoInfo(token, fullName) {
  const r = await ghFetch(token, `/repos/${fullName}`);
  return { fullName: r.full_name, defaultBranch: r.default_branch, private: r.private, url: r.html_url };
}

// ── Lo que usa Kai ───────────────────────────────────────────────────────

async function loadTree(token, fullName, ref) {
  const tree = await ghFetch(token, `/repos/${fullName}/git/trees/${encodeURIComponent(ref)}?recursive=1`);
  return { entries: tree.tree ?? [], truncated: !!tree.truncated };
}

export async function repoOverview(token, fullName, ref) {
  const repo = await ghFetch(token, `/repos/${fullName}`);
  const branch = ref || repo.default_branch;
  const [languages, readme, tree, commits] = await Promise.all([
    ghFetch(token, `/repos/${fullName}/languages`).catch(() => ({})),
    ghFetch(token, `/repos/${fullName}/readme?ref=${encodeURIComponent(branch)}`, { raw: true }).catch(() => ''),
    loadTree(token, fullName, branch),
    ghFetch(token, `/repos/${fullName}/commits?sha=${encodeURIComponent(branch)}&per_page=10`).catch(() => []),
  ]);

  // Resumen por carpeta de primer y segundo nivel: alcanza para ver los módulos sin listar
  // miles de archivos.
  const folders = new Map();
  for (const e of tree.entries) {
    if (e.type !== 'blob') continue;
    const parts = e.path.split('/');
    const key = parts.length > 2 ? `${parts[0]}/${parts[1]}` : parts.length === 2 ? parts[0] : '(raíz)';
    folders.set(key, (folders.get(key) ?? 0) + 1);
  }
  const rootFiles = tree.entries.filter((e) => e.type === 'blob' && !e.path.includes('/')).map((e) => e.path);

  return {
    repositorio: repo.full_name,
    descripcion: repo.description,
    rama: branch,
    ultimo_push: repo.pushed_at,
    lenguajes: Object.keys(languages),
    archivos_en_raiz: rootFiles.slice(0, 60),
    carpetas: [...folders.entries()].sort((a, b) => b[1] - a[1]).slice(0, 80).map(([carpeta, archivos]) => ({ carpeta, archivos })),
    total_archivos: tree.entries.filter((e) => e.type === 'blob').length,
    arbol_incompleto: tree.truncated,
    readme: clip(readme || '', 6000),
    commits_recientes: (Array.isArray(commits) ? commits : []).map(formatCommitSummary),
  };
}

export async function repoTree(token, fullName, ref, path) {
  const repo = ref ? null : await ghFetch(token, `/repos/${fullName}`);
  const branch = ref || repo.default_branch;
  const tree = await loadTree(token, fullName, branch);
  const prefix = String(path ?? '').replace(/^\/+|\/+$/g, '');
  const matches = tree.entries.filter((e) => !prefix || e.path === prefix || e.path.startsWith(`${prefix}/`));
  return {
    rama: branch,
    carpeta: prefix || '(raíz)',
    total: matches.length,
    entradas: matches.slice(0, MAX_TREE_ENTRIES).map((e) => (e.type === 'tree' ? `${e.path}/` : e.path)),
    recortado: matches.length > MAX_TREE_ENTRIES || tree.truncated,
  };
}

export async function readRepoFiles(token, fullName, ref, paths) {
  const list = (Array.isArray(paths) ? paths : [paths]).filter(Boolean).slice(0, 8);
  let budget = MAX_TOTAL_CHARS;
  const files = [];
  for (const p of list) {
    if (budget <= 0) { files.push({ ruta: p, error: 'No se leyó: se alcanzó el máximo de texto por consulta.' }); continue; }
    try {
      const qs = ref ? `?ref=${encodeURIComponent(ref)}` : '';
      const text = await ghFetch(token, `/repos/${fullName}/contents/${encodePath(p)}${qs}`, { raw: true });
      if (typeof text !== 'string') { files.push({ ruta: p, error: 'Es una carpeta: usa la acción tree.' }); continue; }
      if (/\u0000/.test(text.slice(0, 2000))) { files.push({ ruta: p, error: 'Es un archivo binario.' }); continue; }
      const contenido = clip(text, Math.min(MAX_FILE_CHARS, budget));
      budget -= contenido.length;
      files.push({ ruta: p, lineas: text.split('\n').length, contenido });
    } catch (err) {
      files.push({ ruta: p, error: err.message });
    }
  }
  return { archivos: files };
}

export async function searchRepoCode(token, fullName, query) {
  const q = `${String(query ?? '').trim()} repo:${fullName}`;
  const data = await ghFetch(token, `/search/code?q=${encodeURIComponent(q)}&per_page=20`, { textMatch: true });
  return {
    total: data.total_count,
    nota: 'La búsqueda de GitHub solo cubre la rama principal y puede no incluir archivos muy grandes o recién subidos.',
    resultados: (data.items ?? []).map((it) => ({
      ruta: it.path,
      fragmentos: (it.text_matches ?? []).map((m) => clip(m.fragment ?? '', 600)).slice(0, 3),
    })),
  };
}

function formatCommitSummary(c) {
  return {
    sha: c.sha?.slice(0, 7),
    fecha: c.commit?.author?.date,
    autor: c.commit?.author?.name ?? c.author?.login,
    mensaje: clip(c.commit?.message ?? '', 500),
  };
}

export async function listRepoCommits(token, fullName, { ref, path, since, until, author, limit }) {
  const params = new URLSearchParams({ per_page: String(Math.min(Math.max(Number(limit) || 20, 1), 50)) });
  if (ref) params.set('sha', ref);
  if (path) params.set('path', path);
  if (since) params.set('since', new Date(since).toISOString());
  if (until) params.set('until', new Date(until).toISOString());
  if (author) params.set('author', author);
  const commits = await ghFetch(token, `/repos/${fullName}/commits?${params}`);
  return { commits: commits.map(formatCommitSummary) };
}

export async function getRepoCommit(token, fullName, sha) {
  const c = await ghFetch(token, `/repos/${fullName}/commits/${encodeURIComponent(sha)}`);
  let budget = MAX_TOTAL_CHARS;
  return {
    ...formatCommitSummary(c),
    mensaje: clip(c.commit?.message ?? '', 3000),
    cambios: { agregadas: c.stats?.additions, eliminadas: c.stats?.deletions },
    archivos: (c.files ?? []).slice(0, 40).map((f) => {
      const patch = budget > 0 && f.patch ? clip(f.patch, Math.min(MAX_PATCH_CHARS, budget)) : null;
      if (patch) budget -= patch.length;
      return { ruta: f.filename, estado: f.status, agregadas: f.additions, eliminadas: f.deletions, diff: patch };
    }),
  };
}

export async function listRepoPulls(token, fullName, { state = 'all', limit } = {}) {
  const s = ['open', 'closed', 'all'].includes(state) ? state : 'all';
  const pulls = await ghFetch(token, `/repos/${fullName}/pulls?state=${s}&sort=updated&direction=desc&per_page=${Math.min(Math.max(Number(limit) || 15, 1), 30)}`);
  return {
    pull_requests: pulls.map((p) => ({
      numero: p.number,
      titulo: p.title,
      estado: p.merged_at ? 'mergeado' : p.state === 'open' ? 'abierto' : 'cerrado',
      autor: p.user?.login,
      creado: p.created_at,
      mergeado: p.merged_at,
      rama: `${p.head?.ref} → ${p.base?.ref}`,
      descripcion: clip(p.body ?? '', 1500),
    })),
  };
}

// ── Formalizar commits ───────────────────────────────────────────────────

export async function listRepoBranches(token, fullName) {
  const branches = await ghFetch(token, `/repos/${fullName}/branches?per_page=100`);
  return branches.map((b) => b.name);
}

// Commits recientes con el sha completo, para elegir cuáles formalizar.
export async function listCommitsForFormalizing(token, fullName, branch, limit = 40) {
  const params = new URLSearchParams({ per_page: String(limit) });
  if (branch) params.set('sha', branch);
  const commits = await ghFetch(token, `/repos/${fullName}/commits?${params}`);
  return commits.map((c) => ({
    sha: c.sha,
    shortSha: c.sha.slice(0, 7),
    message: c.commit?.message ?? '',
    author: c.commit?.author?.name ?? c.author?.login ?? null,
    authorLogin: c.author?.login ?? null,
    date: c.commit?.author?.date ?? null,
    url: c.html_url,
  }));
}

// La única escritura en GitHub. Si el token es de solo lectura, GitHub responde 403/404 y la
// formalización igual queda guardada en Kai: el comentario es un extra, no la fuente de verdad.
export async function commentOnCommit(token, fullName, sha, body) {
  const res = await fetch(`${API}/repos/${fullName}/commits/${encodeURIComponent(sha)}/comments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'bonsight-kai',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body }),
  });
  if (res.ok) {
    const data = await res.json();
    return { ok: true, url: data.html_url };
  }
  if (res.status === 403 || res.status === 404) {
    return { ok: false, error: 'El token de GitHub no tiene permiso de escritura, así que no se dejó el comentario en el commit.' };
  }
  return { ok: false, error: `GitHub no aceptó el comentario (${res.status}).` };
}

// Datos básicos de un commit, confirmados contra GitHub (nunca se confía en lo que manda el navegador).
export async function getCommitBasic(token, fullName, sha) {
  const c = await ghFetch(token, `/repos/${fullName}/commits/${encodeURIComponent(sha)}`);
  return {
    sha: c.sha,
    shortSha: c.sha.slice(0, 7),
    message: c.commit?.message ?? '',
    author: c.commit?.author?.name ?? c.author?.login ?? null,
    date: c.commit?.author?.date ?? null,
    url: c.html_url,
  };
}
