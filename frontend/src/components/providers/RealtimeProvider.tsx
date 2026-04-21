"use client";

import { useEffect, useRef } from "react";

import { createDashboardSocket } from "@/lib/websocket";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { resolveRealtimeAlert, setRealtimeConnected, upsertRealtimeAlert } from "@/store/slices/alertsSlice";
import type { Alert } from "@/types";

type IncomingDashboardEvent = {
  event_type?: string;
  anomaly_id?: string;
  details?: {
    anomaly_type?: string;
    camera_id?: string;
    floor?: string;
    message?: string;
    timestamp?: string;
    confidence?: number;
  };
  timestamp?: string;
};

function toAlertType(value: string | undefined): Alert["type"] {
  const normalized = String(value || "security").toLowerCase();

  if (normalized.includes("fire") || normalized.includes("smoke")) return "fire";
  if (normalized.includes("medical")) return "medical";
  if (normalized.includes("crowd")) return "crowd";
  if (normalized.includes("evac")) return "evacuation";
  return "security";
}

function toSeverity(confidence: number | undefined): Alert["severity"] {
  if (typeof confidence !== "number") return "high";
  if (confidence >= 0.95) return "critical";
  if (confidence >= 0.85) return "high";
  if (confidence >= 0.75) return "medium";
  return "low";
}

function eventToAlert(event: IncomingDashboardEvent): Alert {
  const details = event.details || {};
  const floor = details.floor || "Unknown floor";
  const location = details.camera_id || details.floor || "Unknown location";
  const type = toAlertType(details.anomaly_type);

  return {
    id: event.anomaly_id || `${location}-${details.timestamp || event.timestamp || Date.now()}`,
    type,
    location,
    floor,
    severity: toSeverity(details.confidence),
    message: details.message || `${String(details.anomaly_type || "Anomaly")} detected at ${location}`,
    timestamp: details.timestamp || event.timestamp || new Date().toISOString(),
    actionRequired: "Verify site and execute evacuation protocol if risk persists.",
    status: "active",
  };
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const authStatus = useAppSelector((state) => state.auth.status);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    const disconnect = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }

      reconnectTimerRef.current = null;
      reconnectAttemptsRef.current = 0;

      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }

      dispatch(setRealtimeConnected(false));
    };

    if (authStatus !== "authenticated") {
      disconnect();
      return () => {
        isMounted = false;
      };
    }

    const connect = () => {
      if (!isMounted) return;

      const socket = createDashboardSocket({
        onOpen: () => {
          reconnectAttemptsRef.current = 0;
          dispatch(setRealtimeConnected(true));
        },
        onClose: () => {
          dispatch(setRealtimeConnected(false));

          if (!isMounted) return;

          const retryInMs = Math.min(15000, 1000 * Math.pow(2, reconnectAttemptsRef.current));
          reconnectAttemptsRef.current += 1;
          reconnectTimerRef.current = window.setTimeout(connect, retryInMs);
        },
        onError: () => {
          dispatch(setRealtimeConnected(false));
        },
        onMessage: (payload) => {
          const event = payload as IncomingDashboardEvent;

          if (event.event_type === "CRITICAL_ALERT") {
            dispatch(upsertRealtimeAlert(eventToAlert(event)));
            return;
          }

          if (event.event_type === "ALERT_RESOLVED" && event.anomaly_id) {
            dispatch(resolveRealtimeAlert(event.anomaly_id));
          }
        },
      });

      socketRef.current = socket;
    };

    connect();

    return () => {
      isMounted = false;
      disconnect();
    };
  }, [authStatus, dispatch]);

  return <>{children}</>;
}
