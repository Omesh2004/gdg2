import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AuthRole } from '@/lib/auth';

interface SystemState {
  isActive: boolean;
  isEmergencySimulated: boolean;
  currentBuilding: string;
  currentFloor: string;
  isSidebarCollapsed: boolean;
  currentUserRole: AuthRole;
}

const initialState: SystemState = {
  isActive: true,
  isEmergencySimulated: false,
  currentBuilding: "Main Building",
  currentFloor: "Floor 3",
  isSidebarCollapsed: false,
  currentUserRole: 'admin' as AuthRole,
};

export const systemSlice = createSlice({
  name: 'system',
  initialState,
  reducers: {
    toggleEmergencySimulation: (state) => {
      state.isEmergencySimulated = !state.isEmergencySimulated;
    },
    setBuilding: (state, action: PayloadAction<string>) => {
      state.currentBuilding = action.payload;
    },
    setFloor: (state, action: PayloadAction<string>) => {
      state.currentFloor = action.payload;
    },
    toggleSidebar: (state) => {
      state.isSidebarCollapsed = !state.isSidebarCollapsed;
    },
    setUserRole: (state, action: PayloadAction<AuthRole>) => {
      state.currentUserRole = action.payload;
    },
  },
});

export const { toggleEmergencySimulation, setBuilding, setFloor, toggleSidebar, setUserRole } = systemSlice.actions;
export default systemSlice.reducer;
