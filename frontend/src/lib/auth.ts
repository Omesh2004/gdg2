import { apiClient } from "@/lib/api";

export type AuthRole = "admin" | "security" | "staff" | "maintenance";

export interface AuthProfile {
  id: string;
  email: string;
  fullName: string;
  role: AuthRole;
  avatarUrl: string | null;
}

const API_BASE_URL = apiClient.defaults.baseURL?.replace(/\/api\/v1$/, "") || "http://localhost:8000";

export function signInWithGoogle() {
  const returnTo = `${window.location.origin}/auth/callback`;
  window.location.assign(`${API_BASE_URL}/api/v1/auth/login?return_to=${encodeURIComponent(returnTo)}`);
}

export async function signOutUser() {
  await apiClient.post("/auth/logout");
}

export async function loadBackendProfile(): Promise<AuthProfile> {
  const { data } = await apiClient.get<AuthProfile>("/auth/me");
  return data;
}
