"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import BuildingPathfinder from "./BuildingPathfinder";

export default function ArViewPage() {
  const router = useRouter();
  const profile = useAppSelector((state) => state.auth.profile);
  const userRole = profile?.role ?? "staff";

  useEffect(() => {
    if (userRole === "staff" || userRole === "maintenance") {
      router.replace("/");
    }
  }, [userRole, router]);

  if (userRole === "staff" || userRole === "maintenance") return null;

  return (
    <div className="w-full h-full pb-8">
      <BuildingPathfinder />
    </div>
  );
}