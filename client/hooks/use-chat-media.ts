"use client";

import { useState } from "react";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { normalizeErrorMessage } from "@/lib/error-message";
import type { ChatMediaTypeFilter, ChatMessage, ChatRoom } from "@/types/crm";

type DeletedMedia = {
  isDeleted: true;
  deletedAt: string;
  content: string;
  messageType: "TEXT";
  attachmentUrl: null;
  attachmentMimeType: null;
  attachmentFileName: null;
};

const DELETED_MEDIA: DeletedMedia = {
  isDeleted: true,
  deletedAt: new Date().toISOString(),
  content: "This media was deleted",
  messageType: "TEXT",
  attachmentUrl: null,
  attachmentMimeType: null,
  attachmentFileName: null,
};

export function useChatMedia(
  selectedRoom: ChatRoom | null,
  onError: (msg: string) => void,
  onUpdateMessages: (fn: (msgs: ChatMessage[]) => ChatMessage[]) => void,
) {
  const [showMediaPanel, setShowMediaPanel] = useState(false);
  const [mediaFilter, setMediaFilter] = useState<ChatMediaTypeFilter>("ALL");
  const [mediaItems, setMediaItems] = useState<ChatMessage[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaDeletingId, setMediaDeletingId] = useState<string | null>(null);
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [bulkDeletingMedia, setBulkDeletingMedia] = useState(false);

  const loadMedia = async (filter: ChatMediaTypeFilter) => {
    if (!selectedRoom) return;
    try {
      setMediaLoading(true);
      const params = new URLSearchParams({
        type: selectedRoom.type,
        id: selectedRoom.id,
        mediaType: filter,
      });
      const data = await apiGet<ChatMessage[]>(`/chat/media?${params.toString()}`);
      setMediaItems(data);
    } catch (err) {
      onError(normalizeErrorMessage(err, "Failed to load media"));
    } finally {
      setMediaLoading(false);
    }
  };

  const openMediaPanel = async () => {
    setShowMediaPanel(true);
    setSelectedMediaIds([]);
    await loadMedia(mediaFilter);
  };

  const changeMediaFilter = async (filter: ChatMediaTypeFilter) => {
    setMediaFilter(filter);
    await loadMedia(filter);
  };

  const deleteMedia = async (messageId: string) => {
    try {
      setMediaDeletingId(messageId);
      await apiDelete<{ success: boolean }>(`/chat/media/${messageId}`);
      setMediaItems((c) => c.filter((x) => x.id !== messageId));
      setSelectedMediaIds((c) => c.filter((id) => id !== messageId));
      onUpdateMessages((msgs) =>
        msgs.map((x) => (x.id === messageId ? { ...x, ...DELETED_MEDIA } : x)),
      );
    } catch (err) {
      onError(normalizeErrorMessage(err, "Failed to delete media"));
    } finally {
      setMediaDeletingId(null);
    }
  };

  const toggleMediaSelection = (messageId: string) => {
    setSelectedMediaIds((c) =>
      c.includes(messageId) ? c.filter((id) => id !== messageId) : [...c, messageId],
    );
  };

  const deleteSelectedMedia = async () => {
    if (!selectedMediaIds.length) return;
    try {
      setBulkDeletingMedia(true);
      const payload = await apiPost<{
        deletedCount: number;
        results: Array<{ id: string; success: boolean }>;
      }>("/chat/media/delete-bulk", { messageIds: selectedMediaIds });
      const deletedIds = payload.results.filter((x) => x.success).map((x) => x.id);
      if (!deletedIds.length) return;
      const deletedSet = new Set(deletedIds);
      setMediaItems((c) => c.filter((x) => !deletedSet.has(x.id)));
      setSelectedMediaIds((c) => c.filter((id) => !deletedSet.has(id)));
      onUpdateMessages((msgs) =>
        msgs.map((x) => (deletedSet.has(x.id) ? { ...x, ...DELETED_MEDIA } : x)),
      );
    } catch (err) {
      onError(normalizeErrorMessage(err, "Failed to bulk delete media"));
    } finally {
      setBulkDeletingMedia(false);
    }
  };

  return {
    showMediaPanel,
    mediaFilter,
    mediaItems,
    mediaLoading,
    mediaDeletingId,
    selectedMediaIds,
    bulkDeletingMedia,
    setShowMediaPanel,
    openMediaPanel,
    changeMediaFilter,
    deleteMedia,
    toggleMediaSelection,
    deleteSelectedMedia,
  };
}
