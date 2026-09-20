const http = require("http");
const path = require("path");
const { Store } = require("./data/store");
const { handleAuthRoutes } = require("./controllers/authController");
const { handleVolunteerRoutes } = require("./controllers/volunteerController");
const { handleNonprofitRoutes } = require("./controllers/nonprofitController");
const { sendJson, sendError } = require("./lib/http");
const { serveStatic } = require("./lib/static");
const { getUserForRequest } = require("./services/authService");

const PORT = Number(process.env.PORT || 4173);
const store = new Store(path.join(__dirname, "data", "database.json"));
const publicRoot = path.join(__dirname, "..", "frontend");

store.load();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (!url.pathname.startsWith("/api/")) {
      await serveStatic(req, res, publicRoot, url.pathname);
      return;
    }

    const segments = url.pathname.split("/").filter(Boolean);

    if (segments[1] === "auth") {
      await handleAuthRoutes(req, res, { store, segments });
      return;
    }

    const user = getUserForRequest(store, req);
    if (!user) {
      sendJson(res, 401, { error: "Authentication required." });
      return;
    }

    if (segments[1] === "volunteer") {
      await handleVolunteerRoutes(req, res, { store, user, segments });
      return;
    }

    if (segments[1] === "nonprofit") {
      await handleNonprofitRoutes(req, res, { store, user, segments });
      return;
    }

    sendJson(res, 404, { error: "API route not found." });
  } catch (error) {
    sendError(res, error);
  }
});

server.listen(PORT, () => {
  console.log(`MicroMatch running at http://localhost:${PORT}`);
});
