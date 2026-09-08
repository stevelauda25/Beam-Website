/**
 * Hero reveal tuning snapshot endpoint — DEV SERVER ONLY.
 *
 * Lets the Motion Lab hand the tuning it currently holds to the repo as a
 * reviewable file, so approved values can be promoted into the checked-in
 * production defaults without anyone copying numbers out of a browser.
 *
 *   POST /__beam/hero-reveal-snapshot   body: the snapshot JSON
 *     -> writes src/dev/motion-lab/tuning/snapshots/hero-reveal.snapshot.json
 *   GET  /__beam/hero-reveal-snapshot
 *     -> returns that file, or `{ ok: true, exists: false }` when none is saved
 *
 * WHAT THIS DOES NOT DO. It never touches the production defaults
 * (heroRevealTimeline.ts / heroRevealComposition.ts). The snapshot file is the
 * review artefact; baking it into source is a separate, deliberate edit.
 *
 * `apply: 'serve'` means the plugin is not even instantiated for `vite build`,
 * and the route is a dev-server middleware, so nothing here can reach the
 * production bundle or a Vercel deployment. The target path is fixed — the
 * request cannot choose where to write.
 *
 * Plain JavaScript rather than TypeScript on purpose: the project has no
 * @types/node, and this is the one file that needs Node's fs. A sibling
 * .d.mts gives vite.config.ts its types.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const HERO_SNAPSHOT_ROUTE = '/__beam/hero-reveal-snapshot';
export const HERO_SNAPSHOT_FILE = 'src/dev/motion-lab/tuning/snapshots/hero-reveal.snapshot.json';

/** Generous for a tuning payload (a few KB), tight enough to refuse abuse. */
const MAX_BODY_BYTES = 256 * 1024;

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error(`Body larger than ${MAX_BODY_BYTES} bytes`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/** Minimal shape check: the lab's snapshot file always carries these. */
function isSnapshotShape(value) {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof value.base === 'object' &&
    value.base !== null &&
    typeof value.responsive === 'object' &&
    value.responsive !== null
  );
}

export function heroRevealSnapshotPlugin() {
  return {
    name: 'beam:hero-reveal-snapshot',
    apply: 'serve',
    configureServer(server) {
      const file = path.resolve(server.config.root, HERO_SNAPSHOT_FILE);

      server.middlewares.use(HERO_SNAPSHOT_ROUTE, async (req, res) => {
        try {
          if (req.method === 'GET') {
            let raw;
            try {
              raw = await readFile(file, 'utf8');
            } catch (error) {
              if (error && error.code === 'ENOENT') {
                // 200, not 404: "nothing saved yet" is a normal state, and a
                // 404 would log a red console error every time the lab opens.
                send(res, 200, { ok: true, exists: false, path: HERO_SNAPSHOT_FILE });
                return;
              }
              throw error;
            }
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store');
            res.end(raw);
            return;
          }

          if (req.method !== 'POST') {
            res.setHeader('Allow', 'GET, POST');
            send(res, 405, { ok: false, error: 'GET or POST only' });
            return;
          }

          const parsed = JSON.parse(await readBody(req));
          if (!isSnapshotShape(parsed)) {
            send(res, 400, { ok: false, error: 'Expected a snapshot with `base` and `responsive`' });
            return;
          }

          await mkdir(path.dirname(file), { recursive: true });
          await writeFile(file, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
          server.config.logger.info(`[hero-reveal-snapshot] wrote ${HERO_SNAPSHOT_FILE}`);
          send(res, 200, { ok: true, path: HERO_SNAPSHOT_FILE });
        } catch (error) {
          send(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
        }
      });
    },
  };
}
