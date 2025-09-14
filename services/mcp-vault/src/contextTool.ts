import fetch from "node-fetch";

export type UserContextV0 = any; // keep minimal; schema lives in packages/schema

export async function fetchContext(baseUrl: string): Promise<UserContextV0> {
  const r = await fetch(`${baseUrl}/v0/context`);
  if (!r.ok) throw new Error(`vault-api error ${r.status}`);
  return r.json();
}

export async function getContextHandler(): Promise<{ content: Array<{ type: "json"; data: UserContextV0 }> }> {
  const baseUrl = process.env.VAULT_URL || "http://localhost:4000";
  const data = await fetchContext(baseUrl);
  return { content: [{ type: "json", data }] };
}
