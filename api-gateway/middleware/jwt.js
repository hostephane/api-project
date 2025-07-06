// api-gateway/middleware/jwt.js
const jwt = require('jsonwebtoken');

module.exports = function jwtMiddleware(req, res, next) {
  // Récupère l'en-tête Authorization
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    // Pas de token : accès refusé
    return res.status(401).json({ error: 'Token manquant' });
  }

  try {
    // Vérifie et décode le token
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;  // stocke le payload pour les routes suivantes
    next();
  } catch (err) {
    console.error('[JWT] Vérification échouée :', err.message);
    // Token invalide ou expiré
    return res.status(401).json({ error: 'Token invalide' });
  }
};
