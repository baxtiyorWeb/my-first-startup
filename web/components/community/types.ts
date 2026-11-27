export type CommunityAttachmentKind = "image" | "video" | "file";

export interface CommunityAttachment {
  url: string;
  kind: CommunityAttachmentKind;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

export interface CommunitySender {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  verified: boolean;
  role: string;
}

export interface CommunityReplyPreview {
  id: string;
  content: string;
  messageType: string;
  senderName: string | null;
  senderHandle: string | null;
  attachmentKind: CommunityAttachmentKind | null;
  isDeleted: boolean;
}

export interface CommunityReaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

export interface CommunityMessage {
  id: string;
  content: string;
  messageType: "text" | "image" | "video" | "file" | "system";
  attachments: CommunityAttachment[];
  clientMessageId: string | null;
  replyTo: CommunityReplyPreview | null;
  reactions: CommunityReaction[];
  sender: CommunitySender;
  isMine: boolean;
  canEdit: boolean;
  canDelete: boolean;
  editedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Client-only flags for optimistic messages. */
  pending?: boolean;
  failed?: boolean;
}

export interface CommunityOverview {
  community: {
    id: string;
    slug: string;
    name: string;
    description: string;
    isOfficial: boolean;
    verified: boolean;
    createdAt: string;
  };
  memberCount: number;
  onlineCount: number;
  unreadCount: number;
  isMuted: boolean;
  canModerate: boolean;
  rules: string[];
  mediaCounts: { image: number; video: number; file: number };
}

export interface CommunityMember {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  verified: boolean;
  role: string;
  isOnline: boolean;
  lastActiveAt: string | null;
}

export interface CommunityMediaItem {
  messageId: string;
  attachment: CommunityAttachment;
  senderName: string;
  createdAt: string;
}

export interface CommunityViewer {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string | null;
  verified?: boolean;
  role?: string;
}

export const COMMUNITY_REACTION_OPTIONS = [
  "❤️",
  "👍",
  "🔥",
  "😂",
  "🎉",
  "🙏",
  "😮",
  "😢",
  "👏",
  "💯",
] as const;

export const COMMUNITY_EMOJI_PICKER = [
  "😀",
  "😄",
  "😁",
  "🙂",
  "😉",
  "😍",
  "🤔",
  "😅",
  "😢",
  "😎",
  "🙌",
  "👍",
  "👏",
  "🙏",
  "🔥",
  "💯",
  "🎉",
  "❤️",
  "🚀",
  "✨",
  "💡",
  "📌",
  "✅",
  "❌",
  "📎",
  "💻",
  "📱",
  "📚",
] as const;
