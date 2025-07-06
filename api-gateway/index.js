// File: api-gateway/index.js
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { createProxyMiddleware } = require("http-proxy-middleware");
require("dotenv").config();
const app = express();

// CORS + JSON
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// Middleware JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  if (!token) return res.status(401).json({ error: "Token manquant" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Token invalide" });
  }
}

// Route de test protégée
app.get("/ping-protected", authenticateToken, (req, res) => {
  res.json({ message: "OK", user: req.user });
});

// Applique JWT à tout le reste
app.use(authenticateToken);

// —— tes proxies ——

// Proxy vers auth-service
app.use(
  "/auth",
  createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL || "http://localhost:4000",
    changeOrigin: true,
    pathRewrite: { "^/auth": "/auth" },
  })
);

// Proxy vers recommendation-service
app.use(
  "/recommendations",
  createProxyMiddleware({
    target: process.env.RECO_SERVICE_URL || "http://localhost:5000",
    changeOrigin: true,
    pathRewrite: { "^/recommendations": "/recommendations" },
  })
);

// Proxy like
app.use(
  "/like",
  createProxyMiddleware({
    target: process.env.RECO_SERVICE_URL || "http://localhost:5000",
    changeOrigin: true,
    pathRewrite: { "^/like": "/like" },
  })
);

// Proxy skip
app.use(
  "/skip",
  createProxyMiddleware({
    target: process.env.RECO_SERVICE_URL || "http://localhost:5000",
    changeOrigin: true,
    pathRewrite: { "^/skip": "/skip" },
  })
);

// Root public
app.get("/", (req, res) => res.send("✅ API Gateway is running"));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 API Gateway listening on port ${port}`));
