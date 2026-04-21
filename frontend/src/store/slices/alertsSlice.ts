import { createSlice } from '@reduxjs/toolkit';
import { Alert, HeatmapPoint, RoleAction, TimelineEvent } from '@/types';
import { initialHeatmapPoints, mockAlerts, mockRoleActions, mockTimeline } from '@/lib/mockData';

interface AlertsState {
  activeAlerts: Alert[];
  heatmapPoints: HeatmapPoint[];
  roleActions: RoleAction[];
  timeline: TimelineEvent[];
  realtimeConnected: boolean;
}

const initialState: AlertsState = {
  activeAlerts: [],
  heatmapPoints: initialHeatmapPoints.map(p => ({ ...p, intensity: 'low' as const })),
  roleActions: [],
  timeline: [],
  realtimeConnected: false,
};

export const alertsSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    triggerEmergency: (state) => {
      state.activeAlerts = mockAlerts;
      state.heatmapPoints = initialHeatmapPoints;
      state.roleActions = mockRoleActions;
      state.timeline = mockTimeline;
    },
    resolveEmergency: (state) => {
      state.activeAlerts = [];
      state.heatmapPoints = state.heatmapPoints.map(p => ({ ...p, intensity: 'low' as const }));
      state.roleActions = [];
      state.timeline = [];
    },
    setRealtimeConnected: (state, action) => {
      state.realtimeConnected = action.payload;
    },
    upsertRealtimeAlert: (state, action) => {
      const incomingAlert: Alert = action.payload;
      const existingIndex = state.activeAlerts.findIndex((alert) => alert.id === incomingAlert.id);

      if (existingIndex >= 0) {
        state.activeAlerts[existingIndex] = { ...state.activeAlerts[existingIndex], ...incomingAlert };
        return;
      }

      state.activeAlerts.unshift(incomingAlert);
    },
    resolveRealtimeAlert: (state, action) => {
      const anomalyId: string = action.payload;
      state.activeAlerts = state.activeAlerts.filter((alert) => alert.id !== anomalyId);
    }
  },
});

export const { triggerEmergency, resolveEmergency, setRealtimeConnected, upsertRealtimeAlert, resolveRealtimeAlert } = alertsSlice.actions;
export default alertsSlice.reducer;
