import { Hono } from "hono";
import { Bindings } from "../state";
import { adminAuthMiddleware } from "./authorization";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export const uploadRoutes = new Hono<{ Bindings: Bindings }>();

uploadRoutes.post("/image", adminAuthMiddleware, async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string") {
    return c.json({ error: "No se proporcionó ningún archivo" }, 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    return c.json({ error: "El archivo excede el límite de 5MB" }, 400);
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return c.json({ error: "Tipo de archivo no permitido. Solo se aceptan imágenes (JPEG, PNG, GIF, WEBP)" }, 400);
  }

  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  const ext = file.name.split(".").pop() || "jpg";
  const uniqueName = `${crypto.randomUUID()}.${ext}`;
  const key = `images/${uniqueName}`;

  const r = await c.env.BUCKET.put(key, uint8Array, {
    httpMetadata: {
      contentType: file.type,
    },
  });

  const url = `${c.env.ASSETS_URL}/${key}`;

  return c.json({ url });
});
