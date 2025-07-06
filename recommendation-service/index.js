require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const externalRoutes = require('./routes/external');

const app = express();
console.log("✔️  index.js chargé !");

// Middleware global de logging
app.use((req, res, next) => {
  console.log(`>>> ${req.method} ${req.url}`);
  next();
});

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use('/external', externalRoutes);
app.use(express.json());





// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connecté dans recommendation-service"))
.catch((err) => console.error("❌ Erreur MongoDB:", err));





// Middleware d’authentification JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token manquant" });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;
    next();
  } catch (e) {
    return res.status(403).json({ error: "Token invalide" });
  }
}

// Modèles Mongoose
const filmSchema = new mongoose.Schema({
  title: String,
  genre: String,
});
const userPreferenceSchema = new mongoose.Schema({
  userId: String, // id Google
  filmStatuses: [
    {
      filmId: { type: mongoose.Schema.Types.ObjectId, ref: "Film" },
      status: { type: String, enum: ["liked", "skipped"], default: "none" },
      updatedAt: { type: Date, default: Date.now },
    }
  ],
});
const Film = mongoose.model("Film", filmSchema);
const UserPreference = mongoose.model("UserPreference", userPreferenceSchema);

// Initialisation films
async function initFilms() {
  const count = await Film.countDocuments();
  if (count === 0) {
    await Film.insertMany([
      { title: "Inception", genre: "Sci-Fi" },
      { title: "Amélie", genre: "Comédie dramatique" },
      { title: "Parasite", genre: "Thriller social" },
      { title: "Your Name", genre: "Animation / Romance" },
    ]);
    console.log("🎬 Films initialisés");
  }
}
mongoose.connection.once("open", () => {
  initFilms();
});

// ===== DEBUG ROUTE =====
// Liste brute des films en base
app.get('/films', async (req, res) => {
  
  try {
    const films = await Film.find();
    console.log(`🗂  ${films.length} films en base`);
    return res.json(films);
  } catch (err) {
    console.error('❌ Erreur dans /films :', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
});
// ========================
+console.log("🔍 DEBUG: route GET /films enregistrée");


app.get("/recommendations", authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    let prefs = await UserPreference.findOne({ userId }).populate("filmStatuses.filmId");
    if (!prefs) {
      prefs = await UserPreference.create({ userId, filmStatuses: [] });
    }

    const allFilms = await Film.find();

    // On récupère la liste des films "skipped"
    const skippedFilmIds = prefs.filmStatuses
      .filter(fs => fs.status === "skipped")
      .map(fs => fs.filmId._id.toString());

    // On filtre tous les films en excluant seulement les "skipped"
    const recommendations = allFilms.filter(
      (film) => !skippedFilmIds.includes(film._id.toString())
    );

    console.log(`🚀 Recommandations envoyées à l'user ${userId} (excluant ${skippedFilmIds.length} skipped) :`);
    recommendations.forEach(film => {
      console.log(`- ${film.title} (${film._id.toString()})`);
    });

    res.json({ userId, recommendations });
  } catch (err) {
    console.error("❌ Erreur dans /recommendations :", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});



// Helper pour mettre à jour le status d’un film pour un user
async function updateFilmStatus(userId, filmId, status) {
  let prefs = await UserPreference.findOne({ userId });
  if (!prefs) {
    prefs = new UserPreference({ userId, filmStatuses: [] });
  }

  const existing = prefs.filmStatuses.find((fs) => fs.filmId.toString() === filmId);

  if (existing) {
    existing.status = status;
    existing.updatedAt = new Date();
  } else {
    prefs.filmStatuses.push({ filmId, status, updatedAt: new Date() });
  }

  await prefs.save();
  return prefs;
}

// Like un film
app.post("/like", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { filmId } = req.body;
  if (!filmId) return res.status(400).json({ error: "filmId requis" });

  try {
    const prefs = await updateFilmStatus(userId, filmId, "liked");
    res.json({ message: "Film liké", prefs });
  } catch (err) {
    res.status(500).json({ error: "Erreur interne" });
  }
});

// Passer un film
app.post("/skip", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { filmId } = req.body;
  if (!filmId) return res.status(400).json({ error: "filmId requis" });

  try {
    const prefs = await updateFilmStatus(userId, filmId, "skipped");
    res.json({ message: "Film passé", prefs });
  } catch (err) {
    res.status(500).json({ error: "Erreur interne" });
  }
});

const port = process.env.PORT || 5001;
app.listen(port, () => {
  console.log("🎬 Recommendation Service on port", port);
});
