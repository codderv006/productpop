import { promises as fs } from "fs";
import path from "path";
import { get, put, BlobPreconditionFailedError } from "@vercel/blob";

// Storage: Vercel Blob (private store) in production, local files in dev.
// Every document is a small JSON file. Writes use ETags for optimistic concurrency.

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
const LOCAL_DIR = path.join(process.cwd(), ".data");

export interface Doc<T> {
  data: T;
  etag: string | null;
}

async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function readDoc<T>(key: string): Promise<Doc<T> | null> {
  if (useBlob) {
    try {
      const res = await get(key, { access: "private", useCache: false });
      if (!res || res.statusCode !== 200) return null;
      const buf = await streamToBuffer(res.stream);
      return { data: JSON.parse(buf.toString("utf8")) as T, etag: res.blob.etag };
    } catch (e: unknown) {
      if (e instanceof Error && /not.?found/i.test(e.name + e.message)) return null;
      throw e;
    }
  }
  try {
    const raw = await fs.readFile(path.join(LOCAL_DIR, key), "utf8");
    return { data: JSON.parse(raw) as T, etag: "local" };
  } catch {
    return null;
  }
}

export class ConflictError extends Error {}

export async function writeDoc<T>(key: string, data: T, etag?: string | null): Promise<void> {
  const body = JSON.stringify(data);
  if (useBlob) {
    try {
      await put(key, body, {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
        cacheControlMaxAge: 60,
        ...(etag ? { ifMatch: etag } : {}),
      });
    } catch (e) {
      if (e instanceof BlobPreconditionFailedError) throw new ConflictError("conflict");
      throw e;
    }
    return;
  }
  const file = path.join(LOCAL_DIR, key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, body);
}

/** Read-modify-write. Uses the ETag for optimistic concurrency; if the store keeps
 * rejecting a write while the document is unchanged (ETag format mismatch), fall back
 * to an unconditional write so saves never get stuck. */
export async function mutateDoc<T, R>(
  key: string,
  init: () => T,
  fn: (doc: T) => R | Promise<R>
): Promise<R> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const existing = await readDoc<T>(key);
    const data = existing ? existing.data : init();
    const result = await fn(data);
    const etag = existing?.etag && existing.etag !== "local" ? existing.etag : undefined;
    try {
      await writeDoc(key, data, etag);
      return result;
    } catch (e) {
      if (!(e instanceof ConflictError)) throw e;
      const now = await readDoc<T>(key);
      if (!now || now.etag === etag) {
        // Nothing changed underneath us: the precondition itself is unusable.
        await writeDoc(key, data, undefined);
        return result;
      }
      await new Promise((r) => setTimeout(r, 80 * (attempt + 1)));
    }
  }
  throw new Error("Could not save after several attempts, please retry.");
}

// ---- Media (user uploads: logos, screenshots, clips) ----

export async function putMedia(key: string, body: Buffer, contentType: string): Promise<void> {
  if (useBlob) {
    await put(key, body, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
    });
    return;
  }
  const file = path.join(LOCAL_DIR, key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, body);
  await fs.writeFile(file + ".type", contentType);
}

export async function getMedia(key: string): Promise<{ body: Buffer; contentType: string } | null> {
  if (useBlob) {
    try {
      const res = await get(key, { access: "private" });
      if (!res || res.statusCode !== 200) return null;
      return { body: await streamToBuffer(res.stream), contentType: res.blob.contentType };
    } catch {
      return null;
    }
  }
  try {
    const file = path.join(LOCAL_DIR, key);
    const body = await fs.readFile(file);
    const contentType = await fs.readFile(file + ".type", "utf8").catch(() => "application/octet-stream");
    return { body, contentType };
  } catch {
    return null;
  }
}
