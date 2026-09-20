function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function sendError(res, error) {
  const status = error.statusCode || error.status || 500;
  const message = status === 500 ? "Internal server error." : error.message;
  sendJson(res, status, { error: message });
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw httpError(400, "Request body must be valid JSON.");
  }
}

function requireMethod(req, method) {
  if (req.method !== method) {
    throw httpError(405, `Use ${method} for this route.`);
  }
}

module.exports = {
  httpError,
  readJson,
  requireMethod,
  sendError,
  sendJson
};
