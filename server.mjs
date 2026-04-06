import http from "node:http";
import { createReadStream } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readProfiles } from "./lib/profiles.mjs";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 3000);

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".m4v", "video/x-m4v"],
  [".mov", "video/quicktime"],
  [".mp4", "video/mp4"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webm", "video/webm"],
  [".webp", "image/webp"],
]);

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

const streamableExtensions = new Set([".mp4", ".mov", ".m4v", ".webm"]);

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return mimeTypes.get(extension) || "application/octet-stream";
}

function getCacheControl(filePath) {
  const relativePath = path.relative(rootDir, filePath).replaceAll(path.sep, "/");
  const extension = path.extname(filePath).toLowerCase();

  if (relativePath.startsWith("site-assets/")) {
    return "public, max-age=86400, stale-while-revalidate=604800";
  }

  if (extension === ".js" || extension === ".css") {
    return "public, max-age=300, stale-while-revalidate=86400";
  }

  if (extension === ".html") {
    return "no-cache";
  }

  return "public, max-age=300";
}

function isFresh(request, stats) {
  const ifModifiedSince = request.headers["if-modified-since"];

  if (!ifModifiedSince || Array.isArray(ifModifiedSince)) {
    return false;
  }

  const parsedDate = Date.parse(ifModifiedSince);

  if (!Number.isFinite(parsedDate)) {
    return false;
  }

  return stats.mtimeMs <= parsedDate + 1000;
}

function parseRangeHeader(rangeHeader, size) {
  if (!rangeHeader) {
    return null;
  }

  const matchedRange = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());

  if (!matchedRange) {
    return "invalid";
  }

  const [, rawStart, rawEnd] = matchedRange;

  if (!rawStart && !rawEnd) {
    return "invalid";
  }

  if (!rawStart) {
    const suffixLength = Number(rawEnd);

    if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
      return "invalid";
    }

    const start = Math.max(size - suffixLength, 0);
    return { start, end: size - 1 };
  }

  const start = Number(rawStart);
  const end = rawEnd ? Number(rawEnd) : size - 1;

  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= size) {
    return "invalid";
  }

  return { start, end: Math.min(end, size - 1) };
}

async function sendFile(request, response, filePath, method) {
  const extension = path.extname(filePath).toLowerCase();
  const stats = await fs.stat(filePath);
  const headers = {
    "cache-control": getCacheControl(filePath),
    "content-length": stats.size,
    "content-type": getContentType(filePath),
    "last-modified": stats.mtime.toUTCString(),
  };

  if (streamableExtensions.has(extension)) {
    headers["accept-ranges"] = "bytes";
  }

  if (!request.headers.range && isFresh(request, stats)) {
    response.writeHead(304, {
      "cache-control": headers["cache-control"],
      "last-modified": headers["last-modified"],
    });
    response.end();
    return;
  }

  if (streamableExtensions.has(extension) && typeof request.headers.range === "string") {
    const range = parseRangeHeader(request.headers.range, stats.size);

    if (range === "invalid") {
      response.writeHead(416, {
        "accept-ranges": "bytes",
        "content-range": `bytes */${stats.size}`,
      });
      response.end();
      return;
    }

    if (range) {
      const rangeHeaders = {
        ...headers,
        "content-length": range.end - range.start + 1,
        "content-range": `bytes ${range.start}-${range.end}/${stats.size}`,
      };

      response.writeHead(206, rangeHeaders);

      if (method === "HEAD") {
        response.end();
        return;
      }

      createReadStream(filePath, { start: range.start, end: range.end }).pipe(response);
      return;
    }
  }

  response.writeHead(200, headers);

  if (method === "HEAD") {
    response.end();
    return;
  }

  createReadStream(filePath).pipe(response);
}

async function resolveFilePath(requestPath) {
  const pathname = requestPath === "/" ? "/index.html" : decodeURIComponent(requestPath);
  const resolvedPath = path.resolve(rootDir, `.${pathname}`);

  if (!resolvedPath.startsWith(rootDir)) {
    return null;
  }

  try {
    const stats = await fs.stat(resolvedPath);

    if (stats.isDirectory()) {
      const indexPath = path.join(resolvedPath, "index.html");
      await fs.access(indexPath);
      return indexPath;
    }

    return resolvedPath;
  } catch {
    return null;
  }
}

const server = http.createServer(async (request, response) => {
  const method = request.method || "GET";

  if (method !== "GET" && method !== "HEAD") {
    response.writeHead(405, { "content-type": "text/plain; charset=utf-8" });
    response.end("Method Not Allowed");
    return;
  }

  const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

  if (requestUrl.pathname === "/api/profiles") {
    try {
      const profiles = await readProfiles(rootDir);
      sendJson(response, 200, { profiles });
    } catch (error) {
      sendJson(response, 500, {
        error: "Неуспешно зареждане на профилите.",
        details: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  const filePath = await resolveFilePath(requestUrl.pathname);

  if (!filePath) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not Found");
    return;
  }

  await sendFile(request, response, filePath, method);
});

server.listen(port, host, () => {
  console.log(`Guru site running at http://${host}:${port}`);
});
