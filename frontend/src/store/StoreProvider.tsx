"use client";

import { Provider } from "react-redux";
import { store } from "./store";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { RealtimeProvider } from "@/components/providers/RealtimeProvider";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthProvider>
        <RealtimeProvider>{children}</RealtimeProvider>
      </AuthProvider>
    </Provider>
  );
}
