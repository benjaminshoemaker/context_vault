import fetch from "node-fetch";

export type UserContextV0 = any; // keep minimal; schema lives in packages/schema

function logTools(...args: any[]) {
  if (process.env.MCP_LOG_TOOLS === "1") {
    // eslint-disable-next-line no-console
    console.log("[MCP TOOLS]", ...args);
  }
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), ms);
  return (async () => {
    try {
      // @ts-ignore node-fetch supports signal
      const res = await (p as any);
      return res as T;
    } finally {
      clearTimeout(to);
    }
  })();
}

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/$/, "");
}

async function tryFetchOnce(url: string) {
  const r = await fetch(url, { method: "GET" });
  return r;
}

export async function fetchContext(baseUrlRaw: string): Promise<UserContextV0> {
  const baseUrl = normalizeBaseUrl(baseUrlRaw || "http://localhost:4000");
  const primary = `${baseUrl}/v0/context`;
  logTools("getContext: fetching", primary);
  try {
    const r = await tryFetchOnce(primary);
    if (!r.ok) throw new Error(`vault-api error ${r.status}`);
    return await r.json();
  } catch (err: any) {
    logTools("getContext: primary fetch failed", String(err));
    // Fallback: if using localhost, retry with 127.0.0.1
    let fallback: string | undefined;
    try {
      const u = new URL(baseUrl);
      if (u.hostname === "localhost") {
        u.hostname = "127.0.0.1";
        fallback = `${u.toString().replace(/\/$/, "")}/v0/context`;
      }
    } catch {}
    if (fallback) {
      logTools("getContext: retrying fallback", fallback);
      const r2 = await tryFetchOnce(fallback);
      if (!r2.ok) throw new Error(`vault-api error ${r2.status} (fallback)`);
      return await r2.json();
    }
    throw err;
  }
}

export async function getContextHandler(): Promise<{ content: Array<{ type: "json"; data: UserContextV0 } | { type: "text"; text: string }> }> {
  const raw = process.env.VAULT_URL || "http://localhost:4000";
  try {
    const data = await fetchContext(raw);
    const fullName = data?.identity?.fullName ?? "unknown";
    const tz = data?.identity?.timezone ?? data?.identity?.tz ?? "";
    const tone = data?.prefs?.tone ?? "";
    const email = data?.comms?.primaryEmail ?? (Array.isArray(data?.identity?.emails) ? data.identity.emails[0] : "");
    const summary = `Fetched context for ${fullName}${tz ? ` (timezone: ${tz})` : ""}${tone ? `, tone: ${tone}` : ""}${email ? `, email: ${email}` : ""}`;
    logTools("getContext: success for", fullName);

    // Default: plain-text only for maximum client compatibility
    if (process.env.MCP_INCLUDE_JSON === "1") {
      return { content: [
        { type: "json", data },
        { type: "text", text: summary }
      ] };
    } else {
      return { content: [{ type: "text", text: summary }] };
    }
  } catch (e: any) {
    logTools("getContext error: baseUrl=", raw, "error=", e?.message || String(e));
    throw new Error(`vault-api fetch failed for ${raw}: ${e?.message || String(e)}`);
  }
}
