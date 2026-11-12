/**
 * Latency budget for the ask pipeline.
 *
 * Vercel Hobby serverless functions time out at 60s, and the live
 * /api/ask endpoint was observed taking 26–35s (and over 90s on first
 * attempt) when an upstream was slow: SoilGrids is degraded and Gemini
 * 503s under load. Every upstream fetch is therefore capped, and Gemini
 * retries are bounded, so the worst case stays well under the limit.
 *
 * Worst case by construction:
 *   tools phase: weather + soil run in parallel, each capped at 8s  -> <= 8s
 *   agent phase: Gemini, at most 2 attempts x 8s + 0.5s backoff     -> <= 16.5s
 *   total ask: <= ~25s (plus small JSON/parse overhead) — under 45s.
 *
 * On timeout a tool degrades to the honest "unavailable / no values"
 * message the pipeline already produces — it never invents data and
 * never waits on a dead upstream.
 */
export const UPSTREAM_TIMEOUT_MS = 8000;

/** Gemini generate attempts (first try + one retry on 503/429). */
export const GEMINI_MAX_ATTEMPTS = 2;

/** Backoff between Gemini attempts. */
export const GEMINI_RETRY_DELAY_MS = 500;
