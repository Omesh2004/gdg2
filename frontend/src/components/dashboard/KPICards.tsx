"use client";

import { useAppSelector } from "@/store/hooks";
import { Users, UserIcon, AlertTriangle, ShieldAlert, TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function KPICards() {
  const { activeAlerts } = useAppSelector(state => state.alerts);
  const hasLiveAlerts = activeAlerts.length > 0;
  
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  const kpis = [
    {
      title: "Total Guests",
      value: "142",
      trend: "+5.2%",
      trendUp: true,
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Active Staff",
      value: "38",
      trend: "+2.1%",
      trendUp: true,
      icon: UserIcon,
      color: "text-indigo-600"
    },
    {
      title: "Active Alerts",
      value: activeAlerts.length.toString(),
      trend: hasLiveAlerts ? "+100%" : "0%",
      trendUp: !hasLiveAlerts,
      icon: AlertTriangle,
      color: hasLiveAlerts ? "text-red-600" : "text-emerald-600"
    },
    {
      title: "Avg Response",
      value: hasLiveAlerts ? "4.2m" : "N/A",
      trend: "-12%",
      trendUp: true,
      icon: ShieldAlert,
      color: "text-amber-600"
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card-premium p-6 py-5">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex items-end gap-3">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {kpis.map((kpi, index) => (
        <div key={index} className="card-premium p-6 py-5 group animate-in fade-in fill-mode-both" style={{ animationDelay: `${index * 100}ms` }}>
          <div className="flex items-center gap-2 mb-3 text-gray-500 group-hover:text-gray-900 transition-colors">
            <kpi.icon size={16} className={cn("shrink-0", kpi.color)} />
            <span className="text-xs font-semibold tracking-tight uppercase tracking-widest">{kpi.title}</span>
          </div>
          
          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-gray-900">{kpi.value}</h3>
              <div className={cn(
                "flex items-center gap-0.5 text-xs font-bold leading-none mb-1",
                kpi.trendUp ? "text-emerald-500" : "text-red-500"
              )}>
                {kpi.trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {kpi.trend}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
