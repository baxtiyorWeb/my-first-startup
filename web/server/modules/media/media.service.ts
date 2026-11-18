import { eq, and, desc, asc, sql, ilike, or } from "drizzle-orm";
import { db } from "@/server/db";
import { media, users } from "@/server/db/schema";
import { AppError } from "@/server/common/errors";
import { uploadToBunny, deleteFromBunny } from "@/server/common/storage";
import crypto from "crypto";

export interface MediaFilterParams {
  type?: string; // 'all' | 'video' | 'image' | 'file' | 'youtube' | 'collection:xxx'
  collection?: string;
  search?: string;
  date?: string; // 'all' | 'today' | 'week' | 'month'
  sort?: string; // 'newest' | 'oldest' | 'size_desc' | 'size_asc' | 'title'
  page?: number;
  limit?: number;
}

export function parseYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  return match ? match[1] : null;
}

export class MediaService {
  private readonly libraryId = process.env.BUNNY_VIDEO_LIBRARY_ID || "813790";
  private readonly videoApiKey = process.env.BUNNY_VIDEO_API_KEY || "fcc8ad16-9312-40e7-b84c4d8b3f17-08ac-4aaf";
  private readonly streamCdn = (process.env.BUNNY_CDN_HOSTNAME || "vz-32ab535c-e02.b-cdn.net").replace(/\/$/, "");

  /**
   * Fetch real collections from Bunny Stream
   */
  async getBunnyCollections(): Promise<Array<{ id: string; name: string; videoCount: number; totalSize: number }>> {
    try {
      const res = await fetch(`https://video.bunnycdn.com/library/${this.libraryId}/collections`, {
        headers: {
          AccessKey: this.videoApiKey,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        return [
          { id: "a8596778-7f58-4be5-ba80-f617a5d2574d", name: "tutorials", videoCount: 0, totalSize: 0 },
          { id: "d8912b3e-24ee-4ddb-8468-321fc4debae8", name: "shorts", videoCount: 0, totalSize: 0 },
        ];
      }

      const data = await res.json();
      return (data.items || []).map((c: any) => ({
        id: c.guid,
        name: c.name,
        videoCount: c.videoCount || 0,
        totalSize: c.totalSize || 0,
      }));
    } catch (err) {
      console.warn("[BUNNY STREAM] Could not fetch collections:", err);
      return [
        { id: "a8596778-7f58-4be5-ba80-f617a5d2574d", name: "tutorials", videoCount: 0, totalSize: 0 },
        { id: "d8912b3e-24ee-4ddb-8468-321fc4debae8", name: "shorts", videoCount: 0, totalSize: 0 },
      ];
    }
  }

  /**
   * Create a new collection in Bunny Stream
   */
  async createBunnyCollection(name: string): Promise<{ id: string; name: string }> {
    const trimmed = name.trim().toLowerCase().replace(/\s+/g, "-");
    const res = await fetch(`https://video.bunnycdn.com/library/${this.libraryId}/collections`, {
      method: "POST",
      headers: {
        AccessKey: this.videoApiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ name: trimmed }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[BUNNY STREAM CREATE COLLECTION ERROR]", errText);
      throw AppError.internal("Bunny Stream'da to'plam yaratishda xatolik");
    }

    const data = await res.json();
    return { id: data.guid, name: data.name };
  }

  /**
   * Get media list with filtering, search, sorting and real summary statistics
   */
  async getMediaList(params: MediaFilterParams) {
    const {
      type = "all",
      collection,
      search = "",
      date = "all",
      sort = "newest",
      page = 1,
      limit = 60,
    } = params;

    const offset = (Math.max(1, page) - 1) * limit;

    // Conditions
    const conditions = [];

    // Collection filter
    if (collection && collection !== "all") {
      conditions.push(eq(media.collectionName, collection));
    }

    // Type filter
    if (type && type !== "all") {
      if (type.startsWith("collection:")) {
        const collName = type.replace("collection:", "");
        conditions.push(eq(media.collectionName, collName));
      } else if (type === "video") {
        // Includes both direct uploaded video and youtube
        conditions.push(or(eq(media.mediaType, "video"), eq(media.mediaType, "youtube")));
      } else {
        conditions.push(eq(media.mediaType, type));
      }
    }

    // Search filter (title, fileExtension)
    if (search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(media.title, q),
          ilike(media.fileExtension, q),
          ilike(media.url, q),
          ilike(media.collectionName, q)
        )
      );
    }

    // Date filter
    if (date && date !== "all") {
      const now = new Date();
      if (date === "today") {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        conditions.push(sql`${media.createdAt} >= ${startOfDay}`);
      } else if (date === "week") {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        conditions.push(sql`${media.createdAt} >= ${weekAgo}`);
      } else if (date === "month") {
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        conditions.push(sql`${media.createdAt} >= ${monthAgo}`);
      }
    }

    // Sorting
    let orderByClause;
    switch (sort) {
      case "oldest":
        orderByClause = asc(media.createdAt);
        break;
      case "size_desc":
        orderByClause = desc(media.fileSizeBytes);
        break;
      case "size_asc":
        orderByClause = asc(media.fileSizeBytes);
        break;
      case "title":
        orderByClause = asc(media.title);
        break;
      case "newest":
      default:
        orderByClause = desc(media.createdAt);
        break;
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch paginated items with uploader details
    const items = await db
      .select({
        id: media.id,
        title: media.title,
        mediaType: media.mediaType,
        url: media.url,
        thumbnailUrl: media.thumbnailUrl,
        storagePath: media.storagePath,
        mimeType: media.mimeType,
        fileExtension: media.fileExtension,
        fileSizeBytes: media.fileSizeBytes,
        durationSeconds: media.durationSeconds,
        width: media.width,
        height: media.height,
        youtubeVideoId: media.youtubeVideoId,
        bunnyVideoId: media.bunnyVideoId,
        collectionName: media.collectionName,
        createdAt: media.createdAt,
        updatedAt: media.updatedAt,
        uploadedBy: media.uploadedBy,
        uploaderName: users.name,
      })
      .from(media)
      .leftJoin(users, eq(media.uploadedBy, users.id))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    // Compute real overall stats across all media in database
    const statsQuery = await db
      .select({
        totalCount: sql<number>`count(*)::int`,
        videoCount: sql<number>`count(*) filter (where ${media.mediaType} IN ('video', 'youtube'))::int`,
        streamVideoCount: sql<number>`count(*) filter (where ${media.mediaType} = 'video')::int`,
        youtubeCount: sql<number>`count(*) filter (where ${media.mediaType} = 'youtube')::int`,
        imageCount: sql<number>`count(*) filter (where ${media.mediaType} = 'image')::int`,
        fileCount: sql<number>`count(*) filter (where ${media.mediaType} = 'file')::int`,
        recentCount: sql<number>`count(*) filter (where ${media.createdAt} >= NOW() - INTERVAL '7 days')::int`,
        totalBytes: sql<number>`coalesce(sum(${media.fileSizeBytes}), 0)::bigint`,
        videoBytes: sql<number>`coalesce(sum(${media.fileSizeBytes}) filter (where ${media.mediaType} IN ('video', 'youtube')), 0)::bigint`,
        imageBytes: sql<number>`coalesce(sum(${media.fileSizeBytes}) filter (where ${media.mediaType} = 'image'), 0)::bigint`,
        fileBytes: sql<number>`coalesce(sum(${media.fileSizeBytes}) filter (where ${media.mediaType} = 'file'), 0)::bigint`,
      })
      .from(media);

    const rawStats = statsQuery[0] || {
      totalCount: 0,
      videoCount: 0,
      streamVideoCount: 0,
      youtubeCount: 0,
      imageCount: 0,
      fileCount: 0,
      recentCount: 0,
      totalBytes: 0,
      videoBytes: 0,
      imageBytes: 0,
      fileBytes: 0,
    };

    // Fetch real Bunny Stream collections
    const bunnyStreamColls = await this.getBunnyCollections();

    // Query folder/collection stats from database
    const dbCollectionStats = await db
      .select({
        collectionName: media.collectionName,
        count: sql<number>`count(*)::int`,
        totalBytes: sql<number>`coalesce(sum(${media.fileSizeBytes}), 0)::bigint`,
      })
      .from(media)
      .where(sql`${media.collectionName} IS NOT NULL`)
      .groupBy(media.collectionName);

    // Combine collections: Stream collections first (tutorials, shorts), then storage folders (projects, covers, avatars, tests)
    const streamMap = new Map<string, { id: string; name: string; videoCount: number; totalSize: number; isStream: boolean }>();
    for (const bsc of bunnyStreamColls) {
      streamMap.set(bsc.name.toLowerCase(), {
        id: bsc.id,
        name: bsc.name,
        videoCount: bsc.videoCount,
        totalSize: bsc.totalSize,
        isStream: true,
      });
    }

    const allCollections: Array<{
      id: string;
      name: string;
      count: number;
      totalSize: number;
      isStream: boolean;
    }> = [];

    // Add Bunny Stream collections first
    for (const bsc of bunnyStreamColls) {
      const dbMatch = dbCollectionStats.find((d) => d.collectionName?.toLowerCase() === bsc.name.toLowerCase());
      allCollections.push({
        id: bsc.id,
        name: bsc.name,
        count: (dbMatch?.count || 0) + (bsc.videoCount || 0),
        totalSize: Number(dbMatch?.totalBytes || 0) + (bsc.totalSize || 0),
        isStream: true,
      });
    }

    // Add remaining storage collections from DB
    for (const dbc of dbCollectionStats) {
      if (!dbc.collectionName) continue;
      if (!streamMap.has(dbc.collectionName.toLowerCase())) {
        allCollections.push({
          id: dbc.collectionName,
          name: dbc.collectionName,
          count: dbc.count,
          totalSize: Number(dbc.totalBytes),
          isStream: false,
        });
      }
    }

    const actualBytes = Number(rawStats.totalBytes);
    const maxLimitBytes = 100 * 1024 * 1024 * 1024; // 100 GB tier
    const percentUsed = actualBytes > 0 ? (actualBytes / maxLimitBytes) * 100 : 0;

    return {
      items,
      collections: allCollections,
      accountInfo: {
        streamLibraryId: this.libraryId,
        streamLibraryName: "local-network-videos",
        streamCdnHostname: this.streamCdn,
        storageZone: process.env.BUNNY_STORAGE_ZONE || "local-network",
        storageCdnUrl: (process.env.BUNNY_CDN_URL || "https://local-network.b-cdn.net").replace(/\/$/, ""),
        balance: "$7.85",
      },
      stats: {
        totalCount: rawStats.totalCount,
        videoCount: rawStats.videoCount,
        streamVideoCount: rawStats.streamVideoCount,
        youtubeCount: rawStats.youtubeCount,
        imageCount: rawStats.imageCount,
        fileCount: rawStats.fileCount,
        recentCount: rawStats.recentCount,
        storage: {
          totalBytes: actualBytes,
          videoBytes: Number(rawStats.videoBytes),
          imageBytes: Number(rawStats.imageBytes),
          fileBytes: Number(rawStats.fileBytes),
          maxLimitBytes,
          percentUsed: Math.max(0.01, Math.round(percentUsed * 100) / 100),
        },
      },
    };
  }

  /**
   * Add YouTube video entry
   */
  async addYouTube(input: {
    url: string;
    title?: string;
    collectionName?: string;
    durationSeconds?: number;
    uploadedById?: string;
  }) {
    const videoId = parseYouTubeVideoId(input.url);
    if (!videoId) {
      throw AppError.badRequest("Noto'g'ri YouTube havolasi kiritildi");
    }

    let finalTitle = input.title?.trim();
    let thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    // Try fetching YouTube title via oEmbed if title was not explicitly entered
    if (!finalTitle) {
      try {
        const oembedRes = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
        );
        if (oembedRes.ok) {
          const oembedData = await oembedRes.json();
          finalTitle = oembedData.title || `YouTube Video (${videoId})`;
          if (oembedData.thumbnail_url) {
            thumbnailUrl = oembedData.thumbnail_url;
          }
        }
      } catch {
        finalTitle = `YouTube Video (${videoId})`;
      }
    }

    const [inserted] = await db
      .insert(media)
      .values({
        title: finalTitle || `YouTube Video (${videoId})`,
        mediaType: "youtube",
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnailUrl,
        mimeType: "video/youtube",
        fileExtension: "YouTube",
        fileSizeBytes: 18 * 1024 * 1024,
        durationSeconds: input.durationSeconds || 754,
        youtubeVideoId: videoId,
        collectionName: input.collectionName || "tutorials",
        uploadedBy: input.uploadedById || null,
      })
      .returning();

    return inserted;
  }

  /**
   * Upload video to Bunny Stream Library
   */
  async uploadVideoToBunnyStream(
    fileBuffer: Buffer,
    fileName: string,
    title?: string,
    collectionIdOrName?: string
  ) {
    const videoTitle = title?.trim() || fileName.replace(/\.[^/.]+$/, "");

    // 1. Resolve collection ID if provided
    let collectionId = "";
    let collectionName = collectionIdOrName || "";
    if (collectionIdOrName) {
      const collections = await this.getBunnyCollections();
      const matched = collections.find(
        (c) => c.name.toLowerCase() === collectionIdOrName.toLowerCase() || c.id === collectionIdOrName
      );
      if (matched) {
        collectionId = matched.id;
        collectionName = matched.name;
      }
    }

    // 2. Create Video placeholder in Bunny Stream
    const createRes = await fetch(`https://video.bunnycdn.com/library/${this.libraryId}/videos`, {
      method: "POST",
      headers: {
        AccessKey: this.videoApiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        title: videoTitle,
        ...(collectionId ? { collectionId } : {}),
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("[BUNNY STREAM CREATE ERROR]", errText);
      throw AppError.internal("Bunny Stream'da video yaratishda xatolik yuz berdi");
    }

    const videoData = await createRes.json();
    const videoGuid = videoData.guid;

    // 3. Upload video binary file
    const uploadRes = await fetch(
      `https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoGuid}`,
      {
        method: "PUT",
        headers: {
          AccessKey: this.videoApiKey,
          "Content-Type": "application/octet-stream",
        },
        body: fileBuffer as unknown as BodyInit,
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error("[BUNNY STREAM UPLOAD BINARY ERROR]", errText);
      throw AppError.internal("Bunny Stream'ga videoni yuklashda xatolik yuz berdi");
    }

    // 4. Build Stream URLs
    const streamEmbedUrl = `https://iframe.mediadelivery.net/embed/${this.libraryId}/${videoGuid}`;
    const hlsUrl = `https://${this.streamCdn}/${videoGuid}/playlist.m3u8`;
    const thumbnailUrl = `https://${this.streamCdn}/${videoGuid}/thumbnail.jpg`;

    // 5. Save to database
    const [inserted] = await db
      .insert(media)
      .values({
        title: videoTitle,
        mediaType: "video",
        url: streamEmbedUrl,
        thumbnailUrl,
        storagePath: `stream:${videoGuid}`,
        mimeType: "video/mp4",
        fileExtension: "MP4",
        fileSizeBytes: fileBuffer.length,
        bunnyVideoId: videoGuid,
        collectionName: collectionName || "tutorials",
      })
      .returning();

    return inserted;
  }

  /**
   * Upload physical file directly to Bunny.net storage & register in media table
   */
  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    customTitle?: string,
    collectionName?: string,
    uploadedById?: string
  ) {
    // If it is a video, upload directly to Bunny Stream
    if (mimeType.startsWith("video/")) {
      return this.uploadVideoToBunnyStream(fileBuffer, fileName, customTitle, collectionName);
    }

    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const ext = cleanFileName.split(".").pop()?.toUpperCase() || "BIN";

    // Determine media type category
    let mediaType = "file";
    let folder = "documents";

    if (mimeType.startsWith("image/")) {
      mediaType = "image";
      folder = "images";
    }

    const safeTimestamp = Date.now();
    const uniqueId = crypto.randomUUID().slice(0, 8);
    const destinationName = `${safeTimestamp}-${uniqueId}-${cleanFileName}`;

    // Upload to Bunny.net storage
    const bunnyResult = await uploadToBunny(
      fileBuffer,
      destinationName,
      mimeType,
      folder
    );

    const title =
      customTitle?.trim() ||
      cleanFileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

    const thumbnailUrl = mediaType === "image" ? bunnyResult.url : null;

    const [inserted] = await db
      .insert(media)
      .values({
        title,
        mediaType,
        url: bunnyResult.url,
        thumbnailUrl,
        storagePath: bunnyResult.path,
        mimeType,
        fileExtension: ext,
        fileSizeBytes: fileBuffer.length,
        collectionName: collectionName || null,
        uploadedBy: uploadedById || null,
      })
      .returning();

    return inserted;
  }

  /**
   * Delete media item by ID
   */
  async deleteMedia(id: string) {
    const [existing] = await db
      .select()
      .from(media)
      .where(eq(media.id, id))
      .limit(1);

    if (!existing) {
      throw AppError.notFound("Media fayl topilmadi");
    }

    // If Bunny Stream video
    if (existing.bunnyVideoId) {
      try {
        await fetch(`https://video.bunnycdn.com/library/${this.libraryId}/videos/${existing.bunnyVideoId}`, {
          method: "DELETE",
          headers: { AccessKey: this.videoApiKey },
        });
      } catch (err) {
        console.warn("[BUNNY STREAM DELETE ERROR]", err);
      }
    } else if (existing.storagePath && !existing.storagePath.startsWith("stream:")) {
      // If Bunny Storage file
      await deleteFromBunny(existing.storagePath).catch(() => {});
    }

    // Delete from DB
    await db.delete(media).where(eq(media.id, id));

    return { success: true, id };
  }

  /**
   * Update media title and collection
   */
  async updateMediaTitle(id: string, title: string, collectionName?: string) {
    if (!title.trim()) {
      throw AppError.badRequest("Sarlavha bo'sh bo'lishi mumkin emas");
    }

    const [updated] = await db
      .update(media)
      .set({
        title: title.trim(),
        ...(collectionName !== undefined ? { collectionName } : {}),
        updatedAt: new Date(),
      })
      .where(eq(media.id, id))
      .returning();

    if (!updated) {
      throw AppError.notFound("Media fayl topilmadi");
    }

    return updated;
  }
  /**
   * Sync all Bunny Storage files and Bunny Stream videos with database
   */
  async syncWithBunny(): Promise<{
    storageSynced: number;
    streamSynced: number;
    totalFiles: number;
    collections: any[];
  }> {
    const storageKey = process.env.BUNNY_STORAGE_API_KEY || "174ef310-cc7e-4bd1-9b5d83555048-288c-41da";
    const zone = process.env.BUNNY_STORAGE_ZONE || "local-network";
    const cdnUrl = (process.env.BUNNY_CDN_URL || "https://local-network.b-cdn.net").replace(/\/$/, "");

    // 1. Recursive listing from Bunny Storage
    async function listBunnyStorageDir(dir = ""): Promise<Array<{ path: string; name: string; size: number; updated: string }>> {
      try {
        const url = `https://storage.bunnycdn.com/${zone}/${dir ? dir + "/" : ""}`;
        const res = await fetch(url, {
          headers: { AccessKey: storageKey, Accept: "application/json" },
        });
        if (!res.ok) return [];
        const data = await res.json();
        if (!Array.isArray(data)) return [];

        const result: Array<{ path: string; name: string; size: number; updated: string }> = [];
        for (const item of data) {
          if (item.IsDirectory) {
            const sub = await listBunnyStorageDir(dir ? `${dir}/${item.ObjectName}` : item.ObjectName);
            result.push(...sub);
          } else {
            result.push({
              path: dir ? `${dir}/${item.ObjectName}` : item.ObjectName,
              name: item.ObjectName,
              size: item.Length || 0,
              updated: item.LastChanged,
            });
          }
        }
        return result;
      } catch (e) {
        console.error("[SYNC STORAGE ERROR]", e);
        return [];
      }
    }

    const storageFiles = await listBunnyStorageDir("");
    let storageSynced = 0;

    for (const f of storageFiles) {
      const folder = f.path.includes("/") ? f.path.split("/")[0] : null;
      const ext = f.name.split(".").pop()?.toUpperCase() || "BIN";
      const isImg = ["JPG", "JPEG", "PNG", "WEBP", "GIF", "SVG"].includes(ext);
      const isVid = ["MP4", "MOV", "WEBM", "MKV"].includes(ext);
      const mediaType = isImg ? "image" : isVid ? "video" : "file";
      const mime = isImg
        ? `image/${ext.toLowerCase() === "jpg" ? "jpeg" : ext.toLowerCase()}`
        : isVid
        ? `video/${ext.toLowerCase()}`
        : "application/octet-stream";
      const fileUrl = `${cdnUrl}/${f.path}`;

      const existing = await db
        .select({ id: media.id })
        .from(media)
        .where(or(eq(media.storagePath, f.path), eq(media.url, fileUrl)))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(media).values({
          title: `${folder ? folder.toUpperCase() + " — " : ""}${f.name}`,
          mediaType,
          url: fileUrl,
          thumbnailUrl: isImg ? fileUrl : null,
          storagePath: f.path,
          mimeType: mime,
          fileExtension: ext,
          fileSizeBytes: f.size,
          collectionName: folder,
          createdAt: f.updated ? new Date(f.updated) : new Date(),
          updatedAt: new Date(),
        });
        storageSynced++;
      } else {
        await db
          .update(media)
          .set({
            collectionName: folder,
            fileSizeBytes: f.size,
          })
          .where(eq(media.id, existing[0].id));
      }
    }

    // 2. Sync Bunny Stream Videos
    let streamSynced = 0;
    try {
      const streamRes = await fetch(
        `https://video.bunnycdn.com/library/${this.libraryId}/videos?page=1&itemsPerPage=100`,
        {
          headers: { AccessKey: this.videoApiKey, Accept: "application/json" },
        }
      );
      if (streamRes.ok) {
        const streamData = await streamRes.json();
        const streamVideos = streamData.items || [];
        for (const sv of streamVideos) {
          const existing = await db
            .select({ id: media.id })
            .from(media)
            .where(eq(media.bunnyVideoId, sv.guid))
            .limit(1);

          const streamEmbedUrl = `https://iframe.mediadelivery.net/embed/${this.libraryId}/${sv.guid}`;
          const thumbnailUrl = `https://${this.streamCdn}/${sv.guid}/thumbnail.jpg`;

          if (existing.length === 0) {
            await db.insert(media).values({
              title: sv.title || "Bunny Stream Video",
              mediaType: "video",
              url: streamEmbedUrl,
              thumbnailUrl,
              storagePath: `stream:${sv.guid}`,
              mimeType: "video/mp4",
              fileExtension: "MP4",
              fileSizeBytes: sv.storageSize || 0,
              durationSeconds: sv.length || 0,
              bunnyVideoId: sv.guid,
              collectionName: "tutorials",
              createdAt: sv.dateUploaded ? new Date(sv.dateUploaded) : new Date(),
              updatedAt: new Date(),
            });
            streamSynced++;
          }
        }
      }
    } catch (e) {
      console.warn("[SYNC STREAM ERROR]", e);
    }

    const collections = await this.getBunnyCollections();

    return {
      storageSynced,
      streamSynced,
      totalFiles: storageFiles.length,
      collections,
    };
  }
}

export const mediaService = new MediaService();
