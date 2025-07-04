# 🎬 CineMatch – App de recommandations de films

App fullstack en microservices JS (React + Node.js + MongoDB) avec authentification Google.

## 🔧 Services & Ports

| Service               | Port     |
|-----------------------|----------|
| Frontend React        | `5173`   |
| Auth Service          | `4000`   |
| Recommendation Service| `5000`   |
| API Gateway           | `3000`   |
| MongoDB (si Docker)   | `27017`  |

## 🚀 Lancer en local

1. **MongoDB** : local ou `docker run -d -p 27017:27017 mongo`
2. Cloner le repo et créer un `.env` dans chaque dossier (`auth-service`, `recommendation-service`, `api-gateway`, `frontend`) avec les bonnes variables (`PORT`, `MONGODB_URI`, `JWT_SECRET`, etc.)
3. Lancer chaque service :
   ```bash
   # Exemple pour auth-service
   cd auth-service
   npm install
   node index.js
