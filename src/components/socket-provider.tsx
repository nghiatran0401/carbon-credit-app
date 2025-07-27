"use client";

import React, { createContext, useContext, useEffect, useRef, ReactNode, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./auth-context";
import { useNotifications } from "./notification-context";
import { Notification } from "@/types";

interface SocketContextType {
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();
  const { addNotification } = useNotifications();

  const connect = useCallback(() => {
    if (!user?.id || socketRef.current?.connected) return;

    // Clean up existing connection
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Create socket connection
    socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001", {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 20000,
    });

    const socket = socketRef.current;

    // Handle connection
    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);

      // Authenticate with user ID
      socket.emit("authenticate", user.id);
      socket.emit("join-user-room", user.id);
    });

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);

      // Clear any existing reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    });

    // Handle reconnection
    socket.on("reconnect", (attemptNumber) => {
      console.log("Socket reconnected after", attemptNumber, "attempts");

      // Re-authenticate after reconnection
      socket.emit("authenticate", user.id);
      socket.emit("join-user-room", user.id);
    });

    // Handle new notifications
    socket.on("new-notification", (notification: Notification) => {
      console.log("Received new notification:", notification);

      // Only add to local state - don't fetch from server
      // This prevents duplicate data and improves performance
      addNotification({
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        read: notification.read,
        readAt: notification.readAt,
      });
    });

    // Handle unread count updates
    socket.on("unread-count-update", (count: number) => {
      console.log("Unread count updated:", count);
      // This could be used to update the unread count directly
      // For now, we'll rely on the polling mechanism
    });

    // Handle connection errors
    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    // Handle authentication errors
    socket.on("auth_error", (error) => {
      console.error("Socket authentication error:", error);
    });
  }, [user?.id, addNotification]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Connect when user changes
  useEffect(() => {
    if (user?.id) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [user?.id, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const value: SocketContextType = {
    isConnected: socketRef.current?.connected || false,
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
