import { extractBearerToken, verifyJwt } from "./auth";

type Env = {
  DB: D1Database;
  BUCKET: R2Bucket;
  JWT_SECRET: string;
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const url = new URL(request.url);
  const tokenFromHeader = extractBearerToken(
    request.headers.get("Authorization"),
  );
  const tokenFromQuery = url.searchParams.get("token");
  const token = tokenFromHeader || tokenFromQuery;

  if (!token || !env.JWT_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await verifyJwt(token, env.JWT_SECRET);
  if (!payload?.sub) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const username = payload.sub;
  const id = url.searchParams.get("id");

  if (!id) {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const row: any = await env.DB.prepare(
      `SELECT image_key
       FROM travel_logs
       WHERE id = ? AND username = ?
       LIMIT 1`,
    )
      .bind(id, username)
      .first();

    if (!row?.image_key) {
      return Response.json({ error: "Not Found" }, { status: 404 });
    }

    const obj = await env.BUCKET.get(row.image_key);
    if (!obj) {
      return Response.json({ error: "Not Found" }, { status: 404 });
    }

    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set("etag", obj.httpEtag);
    headers.set("Cache-Control", "private, max-age=86400");

    return new Response(obj.body, { headers });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
};
