"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toggleSidebar } from "@/store/slices/systemSlice";
import { cn } from "@/lib/utils";
import { SITE_LOGO_PATH } from "@/lib/branding";
import { ROUTE_CONFIG } from "@/lib/routes";
import {
  ChevronLeft,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const isSidebarCollapsed = useAppSelector((state) => state.system.isSidebarCollapsed);
  const rawRole = useAppSelector((state) => state.auth.profile?.role ?? state.system.currentUserRole);
  const currentRole = String(rawRole).toLowerCase();

  const activeRoot = useMemo(() => {
    const match = ROUTE_CONFIG.find((item) => item.href !== "/" && pathname.startsWith(item.href));
    return match?.href || "/";
  }, [pathname]);

  const visibleItems = useMemo(
    () => ROUTE_CONFIG.filter((item) => item.roles.some((role) => role === currentRole)),
    [currentRole]
  );

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 h-full border-r border-gray-200 bg-white transition-all duration-200 w-[72px]",
        !isSidebarCollapsed && "md:w-[240px]"
      )}
      aria-label="Primary"
    >
      <div className="flex h-16 items-center border-b border-gray-200 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-8 w-8 overflow-hidden rounded-lg border border-blue-100 bg-white">
            <Image src={SITE_LOGO_PATH} alt="CrisisControl" fill className="object-cover" sizes="32px" />
          </div>
          {!isSidebarCollapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900 max-md:hidden">CrisisControl</p>
              <p className="truncate text-xs text-gray-500 max-md:hidden">Crisis Response Dashboard</p>
            </div>
          )}
        </div>
      </div>

      <nav className="space-y-1 px-2 py-3">
        {visibleItems.map((item) => {
          const isActive = item.href === activeRoot;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "group flex h-10 cursor-pointer items-center rounded-lg px-3 text-sm font-medium transition-colors",
                "justify-center px-0 md:justify-start md:px-3",
                isActive
                  ? "bg-blue-50 text-blue-800"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon
                size={18}
                className={cn(
                  "shrink-0",
                  isActive ? "text-blue-700" : "text-gray-500 group-hover:text-gray-700"
                )}
              />
              {!isSidebarCollapsed && <span className="ml-3 truncate max-md:hidden">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-3 left-0 w-full px-2">
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="flex h-10 w-full cursor-pointer items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100"
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className={cn("transition-transform", isSidebarCollapsed && "rotate-180")} size={18} />
        </button>
      </div>
    </aside>
  );
}
