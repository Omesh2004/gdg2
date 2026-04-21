export type UserRole = 'admin' | 'security' | 'staff' | 'maintenance' | string;
export type PersonnelStatus = 'active' | 'idle' | 'offline' | 'responding';

export interface User {
  id: string;
  name: string;
  role: "Security" | "Maintenance" | "Guest" | "Staff";
  location: string;
}

export interface RolePersonnel {
  id: string;
  name: string;
  role: UserRole;
  badge: string;
  zone: string;
  floor: string;
  status: PersonnelStatus;
  lastSeen: string;
  currentTask?: string;
  phone?: string;
  email?: string;
}

export interface Alert {
  id: string;
  type: "fire" | "crowd" | "security" | "medical" | "evacuation";
  location: string;
  floor: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  timestamp: string;
  actionRequired: string;
  status: "active" | "acknowledged" | "resolved";
  acknowledgedBy?: string;
}

export type SMSTarget = 'all' | 'floor-1' | 'floor-2' | 'floor-3' | 'security' | 'staff' | 'maintenance' | 'custom';
export type SMSPriority = 'normal' | 'urgent' | 'critical';
export type SMSStatus = 'queued' | 'sending' | 'sent' | 'partial' | 'failed';

export interface SMSLog {
  id: string;
  timestamp: string;
  message: string;
  target: SMSTarget;
  targetLabel: string;
  recipientCount: number;
  successCount: number;
  failedCount: number;
  queuedCount: number;
  status: SMSStatus;
  priority: SMSPriority;
  sentBy: string;
}

export interface HeatmapPoint {
  id: string;
  x: number;
  y: number;
  intensity: "low" | "medium" | "high";
  label: string;
}

export interface RoleAction {
  id: string;
  role: string;
  assignee: string;
  task: string;
  status: "pending" | "in-progress" | "completed";
  priority: "low" | "medium" | "high";
}

export interface TimelineEvent {
  id: string;
  time: string;
  event: string;
  role: string;
  status: "success" | "pending" | "failed";
}

export interface MaintenanceTask {
  id: string;
  title: string;
  zone: string;
  floor: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "pending" | "in-progress" | "completed" | "blocked";
  assignedTo: string;
  dueDate: string;
  category: "electrical" | "plumbing" | "hvac" | "safety" | "general";
}

export interface GuestRecord {
  id: string;
  name: string;
  room: string;
  floor: string;
  checkIn: string;
  checkOut: string;
  status: "checked-in" | "checked-out" | "pending";
  phone?: string;
}
