import http from "node:http";
import { createReadStream } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readProfiles } from "./lib/profiles.mjs";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
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
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
]);

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function sendFile(response, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes.get(extension) || "application/octet-stream";

  response.writeHead(200, { "content-type": contentType });
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

  if (method === "HEAD") {
    const extension = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes.get(extension) || "application/octet-stream";
    response.writeHead(200, { "content-type": contentType });
    response.end();
    return;
  }

  sendFile(response, filePath);
});

server.listen(port, () => {
  console.log(`Guru site running at http://localhost:${port}`);
});
