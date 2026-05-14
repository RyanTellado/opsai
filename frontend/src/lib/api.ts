import type { DatasetResponse } from "../types";

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
