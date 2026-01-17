"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Bell, ExternalLink, AlertCircle, RefreshCw } from "lucide-react";
import { useNotifications } from "./notification-context";
import { Notification } from "@/types";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function NotificationBell() {
  const { notifications, unreadCount, isLoading, error, markAsRead, markAllAsRead, fetchNotifications, clearError } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread" | "order" | "credit" | "payment" | "system">("all");
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  const handleNotificationClick = useCallback(
    async (notification: Notification) => {
      if (!notification.read) {
        await markAsRead(notification.id);
      }
    },
    [markAsRead]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    setIsMarkingAllRead(true);
    try {
      await markAllAsRead();
    } finally {
      setIsMarkingAllRead(false);
    }
  }, [markAllAsRead]);

  const handleRefresh = useCallback(async () => {
    clearError();
    await fetchNotifications(true);
  }, [clearError, fetchNotifications]);

  const getNotificationIcon = useCallback((type: string) => {
    switch (type) {
      case "order":
        return "📦";
      case "credit":
        return "🌳";
      case "payment":
        return "💳";
      case "system":
        return "🔔";
      default:
        return "📢";
    }
  }, []);

  const formatTimeAgo = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }, []);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      if (filter === "all") return true;
      if (filter === "unread") return !notification.read;
      return notification.type === filter;
    });
  }, [notifications, filter]);

  const hasNotifications = notifications.length > 0;
  const hasFilteredNotifications = filteredNotifications.length > 0;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative p-2 text-gray-600 hover:text-green-600 hover:bg-gray-100" aria-label={`Notifications (${unreadCount} unread)`}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-green-600 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center font-medium">{unreadCount > 99 ? "99+" : unreadCount}</span>}
          {isLoading && <RefreshCw className="absolute -bottom-1 -right-1 h-3 w-3 text-green-600 animate-spin" />}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-80 max-h-96 overflow-y-auto bg-white border border-gray-200 shadow-lg z-[10001]" sideOffset={8}>
        <div className="flex items-center justify-between p-3 border-b">
          <div>
            <h4 className="font-semibold text-gray-900">Notifications</h4>
            <p className="text-sm text-gray-500">{isLoading ? "Loading..." : `${unreadCount} unread`}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="text-xs border rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-green-500" disabled={isLoading}>
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="order">Orders</option>
              <option value="credit">Credits</option>
              <option value="payment">Payments</option>
              <option value="system">System</option>
            </select>
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isLoading} className="h-8 w-8 p-0" aria-label="Refresh notifications">
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border-b border-red-200">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {!hasNotifications ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No notifications yet</p>
            <p className="text-sm">We&apos;ll notify you when something important happens</p>
          </div>
        ) : !hasFilteredNotifications ? (
          <div className="p-8 text-center text-gray-500">
            <p className="font-medium">No {filter} notifications</p>
            <p className="text-sm">Try changing the filter or check back later</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-2 bg-gray-50 border-b">
              <span className="text-xs text-gray-600">
                {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? "s" : ""}
              </span>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} disabled={isMarkingAllRead} className="h-6 px-2 text-xs">
                  {isMarkingAllRead ? "Marking..." : "Mark all read"}
                </Button>
              )}
            </div>

            <div className="space-y-0">
              {filteredNotifications.slice(0, 20).map((notification) => (
                <div
                  key={notification.id}
                  className={cn("p-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0", !notification.read && "bg-blue-50 hover:bg-blue-100")}
                  onClick={() => handleNotificationClick(notification)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleNotificationClick(notification);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-lg flex-shrink-0">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="font-medium text-sm leading-tight text-gray-900">{notification.title}</h5>
                        {!notification.read && <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />}
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">{formatTimeAgo(notification.createdAt)}</span>
                        {notification.data?.orderId && <ExternalLink className="h-3 w-3 text-gray-400" />}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredNotifications.length > 20 && <div className="p-3 text-center text-sm text-gray-500 border-t">Showing 20 of {filteredNotifications.length} notifications</div>}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
