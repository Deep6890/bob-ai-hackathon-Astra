# AeroReady — IBM Bob Hackathon Implementation Plan

## Top-Level Overview

Transform the existing, functionally-complete AeroReady predictive maintenance system
into a polished, submission-ready, high-scoring IBM Bob Hackathon entry.

The core ML pipeline (LSTM RUL + IsolationForest sensor health + mission readiness)
is already working. Nothing in the ML pipeline or existing backend/frontend architecture
will be replaced. The work is additive:

1. Fill all empty submission metadata
2. Add a portable pytest test suite
3. Build a real evidence-grounded Copilot backend service
4. Build a real IBM Bob MCP server (FastMCP, calls existing Flask API)
5. Upgrade the AICopilotPage.jsx into a conversational interface
6. Minor UX improvements to the fleet dashboard
7. Fix genuine technical quality issues (requirements.txt, hardcoded paths, etc.)
8. Create demo screenshots and presentation slides (PPTX)

**Team:** Team Astra | **Track:** AI | **Tech:** Flask, PyTorch, scikit-learn, React, Vite, IBM Bob

---

## Sub-Task 1 — Submission Blockers

**Status:** [ ] pending

**Intent:**  
Make the CI validation pass and ensure judges can read the submission.
Every template placeholder in README.md, submission.yaml, and all docs/ files
must be replaced with real AeroReady content.

**Expected Outcomes:**
- `validate.yml` passes all 6 checks (README, yaml fields, video link check skipped, src/ check)
- README.md describes AeroReady correctly with full tech stack and setup
- submission.yaml has all REQUIRED fields filled
- All four docs/ files contain real project content
- requirements.txt installs cleanly with torch, scikit-learn, numpy, scipy added
- test_suite.py has no hardcoded Windows path
- app.db added to .gitignore
- src/.env.example created

**Todo List:**
1. Write README.md — AeroReady title, team, problem, solution, features, tech stack, how to run, demo table, limitations, proud of
2. Write submission.yaml — team.name "Team Astra", track "AI", lead/member placeholders, title/problem/solution/features/tech_stack/ibm_technologies
3. Write docs/problem-statement.md — aviation MRO domain, unplanned AOG, reactive maintenance cost
4. Write docs/solution-overview.md — what was built, step-by-step flow, key design decisions, IBM tech used
5. Write docs/architecture.md — real Mermaid diagram (React → Flask → LSTM/IForest → SQLite), components table, data flow
6. Write docs/setup-guide.md — real prerequisites, env vars, install, run, test commands
7. Fix requirements.txt — add torch>=2.0.0, scikit-learn>=1.3.0, numpy>=1.24.0, scipy>=1.10.0, pillow>=10.0.0
8. Fix test_suite.py — remove hardcoded DB_PATH, use os.path or env var
9. Add app.db, instance/*.db to .gitignore
10. Create src/.env.example pointing to both backend and frontend env vars
11. Update demo/demo-video-link.txt with marker "TO BE ADDED BEFORE SUBMISSION"
12. Update demo/live-demo-url.txt with "NOT DEPLOYED — run locally using docs/setup-guide.md"

**Relevant Context:**
- README.md (root) — currently has [Your Project Title Here] placeholder
- submission.yaml — all string fields are ""
- docs/*.md — all template content
- src/backend/requirements.txt — missing torch, scikit-learn, numpy, scipy
- src/backend/test_suite.py line 9 — hardcoded DB_PATH
- .gitignore — missing app.db entry

---

## Sub-Task 2 — Testing

**Status:** [ ] pending

**Intent:**
Add a portable pytest test suite with no hardcoded paths, no live server dependency
for unit tests, and clear integration test markers. Tests prove the ML pipeline,
CSV ingestion, mission readiness logic, and copilot service are correct.

**Expected Outcomes:**
- `pytest src/backend/tests/ -v` runs and passes on any machine
- Unit tests for: risk flag logic, readiness score, recommendation builder, CSV column mapping
- Integration tests (marked @pytest.mark.integration) for: upload → prediction → readiness flow
- Copilot service unit tests (once Phase 3 is done)
- conftest.py with Flask test client and in-memory SQLite

**Todo List:**
1. Create src/backend/tests/conftest.py — Flask test client, in-memory SQLite app fixture
2. Create src/backend/tests/test_readiness_logic.py — unit test compute_risk_flag, compute_readiness_score, build_recommendation
3. Create src/backend/tests/test_csv_ingestion.py — test DataController.process_csv_upload with mock file
4. Create src/backend/tests/test_api_contracts.py — test health endpoint, engines endpoint, mission readiness endpoint shapes
5. Create src/backend/tests/test_copilot_service.py — unit test CopilotService response generation once Phase 3 done

**Relevant Context:**
- src/backend/app/models/readiness.py — static methods compute_risk_flag, compute_readiness_score, build_recommendation
- src/backend/app/controllers/data_controller.py — process_csv_upload
- src/backend/app/__init__.py — create_app factory (use for test client)

---

## Sub-Task 3 — Mission Readiness Copilot Backend

**Status:** [ ] pending

**Intent:**
Add a deterministic, evidence-grounded Copilot service that answers natural language
questions about engine readiness using only real database values.
No LLM. No external API. No hallucination.

**Expected Outcomes:**
- POST /api/v1/copilot/query accepts {engine_id, question} and returns {answer, evidence, engine_id}
- CopilotService routes the question to one of 7 response categories via keyword matching
- Every sentence in `answer` is templated from actual DB values
- `evidence` dict contains the raw fields cited (rul, margin, risk_flag, sensor lists)
- If prediction not found: triggers analyze_engine first
- If still unavailable: returns "Insufficient evidence available."
- Fleet-level questions (high priority, critical) work without engine_id

**Todo List:**
1. Create src/backend/app/routes/copilot_routes.py — Blueprint, POST /api/v1/copilot/query
2. Create src/backend/app/controllers/copilot_controller.py — validate request, delegate to service
3. Create src/backend/app/services/copilot_service.py — CopilotService class with _route_question, 7 response handlers, evidence builder
4. Register copilot_bp in src/backend/app/__init__.py with url_prefix='/api/v1/copilot'
5. Add getCopilotResponse method to src/frontend/src/api.js

**Response categories (keywords → handler):**
- ready / mission / go / dispatch → handle_readiness_question
- rul / cycles / life / remaining → handle_rul_question
- sensor / health / degrading / abnormal → handle_sensor_question
- margin / safety / buffer → handle_margin_question
- maintenance / priority / action / inspect → handle_maintenance_question
- fleet / all engines / critical / high priority → handle_fleet_question
- default → handle_general_question (returns full structured summary)

**Relevant Context:**
- src/backend/app/repositories/analysis_repository.py — get_latest_prediction, get_latest_readiness, get_sensor_analysis_for_prediction
- src/backend/app/repositories/engine_repository.py — get_all_engines, get_engine_by_id
- src/backend/app/models/readiness.py — static methods for risk logic
- src/backend/app/__init__.py — blueprint registration pattern
- Existing routes follow: Blueprint + controller instance + success_response(result)

---

## Sub-Task 4 — IBM Bob / MCP Server

**Status:** [ ] pending

**Intent:**
Create a genuine IBM Bob MCP server using FastMCP (Python mcp SDK)
that exposes 5 read-only tools. All tools call the existing Flask API via HTTP.
Create the Bob configuration file so the server is discoverable.

**Expected Outcomes:**
- src/mcp_server/server.py runs as an MCP server with 5 tools
- src/mcp_server/requirements.txt includes mcp[cli] (FastMCP)
- .bob/mcp.json (or mcp.json at root) registers the server
- Each tool has full docstring, parameter descriptions, concrete return types
- Tools call http://localhost:5000/api/v1/... endpoints
- get_fleet_summary: no params → fleet counts
- get_engine_readiness(engine_id): int → full readiness JSON
- get_sensor_health(engine_id): int → sensor states list
- list_high_priority_engines: no params → engines with HIGH priority
- ask_copilot(engine_id, question): int+str → copilot answer + evidence
- Error handling: tool returns error message string if API unavailable

**Todo List:**
1. Create src/mcp_server/ directory
2. Create src/mcp_server/server.py — FastMCP app with 5 @mcp.tool() decorated functions
3. Create src/mcp_server/requirements.txt — mcp[cli]>=1.0.0, requests>=2.28.0
4. Create src/mcp_server/README.md — usage instructions for Bob
5. Create .bob/mcp.json — registers aeroready server pointing to server.py
6. Add MCP setup section to docs/setup-guide.md

**Relevant Context:**
- FastMCP pattern: from mcp.server.fastmcp import FastMCP; mcp = FastMCP("name"); @mcp.tool()
- Existing Flask endpoints: GET /api/v1/engines/, GET /api/v1/engines/{id}/analysis, GET /api/v1/engines/{id}/sensors, POST /api/v1/mission/readiness, POST /api/v1/copilot/query
- Base URL configurable via AEROREADY_API_URL env var defaulting to http://localhost:5000/api/v1

---

## Sub-Task 5 — Frontend Copilot UI

**Status:** [ ] pending

**Intent:**
Rewrite AICopilotPage.jsx as a professional conversational interface
positioned as "Mission Readiness Copilot". Keeps AeroReady design language.

**Expected Outcomes:**
- Message history list with user/assistant bubbles
- AeroReady-styled (not ChatGPT): black/white/accent palette, rounded-2xl cards
- Text input + send button + keyboard submit (Enter)
- Loading state (spinner, disabled input during request)
- Each assistant response shows: answer text + collapsible Evidence panel
  (RUL, margin, risk_flag, sensor counts, affected sensors, recommendation)
- Starter message on mount: "What is the mission readiness status of this engine?"
- Error displayed inline in conversation, not as modal
- Empty state if no engine selected (matches existing pattern)
- api.js getCopilotResponse(engineId, question) call

**Todo List:**
1. Add getCopilotResponse(engineId, question) to src/frontend/src/api.js
2. Rewrite src/frontend/src/pages/AICopilotPage.jsx with:
   - useState for messages[], input, loading, error
   - useEffect to send starter question on engine mount
   - handleSend() async function
   - MessageBubble component (user vs assistant styling)
   - EvidencePanel component (collapsible, shows key fields)
   - CopilotHeader component (title, model badge, connected indicator)
   - InputBar component (textarea, send button)

**Relevant Context:**
- AeroReady design tokens: textPrimary #181818, accent #86FF7B, warning #F2B84B, danger #F05D5E, borderLight #E7E7E5, subtle #F4F4F3
- Existing pattern: components use rounded-2xl, border border-borderLight, box-shadow subtle
- AppDataContext provides engineContext (unit_number int), engines array
- Current AICopilotPage.jsx is 246 lines — full replacement

---

## Sub-Task 6 — Dashboard UX Improvements

**Status:** [ ] pending

**Intent:**
Make the fleet dashboard immediately communicate:
who is critical, why, and what the margin is.
No new data — surface existing data better.

**Expected Outcomes:**
- Dashboard shows a "Critical Alert" banner when any engine has risk_flag CRITICAL
- EngineCard shows the recommendation snippet (first sentence) for HIGH priority engines
- Fleet header shows total analyzed / total engines progress
- No data invented

**Todo List:**
1. Add CriticalAlertBanner to Dashboard.jsx — shows count + list of CRITICAL engines
2. Add recommendation snippet to EngineCard for HIGH/MEDIUM priority (truncated 80 chars)
3. Add analyzed progress text to fleet header row

**Relevant Context:**
- src/frontend/src/components/Dashboard.jsx — main dashboard component
- missionReadinessById provides combined_assessment.recommendation
- risk_flag CRITICAL = margin < 0

---

## Sub-Task 7 — Technical Quality Fixes

**Status:** [ ] pending

**Intent:**
Fix the genuine technical issues found in the audit that affect
reproducibility, portability, or correctness.

**Expected Outcomes:**
- Per-sensor anomaly_score bug noted (documented, not silently wrong)
- Frontend BASE_URL driven by VITE_API_URL env var with fallback
- app.db in .gitignore
- src/frontend/.env.example created with VITE_API_URL
- Missing 500 error handler added to register_error_handlers

**Todo List:**
1. Fix api.js BASE_URL to use import.meta.env.VITE_API_URL || hardcoded fallback
2. Create src/frontend/.env.example with VITE_API_URL=http://127.0.0.1:5000/api/v1
3. Add generic 500 handler to src/backend/app/utils/errors.py
4. Verify app/__init__.py CORS config is broad enough for development

**Relevant Context:**
- src/frontend/src/api.js line 24 — hardcoded BASE_URL
- src/backend/app/utils/errors.py — register_error_handlers

---

## Sub-Task 8 — Demo / Submission Artifacts

**Status:** [ ] pending

**Intent:**
Create the demo and presentation artifacts required by the hackathon template.
Screenshots taken from running application. PPTX slide deck created programmatically.

**Expected Outcomes:**
- 3+ screenshots in demo/screenshots/ (created by running the app)
- presentation/slides.pptx — 7-slide deck
- demo/demo-video-link.txt updated with clear "TO BE ADDED" marker
- demo/live-demo-url.txt updated to "NOT DEPLOYED"

**Todo List:**
1. Create presentation/slides.pptx using python-pptx (7 slides: title, problem, solution, architecture, demo, IBM Bob, team)
2. Update demo/demo-video-link.txt — "DEMO VIDEO TO BE RECORDED AND ADDED HERE"
3. Update demo/live-demo-url.txt — "NOT DEPLOYED — run locally per docs/setup-guide.md"
4. Add note in README.md about screenshots requiring the running application

**Relevant Context:**
- presentation/README.md describes expected slide structure
- python-pptx is available in the venv already (need to verify) or install ad-hoc

---

## Sub-Task 9 — Final QA

**Status:** [ ] pending

**Intent:**
Run all validation checks, confirm everything works,
produce the final report.

**Expected Outcomes:**
- Backend starts without import errors
- All pytest tests pass
- Frontend builds without errors
- Copilot endpoint returns correct shape
- MCP server starts correctly
- GitHub validate.yml checks pass (except video URL which needs manual update)
- Final report produced

**Todo List:**
1. Run: python -m py_compile on all new .py files
2. Run: cd src/backend && python run.py (smoke test startup)
3. Run: cd src/frontend && npm run build
4. Run: pytest src/backend/tests/ -v
5. Test copilot endpoint with curl/requests
6. Test MCP server startup
7. Produce final report in chat

---

## Files To Create (new)

- src/backend/app/routes/copilot_routes.py
- src/backend/app/controllers/copilot_controller.py
- src/backend/app/services/copilot_service.py
- src/backend/tests/conftest.py
- src/backend/tests/test_readiness_logic.py
- src/backend/tests/test_csv_ingestion.py
- src/backend/tests/test_api_contracts.py
- src/backend/tests/test_copilot_service.py
- src/mcp_server/server.py
- src/mcp_server/requirements.txt
- src/mcp_server/README.md
- .bob/mcp.json
- src/.env.example
- src/frontend/.env.example
- presentation/slides.pptx

## Files To Modify

- README.md
- submission.yaml
- docs/problem-statement.md
- docs/solution-overview.md
- docs/architecture.md
- docs/setup-guide.md
- src/backend/requirements.txt
- src/backend/test_suite.py
- src/backend/app/__init__.py (add copilot blueprint)
- src/frontend/src/api.js (add getCopilotResponse + env-driven BASE_URL)
- src/frontend/src/pages/AICopilotPage.jsx (full rewrite)
- src/frontend/src/components/Dashboard.jsx (critical banner + card improvements)
- src/backend/app/utils/errors.py (add 500 handler)
- .gitignore (add app.db)
- demo/demo-video-link.txt
- demo/live-demo-url.txt
