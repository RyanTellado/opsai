import type { BriefingBundle, ChatMessage, ChatResponse, DatasetResponse } from "../types";

const API_BASE = "http://127.0.0.1:8000";

export async function uploadDataset(
  file: File,
  description: string,
): Promise<DatasetResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("description", description);

  const res = await fetch(`${API_BASE}/datasets`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }

  return res.json();
}

export async function createBriefing(datasetId: string): Promise<BriefingBundle> {
  const res = await fetch(`${API_BASE}/datasets/${datasetId}/briefings`, {
    method: "POST",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

export async function sendChat(
  datasetId: string,
  message: string,
  history: ChatMessage[],
): Promise<ChatResponse> {
  const payload = {
    message,
    history: history.map((m) => ({ role: m.role, content: m.content })),
  };
  const res = await fetch(`${API_BASE}/datasets/${datasetId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}
