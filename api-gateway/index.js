const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { createProxyMiddleware } = require("http-proxy-middleware");
require("dotenv").config();

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());

// Middleware pour vérifier JWT (sauf pour les routes publiques)
function authenticateToken(req, res, next) {
  // Routes publiques (ex : /auth/google, /auth/google/callback)
  if (
    req.path.startsWith("/auth/google") ||
    req.path.startsWith("/auth/google/callback") ||
    req.path === "/" 
  ) {
    return next();
  }

  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token manquant" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Token invalide" });
  }
}

app.use(authenticateToken);

// Proxy vers auth-service
app.use(
  "/auth",
  createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL || "http://localhost:4000",
    changeOrigin: true,
    pathRewrite: { "^/auth": "/auth" },
    onProxyReq(proxyReq, req, res) {
      // On peut transférer des headers spécifiques si besoin
    },
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
app.use(
  "/like",
  createProxyMiddleware({
    target: process.env.RECO_SERVICE_URL || "http://localhost:5000",
    changeOrigin: true,
    pathRewrite: { "^/like": "/like" },
  })
);
app.use(
  "/skip",
  createProxyMiddleware({
    target: process.env.RECO_SERVICE_URL || "http://localhost:5000",
    changeOrigin: true,
    pathRewrite: { "^/skip": "/skip" },
  })
);

// Endpoint racine
app.get("/", (req, res) => {
  res.send("✅ API Gateway is running");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 API Gateway listening on port ${port}`);
});
