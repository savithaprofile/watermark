# Secure Assessment — Submission README

This README explains the implementation, verification steps, and where this project satisfies the assessment requirements. It also lists suggested improvements and testing notes to help the interviewer review the work.

## Quick summary
- Objective: Provide a React-based assessment UI with a tamper-resistant watermark overlay and unified event logging for auditability.
- What I implemented: a tiled, diagonal watermark overlay (live timestamp) that resists DOM removal and style tampering, and two logging systems (a simple batch sender and a centralized `EventLogger`) capturing user/security events. Watermark events `WATERMARK_RENDERED` and `WATERMARK_TAMPER_ATTEMPT` are logged.

## How to run
Requirements: Node 18+ recommended (project uses Vite + React + TypeScript)

Install and run locally:

```bash
# from the project root
npm install 
npm run dev
```

Open the app at the Vite URL shown in the terminal (typically http://localhost:5173).

## Files of interest
- `src/components/Watermark.tsx` — builds tiled diagonal watermark, updates timestamp, detects and repairs tampering, logs events.
- `src/services/EventLogger.ts` — central event logging service; batching, persistence, flush to `/api/events`.
- `src/services/logger.ts` — lightweight logger used by some hooks/components (kept for compatibility). Note: it no longer persists `examLogs` to localStorage (one-time cleanup only).
- `src/hooks/useSecurityEvents.ts` — registers visibility/tab/focus/copy/paste/PrintScreen handlers and logs via `logEvent`.
- `src/components/Assessment.tsx` — assessment flow, fullscreen enforcement, timer, navigation, answer capture.
- `src/components/AssessmentLayout.tsx` — initializes `EventLogger` and mounts `Watermark`.

## Mapping to requirements
I list each requirement and the current implementation status with pointers to the code.

1) Watermark overlay
- Render a semi-transparent watermark overlay across the assessment UI — DONE
  - Implemented in `src/components/Watermark.tsx`. The overlay is created as many repeated text nodes tiled across the screen and rotated.
- Watermark content must include Candidate name/ID, Email/Attempt ID, Timestamp — DONE
  - `Watermark.tsx` composes `${name} | ${email} |<br/> ${time}` and updates timestamp every second.
- Repeat watermark diagonally/tiled — DONE
  - Watermark uses a grid of text nodes rotated by `transform: rotate(-20deg)`.
- Ensure readability of questions is not obstructed — DONE (best-effort)
  - Watermark uses `pointer-events: none` and light opacity (`rgba(0, 0, 0, 0.3)`) so it is visible but does not block interaction.

2) Persistence across navigation/refresh/one-question flow — PARTIAL / DONE
- The watermark is created by `Watermark` component mounted at the `AssessmentLayout` level, so it persists across question navigation (single-page navigation) — DONE.
- Persistence across refresh: Watermark will be re-rendered when the app mounts; the overlay is not kept in localStorage (that’s desirable) but the UI re-mounts the component on refresh so watermark appears — DONE.
- One-question-at-a-time flow: watermark overlays the UI regardless of which question is shown — DONE.

3) Avoid simple DOM removal (no single static node) & Tamper Resistance — PARTIAL / DONE
- Re-render watermark if removed from DOM — IMPLEMENTED
  - `Watermark.tsx` registers a `MutationObserver` on `document.body` and calls `buildWatermark()` if the watermark node is missing.
- Detect visibility or opacity manipulation attempts — IMPLEMENTED (best-effort)
  - A second `MutationObserver` inspects computed styles (display, visibility, opacity, zIndex) and treats suspicious changes as tampering.
- Prevent z-index overrides from hiding watermark — PARTIAL
  - The watermark uses a very large z-index (`999999`) and checks for `wm.style.zIndex` mismatch; however, inline style changes elsewhere may still override it if stronger CSS or `!important` is used. Full prevention of forced overrides is not possible from client-side JS — see Limitations.
- Log suspected tampering attempts — DONE
  - `logEvent('WATERMARK_TAMPER_ATTEMPT', ...)` and `EventLogger.log('WATERMARK_TAMPER_ATTEMPT', ...)` are called with metadata.

4) Accessibility & non-blocking — PARTIAL
- The watermark sets `pointer-events: none` to avoid blocking interactions (good). The overlay uses visual text only; we must ensure it doesn't reduce contrast to the point of making content unreadable. Currently it uses a light RGBA color; recommend verifying with accessibility contrast tools.

5) Events to log & Unified Event Logging — PARTIAL / DONE
- Unified schema: `EventLogger.ts` defines `AssessmentEvent` with `type`, `timestamp`, `payload`, `candidateId`, `attemptId` — DONE
  - `EventLogger` sets `candidateId` and `attemptId` on `init()` and automatically attaches for logs.
- Capture events from enforcement (fullscreen), tab/focus changes, copy/paste attempts, timer activity — PARTIAL
  - `EventLogger` registers listeners for visibility, blur/focus, copy/paste, fullscreen (in `setupListeners`) — done.
  - `useSecurityEvents.ts` also uses `logEvent` for some events; some events are logged only with `logEvent` rather than `EventLogger`. The `Watermark` now logs to both.
- Batch and send logs to backend efficiently — IMPLEMENTED
  - `EventLogger` uses `setInterval` batching every 5s and POSTs to `/api/events`. It tries to mark events as `_sent` in payload and persists logs.
- Persist logs locally during offline or refresh — IMPLEMENTED
  - `EventLogger.persistLogs()` uses `localStorage` keys `assessment_logs` and `assessment_submitted` to persist logs between refreshes and across offline.
- Ensure logs are immutable post-submission — IMPLEMENTED
  - `EventLogger.submit()` marks `isSubmitted` and ignores further logs; `persistLogs()` also saves `assessment_submitted`.

## Concrete status table (high level)
- Watermark overlay: DONE
- Live timestamp: DONE
- Tiled/diagonal repeat: DONE
- Persist across navigation: DONE
- Re-render if removed & detect style manipulation: DONE (best-effort)
- Log `WATERMARK_RENDERED`: DONE
- Log `WATERMARK_TAMPER_ATTEMPT`: DONE
- Unified event schema: DONE
- Capture browser events (fullscreen/tab/focus/copy/paste): PARTIAL
  - Present, but some places use `logEvent` (legacy) instead of `EventLogger`.
- Batch send, offline persistence: DONE
- Immutable post-submission: DONE

## Where the implementation diverges from a perfect solution (limitations & suggestions)
I aimed for pragmatic, interview-friendly implementations. Below are practical limitations and suggested improvements (ranked by impact):

1) Single-source-of-truth for logging (high impact)
- Current state: two logging APIs exist — `src/services/logger.ts` (small batch sender) and `src/services/EventLogger.ts` (central logger). This creates duplication and partial differences in schema/behavior.
- Recommendation: Consolidate to a single `EventLogger` API. Either:
  - Have `logEvent(...)` forward to `EventLogger.log(...)` and then remove `logger.ts`, or
  - Replace all calls to `logEvent` to `EventLogger.log` (preferred). This ensures a single event schema, persistence, and batching behavior.

2) Event schema consistency
- Some legacy events logged via `logEvent(...)` have different metadata shapes. Standardize the payload shape across the codebase (use `payload` object with documented keys).

3) Tamper detection robustness (medium)
- Client-side code can't fully prevent resourceful attackers (ex: devtools, style overrides via `!important`, CSS injection, browser extensions). Suggested server-side / exam infra mitigations:
  - Combine client-side signals with server-side monitoring (multiple failed tamper attempts from same attemptId in short time window).
  - Periodically screenshot the page via proctoring agents (not possible in pure browser JS without native agents).
- Improve client-side checks:
  - Add additional heuristics (node size, intersection with viewport, unexpected pointer-events changes).
  - Use `resize` and `orientationchange` events more thoroughly.

4) Z-index hardening (low/medium)
- Current approach uses very large z-index and checks `wm.style.zIndex`, but attackers can override `!important` or higher stacking contexts. Mitigation: create multiple staggered watermark layers (two overlays with different IDs and z-indexes) and cross-validate between them. That makes trivial single-node removal harder.

5) Accessibility review (medium)
- Ensure watermark text contrast and font size do not obstruct readability for users with low vision. Options:
  - Allow configurable opacity or position for candidates with accessibility needs (with audit trail).
  - Mark the overlay as `aria-hidden="true"` and ensure not to alter focus order.

6) Tests & verification (recommended)
- Add unit/integration tests for:
  - `EventLogger` persist/flush logic (simulate network failures)
  - Watermark rebuild logic when DOM mutation is simulated
- Add e2e test flows (Playwright) to simulate tamper attempts and verify logged events.

7) Security & privacy
- Make sure candidate identifying information logged in events follows privacy rules. In production, hash or tokenise any PII if required.
- Secure the `/api/events` endpoint (auth, rate-limiting) and use HTTPS.

## How the watermark & logging flow works (full flow)
1. App start / candidate enters assessment
   - `AssessmentLayout` calls `EventLogger.init(candidateId, attemptId)` on mount.
   - `Watermark` is mounted with `name`, `email` and `attemptId` props.

2. Watermark render
   - `Watermark.buildWatermark()` creates a tiled grid overlay and appends it to `document.body`.
   - A periodic `setInterval` updates the timestamp every second.
   - On initial build, `logEvent('WATERMARK_RENDERED', attemptId)` and `EventLogger.log('WATERMARK_RENDERED', { name, email })` are called.

3. Tamper detection
   - A `MutationObserver` watches for the watermark node being removed — if removed, `buildWatermark()` is re-run and `WATERMARK_TAMPER_ATTEMPT` is logged.
   - A second `MutationObserver` inspects computed styles for `display: none`, `visibility: hidden`, `opacity: 0`, and z-index changes and logs `WATERMARK_TAMPER_ATTEMPT` with metadata.

4. Unified logging
   - `EventLogger` collects events in `this.logs` and batches them every 5s to `/api/events`.
   - Logs are persisted in `localStorage` (`assessment_logs`) so refresh/offline won't lose them.
   - On submission, `EventLogger.submit()` marks logs immutable and forces a flush.

## How to verify (interviewer checklist)

> Quick tip: Open the browser DevTools / Inspect panel with the following shortcuts:

- macOS: Command (⌘) + Option (⌥) + I
- Windows/Linux: Ctrl + Shift + I (or press F12)

- Watermark rendering
  - Start the app and click Start Assessment. Confirm watermark text shows across the page, with candidate name/email and a live timestamp.
  - Resize the browser window — watermark re-renders and remains tiled.
- Tamper detection
  - In DevTools Elements panel, delete the `#watermark-overlay` node; the overlay should be rebuilt automatically and you should see a `WATERMARK_TAMPER_ATTEMPT` log in `EventLogger.getLogs()`.
  - Change the watermark node style to `display:none` or `opacity:0` via DevTools; it should rebuild and log a tamper attempt.
- Logging
  - Open DevTools Console and call `EventLogger.getLogs()` to confirm `WATERMARK_RENDERED` and any `WATERMARK_TAMPER_ATTEMPT` entries exist (they carry `attemptId` and payload).
  - Let the app run for >5s and watch network requests to `/api/events` (or check console logs) to confirm batching/flush behavior.
- Submission immutability
  - Submit the assessment and then attempt to trigger further events — confirm `EventLogger` ignores logs after submission.

## Minimal reviewer notes (TL;DR)
- The project fulfils the core objectives: visible tiled watermark with live timestamp, detection and repair of common tamper actions, logging of watermark events and a central event logger with persistence and batching.
- Main improvements: consolidate logging APIs, add a second watermark layer for stronger tamper resistance, add tests, and ensure accessibility checks.

## Changes made to repo in this session
- `src/services/logger.ts` — removed persisting `examLogs` to localStorage to avoid keeping logs in multiple places; added a one-time cleanup that removes any legacy `examLogs` key.
- `src/components/Watermark.tsx` — added calls to `EventLogger.log(...)` so watermark events are recorded by the central logging service in addition to the lightweight `logEvent(...)` calls.



# watermark
