"use client";

import React, { createContext, useContext, ReactNode } from "react";

interface SocketContextType {
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const connect = () => {
    // Notifications handled via polling - no WebSocket connection needed
  };

  const disconnect = () => {
    // No cleanup needed for polling approach
  };

  const value: SocketContextType = {
    isConnected: false, // Always false since we're using polling
    connect,
    disconnect,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
