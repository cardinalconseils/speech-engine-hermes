# Rubric: Speech Engine React Client + E2E Tests

**Date:** 2026-06-26
**Feature:** React client app with ElevenLabs Conversational AI integration + Playwright e2e tests
**Plan:** `.hermes/plans/2026-06-26_222800-react-client-e2e.md`

## Pre-Mortem Failure Modes

> "It's 3 months later. This feature shipped and was a complete disaster. What went wrong?"

1. The React app loaded with a blank screen because the ElevenLabs CDN import failed silently — no error message was shown to the user
2. The token server was down, but the React app showed a raw "Failed to fetch" error instead of a user-friendly message with retry capability
3. The mic button didn't show any visual feedback during connection, so users clicked it multiple times, starting parallel conversations that crashed the token server
4. The end-to-end tests passed locally but failed in CI because they hardcoded `localhost:3002` but the CI ran on a different port
5. The React app worked on Chrome but was completely broken on Safari because the WebRTC audio APIs weren't checked for availability before use
6. Voice conversation sessions leaked because the React component didn't clean up on unmount, and users reported their mic light staying on after navigating away

## Definition of Done (inherited)

- [ ] No console errors on any page touched
- [ ] No TypeScript errors (`tsc --noEmit` passes)
- [ ] Tests pass for changed areas
- [ ] No debug code left behind (console.log, debugger)
- [ ] Production build passes (`npm run build`)

## Feature-Specific Criteria (5, pass/fail)

### Criterion 1: App loads and renders UI
**Pre-mortem origin:** #1 — blank screen on load
**How to verify:** Start the Vite dev server, navigate to the client URL, check that the mic button and status text are visible
**PASS when:** Page renders with a styled microphone button and status text ("Click to start" or similar)
**FAIL when:** Blank page, JS error in console, or button not visible

### Criterion 2: Error handling for token fetch failure
**Pre-mortem origin:** #2 — raw error on token server down
**How to verify:** Start the React client WITHOUT the token server running, click the mic button, observe the error state
**PASS when:** A user-friendly error message is displayed (not raw "Failed to fetch") AND the button resets to clickable state so user can retry
**FAIL when:** Raw fetch error shown, button stays stuck in loading state, no error message at all

### Criterion 3: Button state prevents concurrent sessions
**Pre-mortem origin:** #3 — rapid clicks cause parallel connections
**How to verify:** Rapidly click the mic button multiple times (3+ times fast), observe state
**PASS when:** Only one connection attempt is made; subsequent clicks are ignored while connecting/connected; button shows clear visual state (connecting vs connected)
**FAIL when:** Multiple parallel connections are initiated, button state is ambiguous

### Criterion 4: E2E tests use configurable URLs
**Pre-mortem origin:** #4 — hardcoded URLs break in CI
**How to verify:** Read the e2e test config; verify base URLs are read from environment variables or a config file, not hardcoded
**PASS when:** Base URL for client and API server are configurable via env vars or config file
**FAIL when:** Any URL is hardcoded as a string literal in test code

### Criterion 5: Graceful degradation when WebRTC unavailable
**Pre-mortem origin:** #5 — broken on Safari without WebRTC check
**How to verify:** Mock `navigator.mediaDevices` to be undefined or throw, check app behavior
**PASS when:** App detects missing capabilities and shows a clear message ("Your browser doesn't support voice features" or similar) instead of crashing
**FAIL when:** App crashes with unhandled error or shows blank screen

## Human Approval

- [ ] Rubric reviewed and approved by human before implementation
- [ ] Criteria are specific enough to be tested by browser automation
- [ ] Each criterion traces to a pre-mortem failure mode