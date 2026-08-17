/**
 * dsh-mcp-list — Host half.
 *
 * Registers same-origin HTTP routes under `/mcp-list` that the web Client
 * half consumes:
 *   GET  /mcp-list/servers            → grouped MCP server/tool inventory
 *   GET  /mcp-list/counts?refresh=1   → per-tool call counts over recent sessions
 *   POST /mcp-list/open-config        → open cordis.patch.yml in the system editor
 *
 * Everything is read-only except open-config, which shells out to `open` /
 * `xdg-open` on the deployment's MCP patch file.
 */

/** @satisfies {import('@deepseek-ai/cordis').Plugin} */
export const inject = ['webServer'];

const COUNT_SESSION_LIMIT = 30;
const MCP_NAME_RE = /mcp__[A-Za-z0-9_-]+__[A-Za-z0-9_-]+/g;

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 64 * 1024) req.destroy();
    });
    req.on('end', () => resolve(data));
    req.on('error', () => resolve(''));
  });
}

/** Group live `mcp__<server>__<tool>` schemas into a server inventory. */
function collectServers(ctx) {
  const tools = ctx.get('tools');
  if (tools === undefined) return [];
  const byServer = new Map();
  for (const schema of tools.schemas() || []) {
    const name = schema && schema.name;
    if (typeof name !== 'string' || !name.startsWith('mcp__')) continue;
    const parts = name.split('__');
    if (parts.length < 3) continue;
    const server = parts[1];
    if (!byServer.has(server)) byServer.set(server, []);
    const description =
      typeof schema.description === 'string' ? schema.description : '';
    const full = description.replace(/[\t ]*\n[\t ]*/g, '\n').trim();
    const cleaned = full.replace(/\s+/g, ' ').trim();
    byServer.get(server).push({
      name: parts.slice(2).join('__'),
      description:
        cleaned.length > 160
          ? cleaned.slice(0, 160).replace(/\s+\S*$/, '') + '…'
          : cleaned,
      fullDescription: full,
    });
  }
  const servers = [];
  for (const [server, toolList] of byServer) {
    toolList.sort((a, b) => a.name.localeCompare(b.name));
    servers.push({ name: server, toolCount: toolList.length, tools: toolList });
  }
  servers.sort((a, b) => a.name.localeCompare(b.name));
  return servers;
}

/**
 * Scan recent sessions (index-free) and count occurrences of every
 * `mcp__<server>__<tool>` full name in event semantic text.
 */
async function collectCounts(ctx) {
  const sessionQuery = ctx.get('sessionQuery');
  if (
    sessionQuery === undefined ||
    typeof sessionQuery.listSessions !== 'function' ||
    typeof sessionQuery.filterEvents !== 'function'
  ) {
    return {};
  }
  const records = await sessionQuery.listSessions();
  const recent = (records || []).slice(0, COUNT_SESSION_LIMIT);
  const counts = Object.create(null);
  for (const record of recent) {
    const header = record && record.header;
    const sessionId = header && header.id;
    if (!sessionId) continue;
    let docs;
    try {
      docs = await sessionQuery.filterEvents(sessionId, [
        { kind: 'text', text: 'mcp__' },
      ]);
    } catch {
      continue;
    }
    for (const doc of docs || []) {
      const text = typeof doc.text === 'string' ? doc.text : '';
      if (!text) continue;
      MCP_NAME_RE.lastIndex = 0;
      let m;
      while ((m = MCP_NAME_RE.exec(text)) !== null) {
        counts[m[0]] = (counts[m[0]] || 0) + 1;
      }
    }
  }
  return counts;
}

const OPEN_CONFIG_SCRIPT =
  'f=$(grep -l dsh-mcp-client "${DSH_HOME:-$HOME/.dsh}"/profiles/*/cordis.patch.yml 2>/dev/null | head -n 1); ' +
  'if [ -z "$f" ]; then exit 3; fi; ' +
  'echo "$f"; ' +
  'if command -v open >/dev/null 2>&1; then exec open "$f"; ' +
  'elif command -v xdg-open >/dev/null 2>&1; then exec xdg-open "$f"; ' +
  'else exit 4; fi';

/** Locate the MCP patch file and open it with the system editor. */
async function openConfig(ctx) {
  const subprocess = ctx.get('subprocess');
  if (subprocess === undefined) {
    return { error: 'subprocess service unavailable' };
  }
  try {
    const handle = subprocess.spawn({
      argv: ['/bin/sh', '-c', OPEN_CONFIG_SCRIPT],
      cwd: '/',
      stdio: {
        stdin: 'ignore',
        stdout: { maxBytes: 8192 },
        stderr: { maxBytes: 8192 },
      },
      graceMs: 5000,
    });
    if (handle.pid < 0) return { error: 'failed to spawn /bin/sh' };
    const outcome = await handle.done;
    let outText = '';
    if (handle.collected && handle.collected.stdout) {
      const read = await handle.collected.stdout.readFrom(0);
      outText = (read && read.text ? read.text : '').trim();
    }
    if (outcome.exitCode === 0 && outText) {
      return { path: outText.split('\n')[0] };
    }
    let errText = '';
    if (handle.collected && handle.collected.stderr) {
      const read = await handle.collected.stderr.readFrom(0);
      errText = (read && read.text ? read.text : '').trim();
    }
    if (outcome.exitCode === 3) {
      return {
        error: 'cordis.patch.yml with MCP servers not found under $DSH_HOME/profiles',
      };
    }
    if (outcome.exitCode === 4) {
      return {
        path: outText.split('\n')[0],
        error: 'no system opener (open/xdg-open) available',
      };
    }
    return {
      path: outText.split('\n')[0],
      error:
        'opener exited with code ' +
        String(outcome.exitCode) +
        (errText ? ': ' + errText : ''),
    };
  } catch (err) {
    return { error: String((err && err.message) || err) };
  }
}

export function apply(ctx) {
  let countsCache = null;
  let counting = null;

  function getCounts(refresh) {
    if (countsCache !== null && !refresh) {
      return Promise.resolve({ counts: countsCache, cached: true });
    }
    if (counting !== null) return counting;
    counting = (async () => {
      try {
        const counts = await collectCounts(ctx);
        countsCache = counts;
        return { counts };
      } finally {
        counting = null;
      }
    })();
    return counting;
  }

  const disposeRoute = ctx.webServer.register({
    kind: 'prefix',
    path: '/mcp-list',
    handler: async (req, res) => {
      let url;
      try {
        url = new URL(req.url, 'http://localhost');
      } catch {
        sendJson(res, 400, { error: 'bad request' });
        return;
      }
      const route = url.pathname.replace(/\/+$/, '') || '/';
      try {
        if (req.method === 'GET' && route === '/mcp-list/servers') {
          sendJson(res, 200, { servers: collectServers(ctx) });
          return;
        }
        if (req.method === 'GET' && route === '/mcp-list/counts') {
          const refresh = url.searchParams.get('refresh') === '1';
          sendJson(res, 200, await getCounts(refresh));
          return;
        }
        if (req.method === 'POST' && route === '/mcp-list/open-config') {
          await readBody(req);
          sendJson(res, 200, await openConfig(ctx));
          return;
        }
        sendJson(res, 404, { error: 'not found' });
      } catch (err) {
        sendJson(res, 500, { error: String((err && err.message) || err) });
      }
    },
  });

  ctx.effect(() => disposeRoute, 'dsh-mcp-list.webServerRoute');
}
