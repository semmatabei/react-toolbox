# PM Sandbox — Hobbyist / OSS Variant

**Companion to** `pm-sandbox-spec.md` — same product, same architecture, every component swapped for a free or open-source alternative.

**When to use this:** solo developer, side project, internal tool for a tiny team, prototype before committing to the full stack. Up to ~5 concurrent PMs, ~50 sandboxes/day. Single region. No SLA.

**Total fixed cost: $0** (Oracle Cloud Always Free) or **~$5/month** (Hetzner). **LLM cost: $0** if every PM stays under 100 requests/day on opencode Zen free.

---

## 1. Component swap table

| Reference (`pm-sandbox-spec.md`) | Hobbyist swap | Cost |
|---|---|---|
| Next.js on Vercel | **Cloudflare Pages** (Next.js or SvelteKit) | Free |
| Fastify API on a managed host | **Cloudflare Workers** + Hono router | Free (100k req/day) |
| Postgres (Neon) + Drizzle | **Cloudflare D1** (SQLite) + Drizzle | Free (5 GB) |
| Upstash Redis | **Cloudflare Durable Objects** (one DO per sandbox session) | Free (since Apr 2025, 13k GB-s/day) |
| Fly Machines (sandbox runtime) | **Oracle Cloud Always Free VM** (4 ARM Ampere cores, 24 GB RAM) running Docker; OR Hetzner CX22 €4.50/mo | $0 / $5 |
| Custom `agentd` binary | **opencode** CLI (sst/opencode) running headless inside each container | Free (MIT) |
| Anthropic Claude SDK | **opencode Zen** free tier — `zen-default`, `zen-advanced`, `zen-fast`, no API key, 100 req/day per user | Free |
| Anthropic API key (paid) | none in v1; if you need >100 req/day, fall back to **Groq free** (Llama 3.1 70B) or local Ollama | Free → free |
| Cloudflare Worker + DO for `*.preview` | Same — but on free Workers tier | Free |
| Wildcard cert via Cloudflare | Same | Free |
| GitHub App (`@octokit/auth-app`) | Same — GitHub Apps are free | Free |
| Auth.js + GitHub OAuth | Same | Free |
| Sentry / Honeycomb / Datadog | **Axiom free tier** (500 GB/mo logs) or **BetterStack free tier** | Free |
| Vercel CI | **GitHub Actions** (2,000 min/mo free for private repos, unlimited public) | Free |
| Container registry | **GitHub Container Registry** (ghcr.io) | Free for public images |

---

## 2. Architecture

```mermaid
flowchart LR
    subgraph Browser
        UI[Cloudflare Pages<br/>Next.js chat UI]
    end

    subgraph "Cloudflare (free tier)"
        WK[Workers<br/>API + chat orchestration]
        DO[Durable Object<br/>per sandbox]
        D1[(D1 SQLite)]
        PROXY[Worker on *.preview.app<br/>+ DO for routing]
        TUN[Cloudflare Tunnel]
    end

    subgraph "Single VPS<br/>(Oracle free / Hetzner €5)"
        DOCKER[Docker daemon<br/>cloudflared client]
        subgraph "Sandbox container"
            OC[opencode CLI<br/>--provider zen]
            DEV[dev server<br/>:5173]
            FS[(/workspace)]
        end
    end

    UI -- HTTPS + WSS --> WK
    UI -- HTTPS --> PROXY
    WK <--> D1
    WK <--> DO
    WK -- create/stop container<br/>over Tunnel mTLS --> DOCKER
    DOCKER --> OC
    OC <--> FS
    DEV <--> FS
    PROXY -- via Tunnel --> DEV
    DOCKER -- outbound only --> TUN
    TUN -- persistent QUIC --> PROXY
```

The single substantive design change vs the reference spec: **no orchestration plane**. The VPS runs Docker, and a tiny "host agent" exposes a small mTLS-protected HTTP API (`POST /sandbox`, `DELETE /sandbox/:id`) over Cloudflare Tunnel so the Worker can drive it without giving the VPS a public IP.

---

## 3. Sandbox container — Dockerfile

```dockerfile
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    git ripgrep ca-certificates curl bash \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable

# opencode — single binary
RUN curl -fsSL https://opencode.ai/install | bash \
    && mv /root/.opencode/bin/opencode /usr/local/bin/opencode

WORKDIR /workspace
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
```

`entrypoint.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Configure git for App-installation token (passed by host agent)
git config --global credential.helper store
echo "https://x-access-token:${GITHUB_TOKEN}@github.com" > ~/.git-credentials

if [ ! -d /workspace/.git ]; then
  git clone --depth=50 --branch "${REPO_BRANCH}" "${REPO_URL}" /workspace
fi

# opencode auth was baked into the image during build:
#   RUN opencode auth login --provider zen --token "$ZEN_BOOTSTRAP_TOKEN"
# OR auth happens per-session by mounting ~/.opencode/auth.json from the host.

# Run opencode in headless server mode. Port 4096 is the local TUI server;
# we drive it via its JSON-RPC over a Unix socket the host agent forwards.
exec opencode serve --headless --workspace /workspace --port 4096
```

Image size: ~180 MB.

---

## 4. Why opencode + Zen free is the right choice here

- **Zero API-key handling in the control plane.** Each container runs `opencode auth login --provider zen` once. The Worker never proxies LLM calls itself — it just relays user messages into opencode via its local server, and reads back the streamed responses + tool events.
- **Tool registry comes for free.** opencode already implements `read_file`, `edit`, `bash`, `glob`, `grep`, LSP integration, file diffs, git operations. You don't write `agentd` from scratch — you wrap an existing CLI.
- **100 req/day per PM** is plenty for early users. A typical PM session is 10–20 turns.
- **Three Zen models** map onto your UI: a `Quick / Default / Advanced` selector that picks `zen-fast / zen-default / zen-advanced`.
- **MIT-licensed**; you can fork or ship it inside your image without restrictions.
- When a PM hits the daily Zen limit, fall back gracefully: surface a "use your own key" panel and let them paste a Groq or OpenAI key, persisted only inside their container's `~/.opencode/auth.json` (never on your servers).

---

## 5. The "host agent" on the VPS (~150 LOC of Go or Node)

A single binary that listens on a Unix socket which Cloudflare Tunnel exposes as an HTTPS endpoint with mTLS. Endpoints:

```
POST   /sandbox            { repo_url, branch, github_token, sandbox_id }
                           -> { container_id, dev_port_range }
DELETE /sandbox/:id
GET    /sandbox/:id/status -> { running, dev_ports[], idle_secs }
WS     /sandbox/:id/agent  -> bridges to opencode's JSON-RPC inside the container
WS     /sandbox/:id/dev    -> bridges to a dynamic dev server port
```

Implementation: `dockerode` (or `os/exec docker`) for lifecycle, `node-pty` or stdin/stdout pipes for opencode I/O. Use a port-range pool (e.g. 30000–30999) and assign one per sandbox.

**Capacity on Oracle Always Free** (4 ARM cores, 24 GB RAM): with 1.5 GB per container, ~12 concurrent sandboxes. Reaper kills anything idle for 20 min.

---

## 6. Preview proxy — same as reference, free tier

The reference spec's Cloudflare Worker + Durable Object pattern works **identically** on the free plan now that Cloudflare ships DO with SQLite storage on Workers Free. The only adjustments:

- Keep total Worker invocations under **100k/day** (preview HTML hits + WS handshakes count; HMR frames after the upgrade do not).
- DO storage cap is **5 GB across the account** — fine, you store a few KB per sandbox.
- Workers Free has a **10 ms CPU per invocation** limit. The proxy logic (lookup DO, sign cookie, forward) fits in <1 ms; just don't do anything heavy in the Worker.

The Tunnel bit is what makes this work without a public IP on the VPS:

```
PM browser → https://<id>.preview.pm.example.com
           → Cloudflare edge → Worker → DO (route lookup)
           → Cloudflare Tunnel (existing QUIC connection from VPS)
           → Docker host port → container :5173 (vite)
```

HMR WebSockets ride the same tunnel.

---

## 7. Web frontend on Cloudflare Pages

- Next.js with `@cloudflare/next-on-pages` adapter, OR plain SvelteKit + adapter-cloudflare (smaller, faster cold start).
- Auth.js with the Cloudflare KV adapter (free) for session storage.
- Chat UI talks to the Worker API via `/api/*` routes (Pages Functions), which Hono+Workers serves.
- Monaco editor: same — load from CDN.

---

## 8. GitHub App on the cheap

- Create a GitHub App in your personal account, set Webhooks → "off" (you don't need them in v1).
- Permissions: `Contents: read & write`, `Pull requests: read & write`, `Metadata: read`.
- Store the App's private key in Cloudflare Workers **Secrets** (free, encrypted at rest).
- Mint installation tokens with `octokit/auth-app` inside the Worker. The Worker does work fine with `@octokit/*` (use the `web` builds).

---

## 9. Cost ceiling — concrete numbers

Assume **3 PMs**, **20 sandbox sessions per day**, **30 min average session**:

| Item | Usage | Cost |
|---|---|---|
| Oracle Always Free VM | 24/7 | **$0** |
| Cloudflare Pages | ~5k req/day | **$0** |
| Cloudflare Workers (API + proxy) | ~30k req/day | **$0** (cap 100k) |
| Cloudflare D1 | <100 MB | **$0** (cap 5 GB) |
| Cloudflare Durable Objects | ~3 GB-s/day | **$0** (cap 13,000 GB-s) |
| Cloudflare Tunnel | unlimited bandwidth | **$0** |
| Cloudflare DNS + wildcard TLS | one zone | **$0** |
| GitHub App + Actions | <500 min/mo | **$0** |
| LLM (opencode Zen free) | 60 turns/PM/day | **$0** (cap 100/PM) |
| **Total** | | **$0/mo** |

If Oracle Always Free runs out (regional capacity is sometimes tight in 2026), substitute **Hetzner CX22** (€4.51/mo) and the only line that changes is +€4.51.

---

## 10. What you give up vs the reference spec

- **No managed Postgres.** D1 is SQLite — single-writer, no `JSONB`, no full-text search worth using. Schema works but plan for migration if you grow.
- **CPU-bound logic in the Worker is constrained** (10 ms). Anything heavier than routing belongs on the VPS host agent.
- **Single region.** Sandboxes live where the VPS lives. Latency for anyone far from that region will be worse — but the chat path goes Worker→VPS regardless, so this is mostly a preview-iframe concern.
- **No sandbox isolation beyond Docker.** Containers share a kernel. For a hobbyist tool used by people you trust, fine. For untrusted code, run **gVisor** (`runsc`) as the Docker runtime — still free, adds true syscall isolation. See enterprise variant for full Firecracker/Kata.
- **No HA.** VPS down = product down. Acceptable for the intended audience; if you need uptime, this isn't the variant.
- **opencode Zen rate limit (100/day).** Built-in escape hatch: per-PM "bring your own key" UI that pipes into the container's `opencode auth login` for any of the 75+ providers it supports.

---

## 11. Phased build (parallel to the reference 5-phase plan)

1. **Bootstrap the VPS.** Oracle/Hetzner box, Docker, Cloudflare Tunnel installed, host agent compiled and running. Smoke test: `curl -sS https://host.example.com/healthz` from anywhere returns 200.
2. **One-shot sandbox.** Host agent creates a container from the image, opencode authenticates to Zen, you can SSH into the container and run `opencode "say hello"` interactively.
3. **Worker proxy + DO.** Wildcard DNS, signed cookie auth, end-to-end test: open a static `index.html` served from inside a container at `https://test.preview.example.com`.
4. **Pages chat UI.** Connects Worker → host agent → opencode JSON-RPC, streams responses. File tree from opencode's file events.
5. **Real dev server preview + GitHub PRs.** End-to-end PM flow.

Each phase ends with something demoable.

---

## 12. Footguns specific to this stack

1. **Cloudflare Tunnel idle timeouts.** Default is 90 s for HTTP keep-alive. Set `keepAliveConnections: 10, keepAliveTimeout: 90s` in the tunnel config and disable Vite's HMR ping suppression. Otherwise HMR breaks after a minute.
2. **D1 is eventually consistent across the network.** Reads after a write may see the old row for a few hundred ms. Use `prepare(...).first()` from the same Worker isolate that did the write — Cloudflare guarantees read-your-writes there.
3. **Workers Free CPU = 10 ms.** Even small JSON parsing of a 1 MB payload can blow this. Cap request body sizes at 256 KB on the Worker side; bigger payloads (file content) flow over the Tunnel directly to the host agent.
4. **opencode Zen daily limit is per-account, not per-IP.** If you bake a single Zen account into the image, all your PMs share 100 req/day. Either (a) run `opencode auth login` per session with a PM-specific Zen account, (b) ship a per-PM Groq token, or (c) make this a paid product before you have 5 PMs.
5. **ARM containers on Oracle.** The image must be `linux/arm64` — `docker buildx build --platform linux/arm64 -t ghcr.io/you/sandbox .`. Most npm packages have ARM prebuilds; check `better-sqlite3`, `node-pty`, `esbuild`.
6. **Cloudflare Pages doesn't run Node WebSockets.** Both server-side WS endpoints must live in **Workers** (not Pages Functions). Use `wrangler` to deploy them as a sibling Worker on the same zone.

---

## 13. Migration path to the reference spec

Every component in this variant maps to a paid equivalent without rewriting application code:

- D1 → Postgres: swap Drizzle adapter (`drizzle-orm/d1` → `drizzle-orm/postgres-js`).
- Workers API → Fastify on Fly: same Hono routes; Hono runs on Node too.
- Single-VPS Docker → Fly Machines: replace host agent with the Fly Machines REST client.
- opencode → custom `agentd`: keep opencode, or move to a custom loop when you outgrow Zen.
- Cloudflare Tunnel → public ingress on Fly: delete the tunnel.

The **proxy + DO design and the GitHub App auth model do not change at all**. That's deliberate — those are the load-bearing pieces.
