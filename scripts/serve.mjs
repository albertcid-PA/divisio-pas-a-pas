import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const port = Number(process.env.PORT || 4173);
const root = new URL("../dist/", import.meta.url);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml"
};

createServer(async (request, response) => {
  try {
    const rawPath = new URL(request.url, "http://localhost").pathname;
    const pathname = rawPath === "/" ? "index.html" : rawPath.replace(/^\/+/, "");
    const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
    const file = new URL(safePath, root);
    const body = await readFile(file);
    response.writeHead(200, {
      "Content-Type": mime[extname(safePath)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("No s'ha trobat la pàgina.");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Divisió pas a pas: http://127.0.0.1:${port}`);
});
