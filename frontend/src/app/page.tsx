"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, MessageSquareText, ShieldAlert, Sparkles, UsersRound, View, Shield, Wrench, Activity, AlertTriangle, CalendarClock } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/utils";
import { AlertBanner } from "@/components/dashboard/AlertBanner";

// --- START SHARED MOCK DATA ---
const metricCards = [
  { label: "Guests Present", value: "87", sub: "Live occupancy" },
  { label: "Staff Present", value: "24", sub: "On duty now" },
  { label: "Active Alerts", value: "3", sub: "Requires action" },
  { label: "System Active", value: "100%", sub: "Monitoring online" },
];

const roleAlerts = [
  { role: "Security", owner: "John", text: "Fire reported - Check Staircase B" },
  { role: "Maintenance", owner: "Ann", text: "Fire alarm triggered on Floor 3" },
  { role: "Guests", owner: "Floor 3", text: "Evacuate through Staircase B" },
];

const dashboardLogs = [
  { time: "14:22", role: "Security", msg: "Fire reported - Check Staircase B", status: "Sent" },
  { time: "14:17", role: "Maintenance", msg: "Fire alarm triggered on Floor 3", status: "Sent" },
  { time: "14:12", role: "Guests", msg: "Evacuate immediately via Staircase B", status: "Queued" },
];

const alertsData = [
  { id: "A-103", title: "Smoke sensor triggered", severity: "critical", status: "active", location: "Floor 3 - Room 305", createdAt: "14:22", details: "Immediate evacuation protocol activated for adjacent zones." },
  { id: "A-102", title: "Crowd density threshold exceeded", severity: "high", status: "acknowledged", location: "Main Lobby", createdAt: "14:10", details: "Security deployed to redistribute entry lines." },
  { id: "A-101", title: "Unauthorized badge attempt", severity: "medium", status: "resolved", location: "Gate B", createdAt: "13:58", details: "Attempt blocked and incident logged to audit trail." },
  { id: "A-100", title: "CCTV signal intermittent", severity: "low", status: "resolved", location: "Parking Level", createdAt: "13:31", details: "Connectivity normalized after network failover." },
];

const alertBadge: Record<string, string> = {
  critical: "bg-gray-900 text-white", high: "bg-gray-100 text-gray-800", medium: "bg-blue-50 text-blue-700", low: "bg-gray-50 text-gray-600",
  active: "bg-blue-50 text-blue-700", acknowledged: "bg-gray-100 text-gray-700", resolved: "bg-gray-50 text-gray-600",
};

const personnelData = [
  { id: "P-1001", name: "Priya Menon", role: "Guest", status: "active", zone: "Floor 3", lastActivity: "2m ago" },
  { id: "P-1002", name: "John Mercer", role: "Security", status: "active", zone: "Gate A", lastActivity: "Just now" },
  { id: "P-1003", name: "Mina Joshi", role: "Maintenance", status: "idle", zone: "Floor 1", lastActivity: "7m ago" },
  { id: "P-1004", name: "Neha Singh", role: "Staff", status: "active", zone: "Lobby", lastActivity: "1m ago" },
  { id: "P-1006", name: "Sonal Verma", role: "Guest", status: "idle", zone: "Floor 2", lastActivity: "14m ago" },
];

const peopleStatusClass: Record<string, string> = {
  active: "bg-blue-50 text-blue-700", idle: "bg-gray-100 text-gray-700", offline: "bg-gray-50 text-gray-500",
};

const securityLogs = [
  { id: "SEC-301", actor: "john.mercer", action: "door_lock_override", resource: "Gate B", time: "14:18", risk: "high" },
  { id: "SEC-300", actor: "sarah.okafor", action: "camera_feed_access", resource: "Floor 3 Corridor", time: "14:12", risk: "medium" },
  { id: "SEC-299", actor: "system", action: "failed_badge_attempt", resource: "North Entrance", time: "13:58", risk: "high" },
  { id: "SEC-298", actor: "raj.sharma", action: "patrol_checkpoint", resource: "Stairwell N", time: "13:47", risk: "low" },
];

const riskBadge: Record<string, string> = {
  low: "bg-gray-100 text-gray-700", medium: "bg-blue-50 text-blue-700", high: "bg-gray-900 text-white",
};

const maintenanceTasks = [
  { id: "MNT-200", title: "Sprinkler pressure test", area: "Floor 3", assignedTo: "Dev Kumar", due: "Today 15:00", status: "in-progress" },
  { id: "MNT-199", title: "HVAC filter replacement", area: "Server room", assignedTo: "Mina Joshi", due: "Today 17:00", status: "pending" },
  { id: "MNT-197", title: "Water leakage fix", area: "Corridor B", assignedTo: "Mina Joshi", due: "Today 14:00", status: "blocked" },
];

const taskStatusClass: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700", "in-progress": "bg-blue-50 text-blue-700", blocked: "bg-gray-900 text-white", completed: "bg-gray-50 text-gray-600",
};
// --- END SHARED MOCK DATA ---

function Initials({ name }: { name: string }) {
  const ini = name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-700">{ini}</span>;
}

function AdminDashboard({ greetingName, greetingRole, now }: { greetingName: string, greetingRole: string, now: string }) {
  return (
    <div className="mx-auto max-w-[1320px] space-y-4 pb-20">
      <section className="surface-card p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">CrisisControl Dashboard</p>
            <h1 className="mt-1 text-xl font-semibold text-gray-900 md:text-2xl">Welcome back, {greetingName}</h1>
            <p className="mt-1 text-sm text-gray-600">Role: {greetingRole}. Fire alert at Floor 3 Room 305. Coordination and broadcasting currently active.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/sms" className="inline-flex h-9 items-center gap-1 rounded-lg bg-blue-700 px-3 text-sm font-medium text-white hover:bg-blue-800">
              <MessageSquareText size={14} /> Send SMS
            </Link>
            <Link href="/ar-view" className="inline-flex h-9 items-center gap-1 rounded-lg border border-gray-300 px-3 text-sm text-gray-700 hover:bg-gray-100">
              <View size={14} /> AR View (Coming Soon)
            </Link>
            <span className="inline-flex h-9 items-center rounded-lg border border-gray-300 px-3 text-xs font-semibold text-gray-500">Updated {now}</span>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-800">
        <p className="inline-flex items-center gap-1 font-semibold"><ShieldAlert size={14} /> Fire Alert</p>
        <p className="mt-0.5 text-red-700">Floor 3 Room 305 - Evacuate via Staircase B and keep elevators disabled.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((item) => (
          <article key={item.label} className="surface-card p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{item.label}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{item.value}</p>
            <p className="text-xs text-gray-500">{item.sub}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <article className="surface-card p-3 xl:col-span-8">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Live Heatmap</h2>
            <span className="text-xs text-gray-500">Updated just now</span>
          </div>
          <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-3">
            <div className="grid h-[240px] place-items-center rounded-md border border-dashed border-gray-300 bg-[linear-gradient(0deg,#f8fafc_1px,transparent_1px),linear-gradient(90deg,#f8fafc_1px,transparent_1px)] bg-[size:20px_20px]">
              <p className="text-sm text-gray-500">Interactive hotel map area - AR layer ready placeholder</p>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {roleAlerts.map((item) => (
                <div key={item.role + item.owner} className="rounded-md border border-gray-200 bg-white p-2.5">
                  <p className="text-xs font-semibold text-gray-900">{item.owner} <span className="font-normal text-gray-500">- {item.role}</span></p>
                  <p className="mt-0.5 text-xs text-gray-600">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </article>

        <div className="space-y-3 xl:col-span-4">
          <article className="surface-card p-3">
            <h3 className="text-sm font-semibold text-gray-900">Broadcast Shortcuts</h3>
            <div className="mt-2 space-y-2">
              <Link href="/sms" className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
                Send evacuation message <ArrowRight size={14} />
              </Link>
              <button className="flex w-full items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
                Notify emergency team <ArrowRight size={14} />
              </button>
              <button className="flex w-full items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
                Push hotel-wide advisory <ArrowRight size={14} />
              </button>
            </div>
          </article>

          <article className="surface-card p-3">
            <h3 className="text-sm font-semibold text-gray-900">AR Roadmap</h3>
            <p className="mt-1 text-xs text-gray-600">When your AR hotel view is ready, this panel can toggle AR overlays and route instructions.</p>
            <Link href="/ar-view" className="mt-2 inline-flex h-8 items-center gap-1 rounded-md border border-gray-300 px-3 text-xs text-gray-700 hover:bg-gray-100">
              <Sparkles size={13} /> Enable AR controls later
            </Link>
          </article>
        </div>
      </section>

      <section className="surface-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-gray-900">Alert Log</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Time</th>
                <th className="px-4 py-2 text-left">Role</th>
                <th className="px-4 py-2 text-left">Message</th>
                <th className="px-4 py-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {dashboardLogs.map((item) => (
                <tr key={item.time + item.role} className="border-t border-gray-100">
                  <td className="px-4 py-2.5 text-xs text-gray-500">{item.time}</td>
                  <td className="px-4 py-2.5 text-gray-700">{item.role}</td>
                  <td className="px-4 py-2.5 text-gray-700">{item.msg}</td>
                  <td className="px-4 py-2.5 text-right"><span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">{item.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StandardDashboard({ greetingName, greetingRole }: { greetingName: string, greetingRole: string }) {
  return (
    <div className="mx-auto max-w-[1320px] space-y-4 pb-20">
      <section className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-2">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 md:text-2xl">Operations Command Center</h1>
          <p className="mt-1 text-sm text-gray-600">Unified tracking dashboard dynamically aggregating facility metrics for {greetingName}.</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold">
           <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-full border border-red-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              Fire Alert: Floor 3
           </span>
           <span className="flexItems-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
              <Activity size={12} /> System Normal
           </span>
        </div>
      </section>

      {/* Metric Counters */}
      <section className="grid gap-3 grid-cols-2 md:grid-cols-4 px-2">
        {metricCards.map((item) => (
          <div key={item.label} className="surface-card flex flex-col justify-center p-4 shadow-sm hover:shadow transition-shadow">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{item.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 tracking-tight">{item.value}</p>
          </div>
        ))}
      </section>

      {/* 4-Quadrant God View */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Quadrant 1: ALERTS */}
        <section className="surface-card flex flex-col h-[380px] overflow-hidden">
          <div className="border-b border-gray-200 px-4 py-3 bg-[linear-gradient(110deg,#fef2f2_0%,#ffffff_100%)]">
            <h2 className="text-sm font-bold text-red-900 flex items-center gap-2"><AlertTriangle size={15}/> Live Incident Feed</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50/50">
            {alertsData.map((row) => (
              <div key={row.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-gray-900 text-sm leading-snug">{row.title}</p>
                  <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0", alertBadge[row.severity])}>{row.severity}</span>
                </div>
                <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-gray-500 font-medium">
                  <span>{row.location}</span>
                  <span className="text-gray-300">•</span>
                  <span>{row.createdAt}</span>
                </div>
                {row.status === "active" && <p className="text-xs text-red-700 bg-red-50 p-2 rounded mt-1 border border-red-100">{row.details}</p>}
              </div>
            ))}
          </div>
        </section>

        {/* Quadrant 2: PERSONNEL */}
        <section className="surface-card flex flex-col h-[380px] overflow-hidden">
          <div className="border-b border-gray-200 px-4 py-3 bg-white">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2"><UsersRound size={15} className="text-blue-600"/> Personnel Directory</h2>
          </div>
          <div className="flex-1 overflow-y-auto bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10 text-[10px] uppercase tracking-wider text-gray-500 shadow-sm">
                <tr><th className="px-4 py-2 text-left">Person</th><th className="px-3 py-2 text-left">Zone</th><th className="px-3 py-2 text-right">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {personnelData.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <Initials name={p.name} />
                        <div><p className="font-semibold text-gray-900 text-[13px]">{p.name}</p><p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{p.role}</p></div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-600 font-medium">{p.zone}</td>
                    <td className="px-3 py-2.5 text-right"><span className={cn("px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider", peopleStatusClass[p.status])}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Quadrant 3: MAINTENANCE */}
        <section className="surface-card flex flex-col h-[380px] overflow-hidden">
          <div className="border-b border-gray-200 px-4 py-3 bg-[linear-gradient(110deg,#f8fafc_0%,#ffffff_100%)]">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Wrench size={15} className="text-gray-600"/> Maintenance Tasks</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 bg-white">
            <div className="space-y-3">
              {maintenanceTasks.map((t) => (
                <div key={t.id} className="flex gap-3 items-center p-3 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors bg-white shadow-sm">
                  <div className={cn("w-1.5 h-10 rounded-full", t.status === "blocked" ? "bg-red-500" : "bg-blue-500")}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{t.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500 flex items-center gap-1.5 font-medium">
                       <CalendarClock size={12} className="text-gray-400"/> {t.due} <span className="text-gray-300">•</span> {t.area}
                    </p>
                  </div>
                  <span className={cn("whitespace-nowrap px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider", taskStatusClass[t.status])}>{t.status}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quadrant 4: SECURITY */}
        <section className="surface-card flex flex-col h-[380px] overflow-hidden">
          <div className="border-b border-gray-200 px-4 py-3 bg-white">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Shield size={15} className="text-gray-800"/> Security Audit Log</h2>
          </div>
          <div className="flex-1 overflow-y-auto bg-gray-50/50">
            <div className="divide-y divide-gray-200/60">
              {securityLogs.map((s) => (
                <div key={s.id} className="p-3 bg-white flex flex-col gap-1.5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded tracking-wide">{s.id}</span>
                    <span className="text-[10px] text-gray-500 font-semibold">{s.time}</span>
                  </div>
                  <p className="text-sm text-gray-900 font-medium">
                     <span className="font-bold text-gray-700">{s.actor}</span> performed <span className="underline decoration-gray-300 underline-offset-2">{s.action}</span>
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-500 font-medium">Resource: {s.resource}</p>
                    <span className={cn("px-2.5 py-0.5 rounded text-[10px] uppercase font-bold", riskBadge[s.risk])}>{s.risk} Risk</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const profile = useAppSelector((state) => state.auth.profile);
  const now = useMemo(() => new Date().toLocaleString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "2-digit" }), []);
  
  if (!profile) return null; // Prevents hydration mismatch while loading

  const greetingName = profile.fullName ?? "Operator";
  const greetingRole = profile.role ?? "staff";

  const isStandardUser = greetingRole === "staff" || greetingRole === "maintenance";

  if (isStandardUser) {
    return (
      <>
        <AlertBanner />
        <StandardDashboard greetingName={greetingName} greetingRole={greetingRole} />
      </>
    );
  }

  return (
    <>
      <AlertBanner />
      <AdminDashboard greetingName={greetingName} greetingRole={greetingRole} now={now} />
    </>
  );
}
