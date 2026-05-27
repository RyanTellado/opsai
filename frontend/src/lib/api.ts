import type {
  BriefingBundle,
  Business,
  BusinessWithMeta,
  ChatMessage,
  ChatResponse,
  DatasetResponse,
  ReportSummary,
} from "../types";
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

// ── Businesses ────────────────────────────────────────────────────────────────

export async function createBusiness(
  name: string,
  industry: string,
  description: string,
): Promise<Business> {
  const res = await fetch(`${API_BASE}/businesses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ name, industry, description }),
  });
  return handleResponse<Business>(res);
}

export async function listBusinesses(): Promise<BusinessWithMeta[]> {
  const res = await fetch(`${API_BASE}/businesses`, { headers: authHeaders() });
  return handleResponse<BusinessWithMeta[]>(res);
}

export async function getBusinessReports(businessId: string): Promise<ReportSummary[]> {
  const res = await fetch(`${API_BASE}/businesses/${businessId}/reports`, {
    headers: authHeaders(),
  });
  return handleResponse<ReportSummary[]>(res);
}

// ── Reports / Briefings ───────────────────────────────────────────────────────

export async function getBriefingBundle(briefingId: string): Promise<BriefingBundle> {
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

export async function createBriefingForBusiness(
  datasetId: string,
  businessId: string,
): Promise<BriefingBundle> {
  const res = await fetch(`${API_BASE}/datasets/${datasetId}/briefings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ business_id: businessId }),
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
