import type { BriefingBundle, ChatMessage, ChatResponse, DatasetResponse } from "../types";
import { getToken } from "./auth";

const API_BASE = "http://127.0.0.1:8000";

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  token: string;
  name: string;
  email: string;
}

export async function signupUser(
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  return handleResponse<AuthResponse>(res);
}

export async function loginUser(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<AuthResponse>(res);
}

// ── Reports ───────────────────────────────────────────────────────────────────

export interface ReportSummary {
  id: string;
  headline: string;
  created_at: string;
  dataset_id: string;
  briefing_id: string;
}

export async function listReports(): Promise<ReportSummary[]> {
  const res = await fetch(`${API_BASE}/users/me/reports`, {
    headers: authHeaders(),
  });
  return handleResponse<ReportSummary[]>(res);
}

export async function getBriefing(briefingId: string): Promise<BriefingBundle> {
  const res = await fetch(`${API_BASE}/briefings/${briefingId}`, {
    headers: authHeaders(),
  });
  return handleResponse<BriefingBundle>(res);
}

// ── Datasets ──────────────────────────────────────────────────────────────────

export async function uploadDataset(
  file: File,
  description: string,
): Promise<DatasetResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("description", description);

  const res = await fetch(`${API_BASE}/datasets`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  return handleResponse<DatasetResponse>(res);
}

export async function createBriefing(datasetId: string): Promise<BriefingBundle> {
  const res = await fetch(`${API_BASE}/datasets/${datasetId}/briefings`, {
    method: "POST",
    headers: authHeaders(),
  });
  return handleResponse<BriefingBundle>(res);
}

// ── Chat ──────────────────────────────────────────────────────────────────────

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
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return handleResponse<ChatResponse>(res);
}
