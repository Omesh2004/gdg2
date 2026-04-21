"use client";

import { useEffect, useRef, useState } from "react";

function getSocketUrl() {
  const configured = process.env.NEXT_PUBLIC_WS_URL;
  if (configured) return configured;

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.hostname}:8000/ws/dashboard`;
}

function normalizeIncident(payload) {
  const details = payload?.details || {};
  const timestamp = details.timestamp || payload?.timestamp || new Date().toISOString();
  const id = payload?.anomaly_id || `${details.camera_id || "unknown"}-${timestamp}`;

  return {
    id,
    type: String(details.anomaly_type || "anomaly"),
    floor: String(details.floor || ""),
    cameraId: String(details.camera_id || "unknown"),
    message: String(details.message || `${details.anomaly_type || "Anomaly"} detected`),
    timestamp,
  };
}

export function useCrisisSocket() {
  const [status, setStatus] = useState("connecting");
  const [incidents, setIncidents] = useState([]);
  const reconnectTimerRef = useRef(null);
  const attemptsRef = useRef(0);

  useEffect(() => {
    let isMounted = true;
    let socket = null;

    const connect = () => {
      if (!isMounted) return;

      setStatus("connecting");
      socket = new WebSocket(getSocketUrl());

      socket.onopen = () => {
        attemptsRef.current = 0;
        setStatus("connected");
      };

      socket.onclose = () => {
        setStatus("disconnected");
        if (!isMounted) return;

        const waitMs = Math.min(15000, 1000 * Math.pow(2, attemptsRef.current));
        attemptsRef.current += 1;
        reconnectTimerRef.current = window.setTimeout(connect, waitMs);
      };

      socket.onerror = () => {
        setStatus("disconnected");
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload?.event_type === "CRITICAL_ALERT") {
            const incident = normalizeIncident(payload);
            setIncidents((prev) => {
              const filtered = prev.filter((item) => item.id !== incident.id);
              return [incident, ...filtered].slice(0, 20);
            });
            return;
          }

          if (payload?.event_type === "ALERT_RESOLVED") {
            const resolvedId = String(payload?.anomaly_id || "");
            setIncidents((prev) => prev.filter((item) => item.id !== resolvedId));
          }
        } catch {
          // Ignore malformed payloads.
        }
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      if (socket) {
        socket.close();
      }
    };
  }, []);

  return { status, incidents };
}
