// File: api-gateway/index.js
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { createProxyMiddleware } = require("http-proxy-middleware");
require("dotenv").config();

const app = express();

// 1) CORS pour ton frontend
app.use(cors({ origin: "http://localhost:5173", credentials: true }));

// 2) Proxy AUTH en tout premier, sans pathRewrite
app.use(
  "/auth",
  createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL || "http://localhost:4000",
    changeOrigin: true,
    // Quand Express fournit "/google", on le transforme en "/auth/google"
    pathRewrite: { "^/": "/auth/" },
    cookieDomainRewrite: "localhost",
    onProxyRes(proxyRes, req, res) {
      const cookies = proxyRes.headers["set-cookie"];
      if (cookies) {
        const newCookies = cookies.map(c => c.replace(/;\s*secure/gi, ""));
        res.setHeader("set-cookie", newCookies);
      }
    },
  })
);

// 3) Parser JSON (pour les autres routes REST)
app.use(express.json());

// 4) Middleware JWT (exempte /auth, OPTIONS, favicon, /ping-protected)
function authenticateToken(req, res, next) {
  if (
    req.method === "OPTIONS" ||
    req.path === "/favicon.ico" ||
    req.path.startsWith("/auth") 
    //req.path === "/ping-protected"
  ) {
    return next();
  }
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") && authHeader.slice(7);
  if (!token) {
    return res.status(401).json({ error: "Token manquant" });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Token invalide" });
  }
}

// 5) Route de test JWT
app.get("/ping-protected", authenticateToken, (req, res) => {
  res.json({ message: "OK", user: req.user });
});

// 6) Applique JWT sur le reste des routes
app.use(authenticateToken);

// 7) Proxies pour ton microservice de reco
const recoProxy = createProxyMiddleware({
  target: process.env.RECO_SERVICE_URL || "http://localhost:5000",
  changeOrigin: true,
});
app.use("/recommendations", recoProxy);
app.use("/like", recoProxy);
app.use("/skip", recoProxy);

// 8) Endpoint racine
app.get("/", (req, res) => res.send("✅ API Gateway is running"));

const port = process.env.PORT || 3000;
app.listen(port, () =>
  console.log(`🚀 API Gateway listening on port ${port}`)
);
