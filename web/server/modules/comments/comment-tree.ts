/**
 * Pure comment-thread assembly.
 *
 * The discussion payload is a flat, chronological list of comments where each
 * reply points at its direct parent. Building the nested tree in a dependency
 * free module keeps the behaviour unit-testable without a database.
 */

export interface CommentAuthorResponse {
  id: string;
  name: string;
  handle: string;
  role: string;
  avatarUrl?: string | null;
  verified: boolean;
}

export interface CommentItemResponse {
  id: string;
  postId: string;
  parentId?: string | null;
  content: string;
  likesCount: number;
  isLiked: boolean;
  createdAt: string;
  author: CommentAuthorResponse;
  replies?: CommentItemResponse[];
}

export interface CommentTreeRow {
  id: string;
  postId: string;
  parentId: string | null;
  content: string;
  likesCount: number;
  createdAt: Date;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorRole: string;
  authorAvatarUrl: string | null;
  authorVerified: boolean;
  isLiked: boolean;
}

/**
 * Assembles flat comment rows into a nested tree.
 *
 * - Replies attach to their direct parent at any depth (reply-to-reply is kept,
 *   previously only first level replies survived).
 * - A reply whose parent is missing (parent deleted) is promoted to a root so
 *   the author's words are never silently dropped.
 * - Rows that end up unreachable (a pathological parent cycle) are promoted to
 *   flat roots rather than being lost or producing an infinite render loop.
 */
export function buildCommentTree(rows: CommentTreeRow[]): CommentItemResponse[] {
  if (rows.length === 0) return [];

  const items = new Map<string, CommentItemResponse>();
  for (const row of rows) {
    if (items.has(row.id)) continue;
    items.set(row.id, {
      id: row.id,
      postId: row.postId,
      parentId: row.parentId,
      content: row.content,
      likesCount: row.likesCount,
      isLiked: Boolean(row.isLiked),
      createdAt: row.createdAt.toISOString(),
      author: {
        id: row.authorId,
        name: row.authorName,
        handle: row.authorHandle,
        role: row.authorRole,
        avatarUrl: row.authorAvatarUrl,
        verified: row.authorVerified,
      },
      replies: [],
    });
  }

  const roots: CommentItemResponse[] = [];
  for (const row of rows) {
    const item = items.get(row.id);
    if (!item) continue;

    const parent =
      row.parentId && row.parentId !== row.id ? items.get(row.parentId) : undefined;

    if (parent) {
      parent.replies!.push(item);
    } else {
      // Root comment, or a reply whose parent is gone. Clearing the dangling
      // parent reference keeps the payload internally consistent for clients.
      item.parentId = null;
      roots.push(item);
    }
  }

  // Promote anything not reachable from a root (cyclic parent references).
  const reached = new Set<string>();
  const stack: CommentItemResponse[] = [...roots];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (reached.has(node.id)) continue;
    reached.add(node.id);
    if (node.replies && node.replies.length > 0) {
      stack.push(...node.replies);
    }
  }

  for (const [id, item] of items) {
    if (reached.has(id)) continue;
    item.replies = [];
    item.parentId = null;
    roots.push(item);
  }

  return roots;
}
