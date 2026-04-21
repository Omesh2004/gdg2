import {
  AlertTriangle,
  Box,
  FileText,
  House,
  MessageSquareText,
  Settings,
  Shield,
  Users,
  Wrench,
} from "lucide-react";

export type NavItem = {
  label: string;
  icon: any; // Using any for icon component to avoid complex prop matching in types
  href: string;
  roles: string[];
};

export const ROUTE_CONFIG: NavItem[] = [
  { label: "Home", icon: House, href: "/", roles: ["admin", "security", "staff", "maintenance"] },
  { label: "Alerts", icon: AlertTriangle, href: "/alerts", roles: ["admin", "security"] },
  { label: "People", icon: Users, href: "/people", roles: ["admin", "security"] },
  { label: "AR View", icon: Box, href: "/ar-view", roles: ["admin"] },
  { label: "SMS", icon: MessageSquareText, href: "/sms", roles: ["admin", "security"] },
  { label: "Security", icon: Shield, href: "/security", roles: ["admin", "security"] },
  { label: "Maintenance", icon: Wrench, href: "/maintenance", roles: ["admin", "maintenance"] },
  { label: "Reports", icon: FileText, href: "/reports", roles: ["admin", "security"] },
  { label: "Settings", icon: Settings, href: "/settings", roles: ["admin", "security", "staff", "maintenance"] },
];

/**
 * Helper to get the allowed roles for a given path.
 * If the exact path matches, returns those roles.
 * If not, tries to match the root level path (e.g. /alerts from /alerts/123).
 */
export function getAllowedRolesForPath(pathname: string): string[] | null {
  // Try exact match
  let roles: string[] | null = null;
  const exactMatch = ROUTE_CONFIG.find((route) => route.href === pathname);
  
  if (exactMatch) {
    roles = exactMatch.roles;
  } else {
    // Try root match (e.g., /people/123 -> /people)
    const rootPath = `/${pathname.split("/")[1]}`;
    const rootMatch = ROUTE_CONFIG.find((route) => route.href === rootPath && rootPath !== "/");
    if (rootMatch) {
      roles = rootMatch.roles;
    }
  }

  if (roles) {
    return roles.includes("admin") ? roles : [...roles, "admin"];
  }

  // Allow only admin if it's an unmapped route
  return ["admin"];
}
