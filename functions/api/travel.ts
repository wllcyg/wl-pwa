import { extractBearerToken, verifyJwt } from "./auth";

type Env = {
  DB: D1Database;
  BUCKET: R2Bucket;
  JWT_SECRET: string;
  QWEATHER_TOKEN?: string;
  QWEATHER_API_HOST?: string;
};

const authUser = async (request: Request, env: Env) => {
  const token = extractBearerToken(request.headers.get("Authorization"));
  if (!token || !env.JWT_SECRET) return null;
  const payload = await verifyJwt(token, env.JWT_SECRET);
  return payload?.sub || null;
};

const extByMime = (mime: string) => {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
};

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

const parseOptionalNumber = (v: FormDataEntryValue | null): number | null => {
  if (typeof v !== "string" || !v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};


export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const username = await authUser(request, env);

  if (!username) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { results } = await env.DB.prepare(
      `SELECT id, note, image_key, place_name, lat, lng, created_at
       FROM travel_logs
       WHERE username = ?
       ORDER BY created_at DESC`,
    )
      .bind(username)
      .all();

    const mapped = (results || []).map((row: any) => ({
      id: row.id,
      note: row.note || "",
      placeName: row.place_name || "",
      lat: typeof row.lat === "number" ? row.lat : null,
      lng: typeof row.lng === "number" ? row.lng : null,
      imageUrl: row.image_key ? `/api/travel-image?id=${row.id}` : "",
      createdAt: row.created_at,
    }));

    return Response.json(mapped);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const username = await authUser(request, env);

  if (!username) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const rawNote = String(formData.get("note") || "").trim();
    const image = formData.get("image");
    const lat = parseOptionalNumber(formData.get("lat"));
    const lng = parseOptionalNumber(formData.get("lng"));

    const note = rawNote || (!(image instanceof File) ? "打卡" : "");

    const placeName = String(formData.get("placeName") || "").trim();

    let imageKey: string | null = null;

    if (image instanceof File) {
      if (!image.type.startsWith("image/")) {
        return Response.json({ error: "仅支持图片文件" }, { status: 400 });
      }

      if (image.size > 10 * 1024 * 1024) {
        return Response.json({ error: "图片不能超过 10MB" }, { status: 400 });
      }

      const safeUser = username.replace(/[^a-zA-Z0-9_-]/g, "_");
      const id = crypto.randomUUID();
      const ext = extByMime(image.type);
      imageKey = `travel/${safeUser}/${id}.${ext}`;

      await env.BUCKET.put(imageKey, await image.arrayBuffer(), {
        httpMetadata: {
          contentType: image.type,
        },
      });
    }

    const rowId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO travel_logs (id, username, note, image_key, place_name, lat, lng)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(rowId, username, note, imageKey, placeName, lat, lng)
      .run();

    return Response.json({
      id: rowId,
      note,
      placeName,
      lat,
      lng,
      imageUrl: imageKey ? `/api/travel-image?id=${rowId}` : "",
      createdAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
};
