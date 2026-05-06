"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { apiDelete, apiGet, apiPost, apiPostForm } from "@/lib/api";
import { normalizeErrorMessage } from "@/lib/error-message";
import { roomKey, messageRoomKey } from "@/components/chat/chat-utils";
import type { ChatAttachmentUploadResponse, ChatMessage, ChatRoom, CRMUser } from "@/types/crm";

type ChatMessagesPage = {
  messages: ChatMessage[];
  hasMore: boolean;
  nextBefore: string | null;
};

export function useChatMessages(
  selectedRoom: ChatRoom | null,
  user: CRMUser | null,
  onError: (msg: string) => void,
) {
  const { socket } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [nextBeforeCursor, setNextBeforeCursor] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function load() {
      if (!selectedRoom) {
        setMessages([]);
        setReplyTo(null);
        setHasMoreMessages(false);
        setNextBeforeCursor(null);
        return;
      }
      try {
        setMessagesLoading(true);
        const params = new URLSearchParams({ type: selectedRoom.type, id: selectedRoom.id });
        params.set("limit", "40");
        const data = await apiGet<ChatMessagesPage>(`/chat/messages?${params.toString()}`);
        setMessages(data.messages);
        setHasMoreMessages(data.hasMore);
        setNextBeforeCursor(data.nextBefore);
        await apiPost<{ success: boolean }>("/chat/read", {
          channelType: selectedRoom.type,
          channelId: selectedRoom.id,
        });
      } catch (err) {
        setMessages([]);
        onError(normalizeErrorMessage(err, "Failed to load messages"));
      } finally {
        setMessagesLoading(false);
      }
    }
    void load();
  }, [selectedRoom?.id, selectedRoom?.type]);

  useEffect(() => {
    if (!socket || !selectedRoom) return;
    const handleNew = (msg: ChatMessage) => {
      if (messageRoomKey(msg) !== roomKey(selectedRoom)) return;
      setMessages((c) => (c.some((x) => x.id === msg.id) ? c : [...c, msg]));
    };
    const handleUpdate = (msg: ChatMessage) => {
      if (messageRoomKey(msg) !== roomKey(selectedRoom)) return;
      setMessages((c) => c.map((x) => (x.id === msg.id ? msg : x)));
      setReplyTo((c) => (c?.id === msg.id ? msg : c));
    };
    socket.on("chat:message", handleNew);
    socket.on("chat:message:update", handleUpdate);
    return () => {
      socket.off("chat:message", handleNew);
      socket.off("chat:message:update", handleUpdate);
    };
  }, [socket, selectedRoom]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, selectedRoom?.id]);

  useEffect(() => {
    const handler = () => setOpenMenuId(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  const filteredMessages = useMemo(() => {
    if (!deferredSearch.trim()) return messages;
    const q = deferredSearch.toLowerCase();
    return messages.filter(
      (m) =>
        m.content.toLowerCase().includes(q) ||
        m.author.name.toLowerCase().includes(q) ||
        (m.attachmentFileName || "").toLowerCase().includes(q),
    );
  }, [messages, deferredSearch]);

  const loadOlderMessages = async () => {
    if (!selectedRoom || !nextBeforeCursor || loadingOlderMessages) return;
    try {
      setLoadingOlderMessages(true);
      const params = new URLSearchParams({
        type: selectedRoom.type,
        id: selectedRoom.id,
        limit: "40",
        before: nextBeforeCursor,
      });
      const data = await apiGet<ChatMessagesPage>(`/chat/messages?${params.toString()}`);
      setMessages((c) => [...data.messages, ...c]);
      setHasMoreMessages(data.hasMore);
      setNextBeforeCursor(data.nextBefore);
    } catch (err) {
      onError(normalizeErrorMessage(err, "Failed to load older messages"));
    } finally {
      setLoadingOlderMessages(false);
    }
  };

  const sendMessage = async (draft: string, clearDraft: () => void) => {
    if (!selectedRoom || (!draft.trim() && !selectedFile)) return;
    try {
      setSending(true);
      let attachment: ChatAttachmentUploadResponse | null = null;
      if (selectedFile) {
        const fd = new FormData();
        fd.append("file", selectedFile);
        fd.append("channelType", selectedRoom.type);
        fd.append("channelId", selectedRoom.id);
        attachment = await apiPostForm<ChatAttachmentUploadResponse>("/chat/attachments", fd);
      }
      const msg = await apiPost<ChatMessage>("/chat/messages", {
        channelType: selectedRoom.type,
        channelId: selectedRoom.id,
        content: draft,
        messageType: attachment?.messageType ?? "TEXT",
        attachmentUrl: attachment?.attachmentUrl ?? null,
        attachmentMimeType: attachment?.attachmentMimeType ?? null,
        attachmentFileName: attachment?.attachmentFileName ?? null,
        replyToId: replyTo?.id ?? null,
      });
      setMessages((c) => (c.some((x) => x.id === msg.id) ? c : [...c, msg]));
      clearDraft();
      setSelectedFile(null);
      setReplyTo(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      onError(normalizeErrorMessage(err, "Failed to send message"));
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (messageId: string, mode: "me" | "everyone") => {
    try {
      await apiDelete<{ success: boolean }>(`/chat/messages/${messageId}?mode=${mode}`);
      if (mode === "me") {
        setMessages((c) => c.filter((x) => x.id !== messageId));
        setReplyTo((c) => (c?.id === messageId ? null : c));
        return;
      }
      const deleted = {
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        content: "This message was deleted",
        messageType: "TEXT" as const,
        attachmentUrl: null,
        attachmentMimeType: null,
        attachmentFileName: null,
      };
      setMessages((c) => c.map((x) => (x.id === messageId ? { ...x, ...deleted } : x)));
      setReplyTo((c) => (c?.id === messageId ? null : c));
    } catch (err) {
      onError(normalizeErrorMessage(err, "Failed to delete message"));
    }
  };

  return {
    messages,
    filteredMessages,
    messagesLoading,
    loadingOlderMessages,
    hasMoreMessages,
    sending,
    selectedFile,
    replyTo,
    search,
    openMenuId,
    messageEndRef,
    fileInputRef,
    setSearch,
    setSelectedFile,
    setReplyTo,
    setOpenMenuId,
    setMessages,
    loadOlderMessages,
    sendMessage,
    deleteMessage,
  };
}
