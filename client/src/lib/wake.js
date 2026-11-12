// The API runs on Render's free tier, which sleeps after 15 minutes idle.
// The first request after that can fail with 502/503/504 (Vercel's proxy gives up)
// or a network error while the server boots (~30-50 s).
// fetchWithWake retries those cases with growing delays and tells the UI that the
// server is waking up, so the user sees a friendly message instead of "Request failed (502)".

const WAKE_STATUSES = new Set([502, 503, 504]);
const DELAYS_MS = [2000, 3000, 5000, 8000, 10000, 12000, 15000]; // ~55 s in total

let waiting = 0;
const listeners = new Set();
export const onWakeChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach((fn) => fn(waiting > 0));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchWithWake(url, options, { delays = DELAYS_MS, fetchImpl = fetch } = {}) {
  let announced = false;
  try {
    for (let attempt = 0; ; attempt++) {
      let res;
      try {
        res = await fetchImpl(url, options);
        if (!WAKE_STATUSES.has(res.status)) return res;      // real answer (even a 4xx/500)
      } catch (err) {
        if (attempt >= delays.length) throw err;              // still unreachable: give up
      }
      if (attempt >= delays.length) return res;               // give up, return the last 502
      if (!announced) { announced = true; waiting++; emit(); }
      await sleep(delays[attempt]);
    }
  } finally {
    if (announced) { waiting--; emit(); }
  }
}

// Fire-and-forget ping so the server starts booting as soon as any page opens,
// while the visitor is still reading or typing.
export function warmUp(base) {
  fetch(`${base}/health`, { cache: 'no-store' }).catch(() => {});
}
