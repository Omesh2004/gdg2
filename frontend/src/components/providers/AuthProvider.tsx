"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/store/hooks";
import { setAuthenticated, setAuthLoading, setUnauthenticated } from "@/store/slices/authSlice";
import { setUserRole } from "@/store/slices/systemSlice";
import { loadBackendProfile } from "@/lib/auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let active = true;

    dispatch(setAuthLoading());

    const syncSession = async () => {
      try {
        const profile = await loadBackendProfile();
        if (!active) {
          return;
        }

        dispatch(setAuthenticated(profile));
        dispatch(setUserRole(profile.role));
      } catch {
        if (!active) {
          return;
        }

        dispatch(setUnauthenticated());
      }
    };

    void syncSession();

    return () => {
      active = false;
    };
  }, [dispatch]);

  return <>{children}</>;
}
