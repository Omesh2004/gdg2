"use client";

import { useAppSelector } from "@/store/hooks";
import { AlertCircle, ArrowRight, MessageSquareMore } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AlertBanner() {
  const { activeAlerts, realtimeConnected } = useAppSelector(state => state.alerts);

  if (activeAlerts.length === 0) return null;

  const topAlert = activeAlerts[0];

  return (
    <div className="mb-6 flex items-center justify-between rounded-xl bg-red-50 border border-red-200 p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
          <AlertCircle size={24} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-red-800 uppercase tracking-tight">Active Emergency</h2>
          <p className="text-sm font-medium text-red-700">{topAlert.message}</p>
          <p className="text-xs text-red-600 mt-1">Stream: {realtimeConnected ? "Live" : "Reconnecting"}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="destructive" className="bg-red-600 hover:bg-red-700 font-semibold gap-2">
          <MessageSquareMore size={18} />
          Send Broadcast
        </Button>
        <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-100 hover:text-red-800 gap-2">
          View Protocol
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
