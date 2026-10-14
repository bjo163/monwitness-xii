export const MAX_JSON_BODY_BYTES = 262_144;

export async function readJsonBody(request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json(?:\s*;|\s*$)/i.test(contentType)) {
    return { ok: false, status: 415, message: "Content-Type must be application/json" };
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_JSON_BODY_BYTES) return { ok: false, status: 413, message: "Request body too large" };

  const reader = request.body?.getReader();
  if (!reader) return { ok: false, status: 400, message: "Invalid JSON" };

  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_JSON_BODY_BYTES) {
        await reader.cancel();
        return { ok: false, status: 413, message: "Request body too large" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400, message: "Invalid JSON" };
  }

  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { ok: true, value: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) };
  } catch {
    return { ok: false, status: 400, message: "Invalid JSON" };
  }
}
