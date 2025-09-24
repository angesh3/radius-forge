# RadiusForge — Asset Manager Load & Performance Testing Tool

## Overview
RadiusForge is a scalable, UI/CLI-based application for simulating and analyzing AAA traffic loads — focusing on RADIUS, TACACS+, and Syslog — to test scale, performance, and reliability of Asset Manager (primary) and Cisco ISE (optional).

---

## Objectives
- Simulate real-world AAA traffic scenarios including a full RADIUS protocol library (AuthN/AuthZ/Acct/CoA, vendor AVPs, negative tests, specialized scenarios).
- Include TACACS+ and Syslog event testing.
- Live analytics with historical comparisons and regression detection.
- **Clear UI Information Architecture**: Scale Test, Performance Test, Threat Generator, Report, Topology, History/Compare, Help.
- No hardcoded configs; all user-defined (UI & CLI parity).
- Store run history; export results; email detailed reports.

---

## Supported Test Scales
150, 200, 300, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 10000, 50000, 100000 RPS.
TPS calculated based on auth + accounting transactions per request.

---

## UI INFORMATION ARCHITECTURE

### 1) Scale Test (RPS Planner)
**Purpose:** Drive controlled RPS at target(s) to validate scaling limits.

**Inputs**
- Target: Asset Manager / ISE (host/IP, ports for 1812/1813 or TLS 2083, secrets).
- Traffic type: RADIUS | TACACS+ | Syslog.
- Auth subtype: (e.g., EAP‑TLS, MAB, PEAP, PAP, MS‑CHAPv2, etc.).
- RPS profile: Constant | Step | Ramp | Burst.
- RPS value(s): presets (150 … 100k) or custom series (CSV).
- Duration: mm:ss or until stop.
- Clients/sockets: N.
- TLS & certs (for EAP‑TLS): upload CA/client chain; fragment size (optional).
- Accounting: Start/Interim/Stop intervals.
- Reject/invalid rate % (negative tests).
- NAD pool/profile selection; per-NAD weight.
- Save as preset (optional).

**Live KPIs (tiles)**
- Current RPS / Target RPS / Delivered %
- TPS (derived), Active sockets
- p50 / p95 / p99 latency
- Success %, Error rate %, Timeouts
- CoA latency (p95) when enabled

**Charts**
- RPS delivered vs target (time‑series)
- Latency p50/p95/p99 (time‑series)
- Error classes stacked (timeouts/auth‑reject/parse)

**Actions**
- Start / Pause / Stop
- Save preset / Load preset
- Export CSV (per‑second metrics)
- Tag run (“nightly”, “5k‑tls”, etc.)

---

### 2) Performance Test (SLO Benchmark)
**Purpose:** Repeatable benchmark suite to validate SLOs & regressions.

**Config**
- Select SLO set (default/editable):
  - Auth p95 < 150 ms; p99 < 300 ms
  - Error rate < 1% sustained
  - CoA p95 < 2 s
- Select workload mix: MAB %, EAP‑TLS %, PEAP %, etc.
- Select scale points: 1k, 5k, 10k, 50k, 100k RPS
- Warmup/cooldown periods
- Trial count & confidence targets

**Outputs**
- Pass/Fail per SLO & scale point
- Bottleneck hints (server vs network vs client saturation)
- Automated regression comparison vs chosen baseline run
- PDF/HTML benchmark report (ready to email)

---

### 3) Threat Generator
**Purpose:** Generate “bad” or adversarial traffic patterns to test resilience & detection.

**Modules**
- Burst storms (micro‑bursts 5–30 sec)
- Credential spray (unknown usernames, wrong secrets)
- Protocol fuzz (malformed AVPs, oversize packets)
- Latency injection (variable response delay)
- Unsupported EAP attempts; downgrade attacks
- CoA/Disconnect floods
- Syslog flood profiles (facility/severity mixes)
- TACACS+ command storm

**Safety Controls**
- Max % of total traffic
- Kill‑switch / auto‑throttle when error% > X
- Isolation to lab ranges (CIDR allowlist)

**Telemetry**
- Drop reason histogram, parser errors, NAS timeouts
- Alerts hook (webhook/SMTP) when thresholds breach

---

### 4) Report
**Purpose:** Produce and distribute human‑readable summaries of any run or suite.

**Contents**
- Run metadata: target(s), profile, duration, versions
- KPI summary: RPS/TPS, p95/p99, success/error, CoA metrics
- Charts: time‑series, latency histogram, error taxonomy
- SLO verdicts and regression deltas
- Top incidents (timeouts, rejects) with timestamps
- Appendix: configuration snapshot (JSON), NAD inventory

**Distribution**
- Download: PDF/HTML/CSV bundle
- Email: SMTP config, recipients, subject templates
- API: `POST /api/runs/{id}/report?format=pdf&email=true`

---

### 5) Topology
(See TOPOLOGY.md for wireframe, Mermaid diagrams, interactions, SLOs.)

---

### 6) History & Compare
- Run catalog with tags, search, filters
- Select two runs → overlay charts + table of deltas
- Diff of configs, versions, and NAD pools
- Export side‑by‑side PDF

---

### 7) Help
- Getting started
- Common errors & fixes (RADIUS codes, TLS issues)
- Capacity planning calculator (est. sockets, CPU)
- Glossary of AAA terms

---

## TRAFFIC LIBRARY (Condensed)
### RADIUS Authentication: PAP, CHAP, MS‑CHAPv2, EAP‑MD5, EAP‑TLS, PEAPv0/EAP‑MSCHAPv2, EAP‑TTLS/PAP/CHAP, EAP‑FAST, EAP‑PWD
### Authorization: Dynamic VLAN, dACL, Filter‑ID, QoS, SGT, Role Mapping
### Accounting: Start/Interim/Stop, Accounting‑On/Off
### CoA/DM: CoA Request, Disconnect
### Vendor AVPs: Cisco AV‑Pair, Aruba‑User‑Role, Juniper Local User, Mikrotik Rate‑Limit
### Negative: wrong secret, unknown user, unsupported EAP, malformed packet, delayed response
### Specialized: MAB, Posture token, MFA trigger, Chained auth, IoT onboarding
### TACACS+: AuthN, AuthZ, Accounting, Priv‑Esc
### Syslog: session lifecycle, posture, security alerts, config changes

---

## API SURFACE (Illustrative)
- `POST /api/runs` start (payload: target, profile, rps, duration, mix, tls, nadPool, threatMods)
- `GET /api/runs/{id}` status/metrics (SSE/WebSocket for live feed)
- `POST /api/runs/{id}/stop`
- `GET /api/runs/{id}/export?format=csv|json`
- `POST /api/runs/{id}/report?format=pdf&email=...`
- `GET /api/topology`
- `POST /api/presets` / `GET /api/presets`
- `POST /api/nads` (batch upload), `GET /api/nads`

---

## NON‑FUNCTIONAL REQUIREMENTS
- Generate up to **100k RPS** with horizontal scaling & multi‑process sockets.
- Time precision: RPS scheduler jitter < 5% @ p99.
- Resource caps: per‑run CPU/mem guardrails; back‑pressure when saturated.
- Secure storage for secrets/certs; TLS 1.2+.
- Cross‑platform (Linux/macOS); containerized deployment.
- Observability: Prometheus metrics, structured logs, health checks.

---

## ACCEPTANCE CRITERIA (MVP)
- Scale Test hits 5k sustained RPS within ±5% error on lab host.
- Performance Test produces SLO verdict + report.
- Threat Generator runs at ≤ 20% of total traffic with kill‑switch.
- Report exports PDF + emails successfully.
- Topology renders live health & RPS flows for ≥ 50 nodes.


## Additional Agent
- **Test Report Generator (TR)** — Aggregates unit, integration, and E2E test results into unified PDF/HTML/JSON, archives them, and shares via email or artifact store.

---

## Multi‑Agent Orchestration & CLI Commands (RadiusForge)

RadiusForge uses a drop‑in multi‑agent workflow to keep delivery fast and governed. You interact with the **Main Orchestrator (MO)**; it routes work to agents. The **Test Report Generator (TR)** aggregates **Unit (UT), Integration (INT), and E2E/Functional (FT)** test results into a single report artifact and publishes it.

### Command Palette (CLI)
- `/triage "<ask>"` — MO → Thinker (clarify ACs, risks, metrics)
- `/design` — Designer (flows, wireframes, components, a11y baseline)
- `/arch` — Architect (ADRs, diagrams, interfaces, NFRs)
- `/dev-be "<component>"` — Dev‑BE (APIs, DB, migrations)
- `/dev-fe "<component>"` — Dev‑FE (UI/state, API integration)
- `/sec-scan` — Security (threat model, SAST/DAST, fixes)
- `/test-unit` — Tester‑Unit (UT, coverage)
- `/test-int` — Tester‑Integration (contracts, data‑flow)
- `/test-e2e` — Tester‑E2E (FT, journeys, smoke/perf‑lite)
- **`/test-report` — Test Report Generator (TR)** → collates UT/INT/FT results, trends vs baseline, exports HTML/PDF, attaches to run
- `/review` — Code Reviewer (quality/style/perf/arch compliance)
- `/docs` — Documentation (README/API/runbooks/release notes)
- `/bundle` — Bundle (reproducible build, SBOM, checksums, manifest)
- `/handoff` — MO (summarize artifacts, rollback plan, next steps)

### Make Targets (shortcuts)
```bash
make test-unit && make test-int && make test-e2e
make test-report   # invokes TR agent to collate UT/INT/FT into one report
```

### Quality Gate (expanded)
- **Testing:** `/test-unit` → `/test-int` → `/test-e2e` all green
- **Reporting:** **`/test-report`** produced; includes coverage, pass/fail matrix, flaky test list, and trend deltas; attached to run and linked in build summary before `/review`.

