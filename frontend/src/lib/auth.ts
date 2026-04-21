import { apiClient } from "@/lib/api";
import { Role, isValidRole } from "@/lib/rbac";

export type AuthRole = "admin" | "security" | "staff" | "maintenance" | "guest";

export interface AuthProfile {
  id: string;
  email: string;
  fullName: string;
  role: AuthRole;
  avatarUrl: string | null;
}

/**
 * Normalize and validate user role from backend
 */
export function normalizeRole(role: string | unknown): AuthRole {
  const roleStr = String(role).toLowerCase();
  if (isValidRole(roleStr)) {
    return roleStr as AuthRole;
  }
  // Fallback to guest role if invalid
  return "guest" as AuthRole;
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
