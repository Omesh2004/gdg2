"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Manrope } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/store/StoreProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNavbar } from "@/components/layout/TopNavbar";
import { useAppSelector } from "@/store/hooks";
import { SITE_LOGO_PATH } from "@/lib/branding";
import { getAllowedRolesForPath } from "@/lib/routes";
import { normalizeRole } from "@/lib/auth";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

// Inner layout component that reads Redux state
function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const authStatus = useAppSelector((state) => state.auth.status);
  const currentRole = useAppSelector((state) => state.auth.profile?.role ?? state.system.currentUserRole);
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/auth/callback") || pathname.startsWith("/preview");
  const isSidebarCollapsed = useAppSelector((s) => s.system.isSidebarCollapsed);

  useEffect(() => {
    if (!isAuthRoute && authStatus === "unauthenticated") {
      router.replace("/login");
      return;
    }

    if (!isAuthRoute && authStatus === "authenticated") {
      const allowedRoles = getAllowedRolesForPath(pathname);
      // Normalize currentRole to ensure it's a valid string role
      const normalizedRole = normalizeRole(currentRole);
      // If path has defined roles and the user lacks them, bounce back to safe dashboard
      if (allowedRoles && !allowedRoles.includes(normalizedRole)) {
        router.replace("/");
      }
    }
  }, [authStatus, currentRole, isAuthRoute, pathname, router]);

  if (isAuthRoute) {
    return <>{children}</>;
  }

  if (authStatus === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm text-gray-500">
        Loading CrisisControl...
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar />
      {/* Main content area shifts dynamically */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out max-md:ml-[72px] ${
          isSidebarCollapsed ? "md:ml-[72px]" : "md:ml-[240px]"
        }`}
      >
        <TopNavbar />
        <main className="flex-1 overflow-y-auto mt-16 px-4 py-6 md:px-6 md:py-8 bg-transparent">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={manrope.variable}>
      <head>
        <title>CrisisControl Dashboard</title>
        <meta name="description" content="Real-time Crisis Response & Emergency Coordination System" />
        <link rel="icon" href={SITE_LOGO_PATH} />
      </head>
      <body className="min-h-screen bg-white text-gray-900 antialiased font-sans">
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
