"use client";

import { resolveApiOrigin } from "@/lib/api";
import type { ChatRoom, ChatMessage } from "@/types/crm";

export type ChatMessagesPage = {
  messages: ChatMessage[];
  hasMore: boolean;
  nextBefore: string | null;
};

export function roomKey(room: ChatRoom) {
  return `${room.type}:${room.id}`;
}

export function messageRoomKey(message: ChatMessage) {
  const id =
    message.channelType === "DEPARTMENT"
      ? message.departmentId
      : message.channelType === "PROJECT"
        ? message.projectId
        : message.groupId;
  return `${message.channelType}:${id}`;
}

export function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function resolveAttachmentUrl(url?: string | null) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${resolveApiOrigin()}${url}`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function extractUrls(text: string) {
  return text.match(/https?:\/\/[^\s]+/g) ?? [];
}

export function getUrlLabel(url: string) {
  const n = url.toLowerCase();
  if (n.includes("drive.google.com/drive/folders/")) return "Open Drive folder";
  if (n.includes("drive.google.com/file/")) return "Open file";
  if (n.includes("docs.google.com/spreadsheets/")) return "Open Sheet";
  if (n.includes("meet.google.com")) return "Open Meet";
  if (n.includes("calendar.google.com")) return "Open Calendar";
  return "Open link";
}
