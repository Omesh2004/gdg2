import { Alert, HeatmapPoint, RoleAction, TimelineEvent } from "@/types";

export const initialHeatmapPoints: HeatmapPoint[] = [
  { id: "1", x: 25, y: 35, intensity: "low", label: "Lobby" },
  { id: "2", x: 55, y: 45, intensity: "high", label: "Floor 3 - Room 305" },
  { id: "3", x: 75, y: 50, intensity: "medium", label: "Staircase B" },
  { id: "4", x: 85, y: 75, intensity: "low", label: "Cafe" },
  { id: "5", x: 40, y: 60, intensity: "high", label: "Corridor C" },
];

export const mockAlerts: Alert[] = [
  {
    id: "a1",
    type: "fire",
    location: "Floor 3: Room 305",
    floor: "3",
    severity: "high",
    message: "FIRE ALERT - Floor 3: Room 305 - Evacuate via Staircase B",
    timestamp: new Date().toISOString(),
    actionRequired: "Evacuate",
    status: "active",
  }
];

export const mockRoleActions: RoleAction[] = [
  { id: "r1", role: "Security", assignee: "John", task: "Fire reported - Check Staircase B", status: "pending", priority: "high" },
  { id: "r2", role: "Maintenance", assignee: "Ann", task: "Fire alarm triggered on Floor 3", status: "in-progress", priority: "high" },
  { id: "r3", role: "Guest", assignee: "Guests on Floor 3", task: "Fire alert - Evacuate via Staircase B", status: "pending", priority: "high" },
];

export const mockTimeline: TimelineEvent[] = [
  { id: "t1", time: "10:00 AM", event: "Smoke detected", role: "System", status: "success" },
  { id: "t2", time: "10:01 AM", event: "Alert triggered", role: "System", status: "success" },
  { id: "t3", time: "10:01 AM", event: "Auto-notification to Security", role: "System", status: "success" },
  { id: "t4", time: "10:02 AM", event: "Investigating Floor 3", role: "Security", status: "pending" },
];
