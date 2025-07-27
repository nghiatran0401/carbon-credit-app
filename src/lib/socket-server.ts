import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { Notification } from "@/types";

export class SocketServer {
  private io: SocketIOServer;
  private userSockets: Map<number, string[]> = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NODE_ENV === "production" ? ["https://yourdomain.com"] : ["http://localhost:3000"],
        methods: ["GET", "POST"],
      },
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);

      // Handle user authentication
      socket.on("authenticate", (userId: number) => {
        this.authenticateUser(socket, userId);
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        this.handleDisconnect(socket);
      });

      // Handle join room for specific user
      socket.on("join-user-room", (userId: number) => {
        socket.join(`user-${userId}`);
        console.log(`User ${userId} joined their room`);
      });
    });
  }

  private authenticateUser(socket: any, userId: number) {
    // Store the socket connection for this user
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, []);
    }
    this.userSockets.get(userId)!.push(socket.id);

    // Join user-specific room
    socket.join(`user-${userId}`);

    console.log(`User ${userId} authenticated with socket ${socket.id}`);
  }

  private handleDisconnect(socket: any) {
    console.log("Client disconnected:", socket.id);

    // Remove socket from user mappings
    for (const [userId, sockets] of this.userSockets.entries()) {
      const index = sockets.indexOf(socket.id);
      if (index > -1) {
        sockets.splice(index, 1);
        if (sockets.length === 0) {
          this.userSockets.delete(userId);
        }
        break;
      }
    }
  }

  // Send notification to specific user
  public sendNotificationToUser(userId: number, notification: Notification) {
    this.io.to(`user-${userId}`).emit("new-notification", notification);
    console.log(`Notification sent to user ${userId}:`, notification.title);
  }

  // Send notification to all users
  public broadcastNotification(notification: Notification) {
    this.io.emit("new-notification", notification);
    console.log("Notification broadcasted to all users:", notification.title);
  }

  // Send unread count update to specific user
  public sendUnreadCountUpdate(userId: number, count: number) {
    this.io.to(`user-${userId}`).emit("unread-count-update", count);
  }

  // Get connected users count
  public getConnectedUsersCount(): number {
    return this.io.engine.clientsCount;
  }

  // Get specific user's connected sockets
  public getUserSockets(userId: number): string[] {
    return this.userSockets.get(userId) || [];
  }
}

// Global instance
let socketServer: SocketServer | null = null;

export function initializeSocketServer(server: HTTPServer): SocketServer {
  if (!socketServer) {
    socketServer = new SocketServer(server);
  }
  return socketServer;
}

export function getSocketServer(): SocketServer | null {
  return socketServer;
}
