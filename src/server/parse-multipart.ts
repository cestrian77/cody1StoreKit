import type { IncomingMessage } from "node:http";
import Busboy from "busboy";

export interface ParsedScreenshotUpload {
  buffer: Buffer;
  originalName?: string;
  screenId?: string;
}

export function parseScreenshotUpload(
  req: IncomingMessage,
): Promise<ParsedScreenshotUpload> {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: req.headers,
      limits: { files: 1, fileSize: 25 * 1024 * 1024 },
    });

    let fileBuffer: Buffer | undefined;
    let originalName: string | undefined;
    let screenId: string | undefined;
    let fileReceived = false;

    busboy.on("field", (name, value) => {
      if (name === "screenId" && value.trim()) {
        screenId = value.trim();
      }
    });

    busboy.on("file", (_name, file, info) => {
      fileReceived = true;
      originalName = info.filename;
      const chunks: Buffer[] = [];
      file.on("data", (chunk: Buffer) => chunks.push(chunk));
      file.on("limit", () => {
        reject(new Error("Screenshot exceeds 25 MB limit"));
      });
      file.on("end", () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    busboy.on("error", reject);
    busboy.on("finish", () => {
      if (!fileReceived || !fileBuffer?.length) {
        reject(new Error("No screenshot file in upload"));
        return;
      }
      resolve({ buffer: fileBuffer, originalName, screenId });
    });

    req.pipe(busboy);
  });
}
