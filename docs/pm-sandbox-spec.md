# PM Sandbox — Technical Specification

**Status:** ready-to-build
**Audience:** the engineering agent that will implement this end-to-end
**Format:** opinionated. Make every choice unless the spec says otherwise.

**Variants:** this is the **reference** stack (small SaaS / startup scale). Two siblings exist:

- [`pm-sandbox-hobbyist.md`](./pm-sandbox-hobbyist.md) — $0/mo, Cloudflare free tier + opencode + Zen free model, single Oracle/Hetzner VPS.
- [`pm-sandbox-enterprise-aws.md`](./pm-sandbox-enterprise-aws.md) — full AWS, Bedrock, EKS + Kata/Firecracker isolation, SSO, audit-ready.

---

## 1. Product summary

A web app where a Product Manager can:

1. Open a chat, pick a repo + branch, and click **Start sandbox**. A fresh isolated VM boots in seconds with the repo cloned.
2. Talk to an LLM agent that reads/writes files and runs commands inside that VM (the only place code touches disk).
3. See the workspace as a live file tree + editor (read/write through the agent, not direct typing) on the right of the chat.
4. Open a **Preview** tab that shows the dev server running inside the sandbox (`vite dev`, `next dev`, etc.) at a URL the PM can browse, share, and click through. Hot reload works.
5. Click **Open PR** when happy. The agent commits, pushes, and opens a pull request on the linked GitHub repo.

Everything is per-PM, ephemeral, and isolated. Sandboxes auto-stop after idle timeout.

### Non-goals (v1)

- No multi-user collab inside one sandbox (single PM per session).
- No self-hosted GitLab / Bitbucket — GitHub only.
- No GPU sandboxes, no persistent volumes between sessions (treat sandbox as cattle, not pets).
- No on-prem deployment — SaaS only.
- No direct typing in the editor by the PM — all edits go through the agent. (Read-only Monaco view + agent-driven diffs. This dramatically simplifies state.)

---

## 2. Architecture at a glance

```mermaid
flowchart LR
    subgraph Browser
        UI[Next.js web app<br/>chat • file tree • Monaco • Preview iframe]
    end

    subgraph "Control plane (your infra)"
        API[api.pm-sandbox.app<br/>Node + Fastify]
        DB[(Postgres)]
        REDIS[(Redis)]
        ORCH[Sandbox orchestrator]
        PROXY[*.preview.pm-sandbox.app<br/>edge reverse proxy]
        GHAPP[GitHub App<br/>installation token mint]
        LLM[LLM provider<br/>Anthropic / OpenAI]
    end

    subgraph "Sandbox VM (Fly Machine)"
        AGENTD[agentd<br/>tool exec + WS client]
        CODESRV[code-server<br/>read-only Monaco]
        DEV[dev server<br/>vite/next on :3000-:9999]
        FS[(/workspace)]
    end

    UI -- HTTPS + WSS --> API
    UI -- HTTPS --> PROXY
    API <--> DB
    API <--> REDIS
    API --> ORCH
    API --> GHAPP
    API <-- WSS tool channel --> AGENTD
    API <-- LLM chat completions --> LLM
    ORCH -- create/start/stop --> AGENTD
    AGENTD <--> FS
    DEV <--> FS
    CODESRV <--> FS
    PROXY -- HTTP+WS upgrade --> DEV
    PROXY -- HTTP+WS upgrade --> CODESRV
```

**Two outbound pipes from the sandbox:**

1. `agentd → API` — single multiplexed WebSocket (gRPC-web or raw WS). Tool calls in, results out. Authenticated by `VM_JWT`.
2. `dev server / code-server → public` — accepted by the **edge proxy** at `<sandbox-id>.preview.pm-sandbox.app`. Authenticated by signed cookie set when the user opens the sandbox.

Inbound to the sandbox: **none**. The VM never accepts a connection it didn't initiate. The "preview proxy" works because the proxy holds the connection state and the sandbox dialled out to it on boot (see §7.4).

---

## 3. Tech stack — concrete choices

Every choice below is the default. Don't deviate without a written reason.

| Layer | Choice | Why |
|---|---|---|
| Web frontend | Next.js 15 (App Router), React 19, Tailwind v4, shadcn/ui | Same stack the agent will edit; fewest surprises |
| Realtime to browser | Native WebSocket via Next.js route handler + `ws` lib (no Socket.IO) | One transport, no fallback complexity |
| Backend API | Node 22 + Fastify + tRPC (typed RPC for the chat ops) | Type-safe end-to-end with Next |
| DB | Postgres 16 (Neon or Supabase) + Drizzle ORM | Drizzle migrations are single-binary, agent-friendly |
| Cache / pubsub | Upstash Redis | For per-sandbox session state and orchestrator cross-talk |
| Sandbox runtime | **Fly Machines** (primary). Alt: E2B for prototype | Fly gives full root, public IPs per machine, fast cold start (~3s), per-second billing |
| Container image | Docker, built once, pushed to Fly registry | Reproducible |
| Edge proxy | Cloudflare Worker + Durable Object (one DO per sandbox) | Solves WS upgrade, sticky routing, signed-cookie auth for `*.preview.pm-sandbox.app` |
| Auth (PM ↔ app) | GitHub OAuth via Auth.js | PMs already have GitHub identity |
| Auth (app ↔ GitHub repo) | GitHub App (separate from OAuth), `@octokit/auth-app` | Short-lived `ghs_…` installation tokens |
| Editor view | `@monaco-editor/react`, read-only | Don't run code-server until v2 — Monaco alone is enough for read-only viewing of agent edits |
| File tree | Hand-rolled (`react-arborist`) fed by API events | shadcn doesn't ship one |
| LLM | Anthropic Claude (Sonnet) via `@anthropic-ai/sdk` | Best tool-use behaviour today |
| Tool protocol inside sandbox | Custom JSON over WS (see §6) | MCP is overkill for v1 |
| Telemetry | OpenTelemetry → Honeycomb / Datadog | Trace every chat turn end-to-end |
| Secrets in VM | Injected as env vars at machine create | Never on disk |

---

## 4. Repository layout

Single monorepo, pnpm workspaces.

```
pm-sandbox/
├─ apps/
│  ├─ web/              # Next.js — chat UI + Monaco + preview iframe
│  └─ api/              # Fastify control plane
├─ services/
│  ├─ proxy/            # Cloudflare Worker — *.preview.pm-sandbox.app
│  └─ agentd/           # Node binary that runs inside every sandbox VM
├─ packages/
│  ├─ db/               # Drizzle schema + migrations
│  ├─ shared/           # zod schemas, tool contracts, JWT helpers
│  └─ llm/              # Tool registry, system prompt, agent loop
├─ infra/
│  ├─ sandbox-image/    # Dockerfile + entrypoint for the VM image
│  ├─ fly/              # fly.toml templates, machine create scripts
│  └─ terraform/        # Cloudflare DNS + Worker + Postgres
└─ docs/
```

---

## 5. Data model (Drizzle)

```ts
// packages/db/schema.ts (sketch)
users          (id, github_user_id, email, name, avatar_url, created_at)
github_installs(id, user_id, installation_id, account_login, created_at)
repos          (id, install_id, github_repo_id, full_name, default_branch)
sandboxes      (id, user_id, repo_id, branch, status, fly_machine_id,
                fly_app, vm_jwt_jti, preview_subdomain, dev_port,
                last_active_at, expires_at, created_at)
                -- status: provisioning | running | idle | stopped | error
conversations  (id, sandbox_id, title, created_at)
messages       (id, conversation_id, role, content, created_at)
                -- role: user | assistant | tool_result
tool_calls     (id, message_id, name, args_json, result_json,
                duration_ms, status, started_at)
file_changes   (id, sandbox_id, message_id, path, change_type, diff)
                -- change_type: create | update | delete | rename
audit_log      (id, user_id, sandbox_id, action, payload_json, ts)
```

Indices: `sandboxes(user_id, status)`, `sandboxes(last_active_at)` for the reaper, `messages(conversation_id, created_at)`.

---

## 6. The tool contract (LLM ↔ agentd)

The LLM never talks to the sandbox directly. Flow:

```
LLM tool_use → API.agent loop → WS frame → agentd → exec → result frame → API → LLM
```

### 6.1 Tool registry (v1)

| Tool | Args | Returns | Notes |
|---|---|---|---|
| `read_file` | `path: string, offset?: number, limit?: number` | `{content, truncated}` | UTF-8 only, 1 MB cap |
| `write_file` | `path: string, content: string` | `{bytes_written}` | Creates dirs as needed |
| `edit_file` | `path: string, old_string: string, new_string: string, replace_all?: boolean` | `{replacements}` | Same semantics as Cursor's StrReplace |
| `list_dir` | `path: string` | `{entries: [{name, type, size}]}` | One level |
| `glob` | `pattern: string, cwd?: string` | `{paths: string[]}` | Uses `fast-glob` |
| `grep` | `pattern: string, path?: string, glob?: string` | `{matches: [...]}` | Shell out to `rg` |
| `run_command` | `cmd: string, cwd?: string, timeout_ms?: number, background?: boolean` | `{stdout, stderr, exit_code, pid?}` | Bash. Background returns immediately with `pid` |
| `read_terminal` | `pid: number, since_byte?: number` | `{chunk, eof, next_offset}` | For long-running output |
| `git` | `subcommand: string, args: string[]` | `{stdout, stderr, exit_code}` | Allowlisted: status, diff, add, commit, branch, checkout, push, log |
| `open_pr` | `title: string, body: string, base: string` | `{url, number}` | API does the actual GitHub call; agentd just signals intent |
| `start_dev_server` | `cmd: string, port?: number` | `{pid, port, preview_url}` | Wraps `run_command` background + registers port with proxy |

### 6.2 WebSocket frame format

```ts
// shared/ws-protocol.ts
type ClientFrame =        // API → agentd
  | { kind: "tool_call"; id: string; tool: string; args: unknown }
  | { kind: "cancel"; id: string }
  | { kind: "ping" };

type ServerFrame =        // agentd → API
  | { kind: "tool_result"; id: string; ok: true;  data: unknown }
  | { kind: "tool_result"; id: string; ok: false; error: string }
  | { kind: "tool_progress"; id: string; chunk: string }   // streaming stdout
  | { kind: "fs_event"; path: string; change: "create"|"update"|"delete" }
  | { kind: "port_open"; port: number; pid: number }
  | { kind: "pong" };
```

`fs_event` and `port_open` are unsolicited — they come from inotify and a polling port-watcher inside agentd. The API forwards them to the browser so the file tree and Preview tab update without polling.

---

## 7. Service-by-service spec

### 7.1 `services/agentd` — runs inside every sandbox VM

Single Node binary, ~1500 LOC total.

**Responsibilities:**
- On start: read `VM_JWT`, `CONTROL_WS_URL`, `WORKSPACE_DIR`, `GITHUB_TOKEN` from env. Configure git credential helper to use `GITHUB_TOKEN`. Clone the repo if `/workspace/.git` is absent.
- Open WebSocket to `CONTROL_WS_URL` with `Authorization: Bearer ${VM_JWT}`. Reconnect with exponential backoff.
- Implement every tool in §6.1. One handler per tool, dispatched off the `tool` field.
- Keep a `Map<pid, ChildProcess>` for background commands. Stream their stdout/stderr in 4 KB chunks via `tool_progress`.
- Watch `/workspace` with `chokidar` (ignore `.git/`, `node_modules/`). Coalesce events at 200 ms.
- Watch `/proc/net/tcp` every 2s. When a new LISTEN appears on a port between 3000–9999, emit `port_open`.
- Heartbeat: `ping` every 15s, drop connection after 3 missed `pong`s, then reconnect.

**Hard limits enforced in agentd (defence in depth, real limits live at the orchestrator):**
- `run_command` total wallclock cap: 10 min foreground, 1 h background.
- `read_file` rejects > 5 MB.
- Refuse paths outside `/workspace` (resolve symlinks, check prefix).

### 7.2 `services/proxy` — Cloudflare Worker + Durable Object

Routes `*.preview.pm-sandbox.app` to the right sandbox.

- DNS: wildcard CNAME → Worker.
- Worker extracts `<sandbox-id>` from the host header. Looks up the Durable Object for that sandbox.
- The DO holds: `{fly_machine_ip, dev_port, allowed_user_id, expires_at}`. Populated by the API at sandbox boot via an internal mutation endpoint (signed with a shared HMAC).
- DO checks the `pm_sandbox_preview` cookie (signed JWT, contains `user_id` + `sandbox_id`). If absent or wrong user, redirect to `app.pm-sandbox.app/preview-auth?sandbox=<id>` which sets the cookie after verifying the user owns the sandbox.
- Once authorised, DO does `fetch(http://${ip}:${port}${url.pathname}${url.search}, {headers, body, method})` for HTTP, and uses `WebSocketPair` to bridge upgrades for HMR.

**Why a DO per sandbox?** Sticky routing for HMR sessions and a place to terminate the WS upgrade without holding state in the Worker isolate.

### 7.3 `apps/api` — the control plane

Endpoints (Fastify + tRPC unless noted):

| Path | Method | Purpose |
|---|---|---|
| `/auth/github/*` | — | Auth.js handlers |
| `/v1/installs` | GET | List GitHub App installations available to user |
| `/v1/repos` | GET | Repos under the user's installations |
| `/v1/sandboxes` | POST | Create sandbox: `{repo_id, branch}` |
| `/v1/sandboxes/:id` | GET | Status |
| `/v1/sandboxes/:id/stop` | POST | Stop |
| `/v1/sandboxes/:id/messages` | POST | Send chat message (streams SSE response) |
| `/v1/sandboxes/:id/files` | GET | Read file (proxies to agentd `read_file`) |
| `/v1/sandboxes/:id/tree` | GET | List directory |
| `/ws/agent/:sandbox_id` | WS | **Inbound from agentd** (auth: VM_JWT) |
| `/ws/client/:sandbox_id` | WS | Outbound to browser (auth: session cookie) |
| `/internal/proxy/register` | POST | Called by API itself, mutates the DO; never exposed |

**Sandbox creation flow** — see §8.1.

**Chat turn flow** — see §8.2.

### 7.4 `apps/web` — the browser app

Three panes inside `/sandbox/[id]`:

```
┌──────────────┬────────────────────┬──────────────────────────┐
│  Chat (tRPC  │  File tree         │  Monaco (read-only)      │
│  + SSE)      │  + diff badges     │  OR Preview iframe       │
│              │                    │  (tab switcher at top)   │
└──────────────┴────────────────────┴──────────────────────────┘
```

- Chat opens `/ws/client/:sandbox_id` for live updates (assistant tokens, tool call status, fs events, port-open events).
- File tree state is derived from `fs_event` frames; refresh-on-mount via `/v1/sandboxes/:id/tree`.
- Clicking a file calls `/v1/sandboxes/:id/files?path=...` and renders it in Monaco (`readOnly: true`, language inferred from extension).
- When a `port_open` for the registered dev port arrives, enable the **Preview** tab. Its iframe `src` is `https://<sandbox-id>.preview.pm-sandbox.app/`. On first navigation the iframe redirects to `app.pm-sandbox.app/preview-auth?sandbox=<id>`, which sets the signed cookie and bounces back. After that all HMR works automatically.
- "Open PR" button → `tools.open_pr` → API → GitHub → toast with PR link.

### 7.5 `packages/llm` — the agent loop

```ts
// pseudo
async function turn(sandboxId, userMessage) {
  const history = await loadConversation(sandboxId);
  history.push({ role: "user", content: userMessage });
  while (true) {
    const resp = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      system: SYSTEM_PROMPT,
      tools: TOOL_SCHEMAS,
      messages: history,
      stream: true,
    });
    yield* streamAssistantTokens(resp);
    const toolUses = collectToolUses(resp);
    if (toolUses.length === 0) break;
    const results = await Promise.all(
      toolUses.map(t => callAgentd(sandboxId, t))   // §6.2 frames
    );
    history.push({ role: "assistant", content: resp.content });
    history.push({ role: "user", content: results.map(toToolResultBlock) });
  }
}
```

System prompt: keep short. Tell it (a) it's helping a non-engineer PM, (b) it has tools listed below, (c) the workspace is `/workspace`, (d) when it edits a file it must call `read_file` first, (e) when the user wants a "preview", call `start_dev_server` and tell them to click the Preview tab.

---

## 8. Critical sequence diagrams

### 8.1 Start sandbox

```mermaid
sequenceDiagram
    participant B as Browser
    participant A as api
    participant G as GitHub App
    participant F as Fly Machines
    participant P as Proxy DO
    participant V as Sandbox VM

    B->>A: POST /v1/sandboxes {repo_id, branch}
    A->>G: mint installation token (1h)
    G-->>A: ghs_...
    A->>A: insert sandboxes row (status=provisioning)
    A->>A: sign VM_JWT (sub=sandbox_id, exp=8h)
    A->>F: POST /apps/.../machines (image, env={VM_JWT, GITHUB_TOKEN, REPO_URL, CONTROL_WS_URL})
    F-->>A: {machine_id, private_ip}
    A->>P: POST /internal/register {sandbox_id, ip, dev_port=null, user_id}
    A-->>B: {sandbox_id, status:"provisioning"}
    Note over V: boot, run entrypoint
    V->>A: WS connect /ws/agent/:id (Bearer VM_JWT)
    A->>A: status=running
    A-->>B: SSE event status=running
    V->>V: git clone via GITHUB_TOKEN
    V->>A: fs_event frames as files appear
```

Cold start budget: **< 5 s** from POST to status=running with Fly Machines pre-warmed. Without pre-warming, ~10 s.

### 8.2 PM message → file edit → preview

```mermaid
sequenceDiagram
    participant B as Browser
    participant A as api
    participant L as LLM
    participant V as agentd
    participant P as Proxy DO

    B->>A: POST /v1/sandboxes/:id/messages "Make the hero green and run dev"
    A->>L: messages.create (stream)
    L-->>A: tool_use read_file("src/Hero.tsx")
    A->>V: WS tool_call read_file
    V-->>A: tool_result {content}
    A->>L: tool_result
    L-->>A: tool_use edit_file(...)
    A->>V: WS tool_call edit_file
    V-->>A: tool_result {replacements:1}
    V-->>A: fs_event update src/Hero.tsx
    A-->>B: WS fs_event (file tree shows badge)
    L-->>A: tool_use start_dev_server("npm run dev", 5173)
    A->>V: WS tool_call run_command background
    V-->>A: tool_result {pid}
    V-->>A: port_open 5173
    A->>P: POST /internal/register {sandbox_id, dev_port:5173}
    A-->>B: WS port_open → unlock Preview tab
    L-->>A: assistant text "Done. Click Preview."
    A-->>B: SSE final tokens
    B->>P: GET https://<id>.preview.pm-sandbox.app/
    P->>P: check signed cookie (set on first visit)
    P->>V: HTTP GET on private_ip:5173
    V-->>P: HTML
    P-->>B: HTML
    B->>P: WS upgrade /__vite_hmr
    P->>V: WS upgrade
    V-->>B: HMR frames (round-trip via DO)
```

### 8.3 Open PR

```mermaid
sequenceDiagram
    participant B as Browser
    participant A as api
    participant V as agentd
    participant G as GitHub

    B->>A: POST tool open_pr {title, body}
    A->>V: WS git("checkout", ["-b", "pm/<auto>"]); git("add", ["-A"]); git("commit", ["-m", "..."]); git("push", ["-u", "origin", branch])
    V-->>A: ok
    A->>G: POST /repos/:owner/:repo/pulls (App token)
    G-->>A: {html_url, number}
    A-->>B: {url}
```

---

## 9. Auth model end-to-end

| Boundary | Mechanism | Lifetime |
|---|---|---|
| Browser ↔ web/api | Auth.js session cookie (HttpOnly, SameSite=Lax) | 30 days, sliding |
| api → GitHub repo | GitHub App installation token (`ghs_…`), minted per-call, cached briefly | ~1 hour |
| api ↔ agentd | `VM_JWT`, HS256 signed by API. Claims: `sub=sandbox_id`, `aud=agentd`, `exp=8h`, `jti` | 8 h, rotated mid-session via `rotate_token` frame |
| Browser ↔ preview proxy | Signed cookie `pm_sandbox_preview` (JWT), domain `.preview.pm-sandbox.app` | 8 h, scoped to `sandbox_id` |
| api ↔ proxy DO | HMAC-signed internal request (shared secret) | per-request |
| Sandbox → outbound internet | Egress allowlist at Fly level (npm, GitHub, registry.fly.io). Block everything else by default. | — |

The user **never** sees `VM_JWT` or `GITHUB_TOKEN`. The agent **never** sees the user's GitHub OAuth token. The proxy **never** sees `VM_JWT`.

---

## 10. Sandbox image (`infra/sandbox-image/Dockerfile`)

```dockerfile
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    git ripgrep ca-certificates curl python3 build-essential \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /workspace
COPY agentd/ /opt/agentd/
RUN cd /opt/agentd && npm ci --omit=dev

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER node
ENV NODE_ENV=production
ENTRYPOINT ["/entrypoint.sh"]
```

`entrypoint.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

git config --global credential.helper store
echo "https://x-access-token:${GITHUB_TOKEN}@github.com" > ~/.git-credentials
chmod 600 ~/.git-credentials

if [ ! -d /workspace/.git ]; then
  git clone --depth=50 --branch "${REPO_BRANCH}" "${REPO_URL}" /workspace
fi

exec node /opt/agentd/dist/index.js
```

Image size target: **< 250 MB** compressed.

---

## 11. Orchestrator wrapper (`apps/api/orchestrator.ts`)

Thin wrapper over Fly Machines REST API.

```ts
interface Orchestrator {
  create(opts: CreateOpts): Promise<{ machineId: string; privateIp: string }>;
  stop(machineId: string): Promise<void>;
  destroy(machineId: string): Promise<void>;
  status(machineId: string): Promise<MachineStatus>;
}
```

- Implementation: `POST https://api.machines.dev/v1/apps/${app}/machines` with the image ref and `env` block.
- Use **one Fly app per region** (`pm-sandbox-iad`, `pm-sandbox-lhr`), not one app per sandbox. Cheaper and avoids DNS churn.
- Set `auto_destroy: true` and `restart.policy: no` so a crashed agentd kills the machine, not respawns it.
- Run a **reaper cron** in the API every 60s: any sandbox with `last_active_at < now() - 30m` → `stop`. After `now() - 24h` → `destroy`.

---

## 12. Frontend UX details that matter

- **Optimistic file-tree updates.** When the LLM emits `tool_use edit_file`, mark the path as "editing" before the result lands. When the `fs_event` arrives, switch to "edited".
- **Diff bubbles in chat.** Render each `tool_call` as a collapsible card with the args summary (e.g. `edit_file src/Hero.tsx — 1 replacement`). Click expands to show the diff. Reuse `react-diff-viewer-continued`.
- **Preview tab heuristics.** First time `start_dev_server` succeeds, auto-switch the right pane to the Preview tab. Show a loading state until the proxy's first 200.
- **Empty state.** When sandbox is `provisioning`, show a stepper: `cloning repo → installing deps → ready`. Drive it from `fs_event` (presence of `node_modules/`) and a synthetic `ready` event from agentd's first idle.
- **Mobile:** explicitly out of scope. Min width 1280px. Render a "use a desktop" page below that.

---

## 13. Phasing

Each phase ends with a working app. Don't merge a phase until it does.

**Phase 1 — vertical slice (no LLM, no GitHub).**
- Web app with a hardcoded "start sandbox" button.
- API spins a Fly Machine from a baked image, returns `sandbox_id`.
- agentd connects back, exposes `read_file`, `write_file`, `run_command`.
- A debug page where you type tool calls as JSON and see results. Proves the pipe works.

**Phase 2 — LLM agent loop.**
- Wire Claude with the tool registry. Streaming chat. Conversation persistence.
- Read-only Monaco viewer. File tree from `fs_event`.

**Phase 3 — Preview proxy.**
- Cloudflare Worker + DO. Wildcard cert. `start_dev_server` tool.
- Vite HMR working through the proxy end-to-end. **Acceptance test: edit a file, see hot reload in the Preview iframe within 2s.**

**Phase 4 — GitHub.**
- GitHub App, OAuth, repo picker.
- Real `git clone` on boot. `open_pr` tool with App token.

**Phase 5 — Hardening.**
- Reaper, idle timeout, egress allowlist, audit log, Sentry, rate limits, billing meter.

---

## 14. Things that will bite if you skip them

1. **Wildcard TLS for `*.preview.pm-sandbox.app`.** Cloudflare gives this for free if the zone is on Cloudflare. Verify before you start Phase 3 or you'll waste a day on cert juggling.
2. **WebSocket through Cloudflare Workers.** Use `WebSocketPair` and `state.acceptWebSocket()` in the DO. Don't try to upgrade in the Worker entrypoint — it works in dev and breaks at scale.
3. **Vite `server.allowedHosts`.** Vite 5+ host-checks. The agent must start dev with `--allowed-hosts .preview.pm-sandbox.app` (suffix match) or set `server.allowedHosts: true`. Bake this into the system prompt and into a `start_dev_server` post-step that mutates the command if needed.
4. **inotify limits.** `chokidar` will silently miss events past `fs.inotify.max_user_watches`. Bump it in the Docker image: `RUN echo fs.inotify.max_user_watches=524288 > /etc/sysctl.d/99-watches.conf` (and ensure Fly runs `sysctl -p` — or set via `[experimental] sysctls`).
5. **`run_command` stdin.** Lots of `npm` commands hang on stdin if attached. Always spawn with `stdin: "ignore"`.
6. **Token rotation.** `GITHUB_TOKEN` expires in 1 h. agentd must accept a `rotate_token` frame from the API and rewrite `~/.git-credentials`. The API should push a new token at the 50-min mark.
7. **Idempotent sandbox creation.** Browsers retry. Use an `Idempotency-Key` header on `POST /v1/sandboxes` and dedupe in Postgres. Otherwise one click → three Fly Machines.
8. **Cost.** A Fly `shared-cpu-2x` with 2 GB is ~$0.005/hr. With reaper at 30 min idle, an active PM costs ~$2/month. Without a reaper, you'll wake up to a $4k bill.

---

## 15. Acceptance tests (handed to QA / used as e2e)

```
T1  Sign in with GitHub → see list of installed repos.
T2  Click "New sandbox" on a repo → status reaches "running" within 15 s.
T3  Send "What does this repo do?" → assistant streams a sensible answer
    citing actual files; tool_calls panel shows ≥1 read_file.
T4  Send "Add a comment 'hello' to the top of README.md" → file tree
    shows README.md as edited; clicking it shows the new content; chat shows
    an edit_file tool card.
T5  Send "Run the dev server" → Preview tab unlocks; iframe loads the
    real app within 30 s; HMR test: send "Change the page title to FOO" →
    iframe updates without a manual reload within 5 s.
T6  Click "Open PR" → GitHub PR exists with the expected diff and a link
    in the chat.
T7  Close the browser. After 30 min, sandbox status flips to "stopped"
    and the Fly machine is destroyed (verify via Fly API).
T8  Two PMs each open sandboxes for the same repo → cross-traffic test:
    PM1's preview cookie cannot load PM2's preview URL (403).
T9  Kill agentd via `run_command` "kill -9 $$" → sandbox auto-destroys,
    UI shows "sandbox crashed", offers to restart.
```

All nine pass before launch.

---

## 16. Open questions to resolve before building

- Pricing model: per-PM seat or per-sandbox-hour? Affects whether the reaper is aggressive or polite.
- Do you need branch protection bypass for the App, or do PMs always open PRs (never push to default)? Latter is much safer; default to it.
- Org-level vs user-level GitHub App install: pick org-level so admins can manage repo access centrally.
- LLM cost cap per PM per day: pick a number (suggest $10) and enforce in the agent loop.

Resolve these in writing, then build Phase 1.
