const fs = require("fs");
const path = require("path");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

async function serveStatic(req, res, publicRoot, pathname) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    res.end();
    return;
  }

  const requested = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(publicRoot, requested));

  if (!filePath.startsWith(publicRoot)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  const exists = fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  const finalPath = exists ? filePath : path.join(publicRoot, "index.html");
  const extension = path.extname(finalPath);
  const contentType = contentTypes[extension] || "application/octet-stream";
  const body = fs.readFileSync(finalPath);

  res.writeHead(200, {
    "Content-Type": contentType,
    "Content-Length": body.length
  });
  if (req.method === "HEAD") {
    res.end();
  } else {
    res.end(body);
  }
}

module.exports = { serveStatic };
