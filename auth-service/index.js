require("dotenv").config();

const express = require("express");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const session = require("express-session");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

// --- Connexion MongoDB ---
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connecté"))
  .catch((err) => console.error("❌ Erreur MongoDB:", err));

// --- Modèle User ---
const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  displayName: String,
  email: String,
});
const User = mongoose.model("User", userSchema);

// --- Middleware et config ---
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// --- Passport Google OAuth2 ---
passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/callback",
}, async (accessToken, refreshToken, profile, done) => {
  try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          user = await User.create({
            googleId: profile.id,
            displayName: profile.displayName,
            email: profile.emails[0].value,
          });
        }
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);
  
;

      

passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// --- Routes ---

// Login Google
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Callback Google OAuth
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/failure" }),
  (req, res) => {
    const user = req.user;
    const token = jwt.sign(
      {
        id: user.googleId,
        displayName: user.displayName,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("jwt", token, {
      httpOnly: true,
      secure: false, // true si HTTPS
      sameSite: "lax",
    });

    res.redirect("http://localhost:5173");
  }
);

app.get("/auth/failure", (req, res) => {
  res.status(401).send("Échec de l'authentification");
});

app.get("/profile", async (req, res) => {
  // Récupérer token dans cookie OU header Authorization (Bearer token)
  const token = req.cookies.jwt || (req.headers.authorization && req.headers.authorization.split(" ")[1]);
  if (!token) return res.status(401).json({ error: "Non authentifié" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ googleId: payload.id }).select("-_id displayName email googleId");
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });
    res.json({ user });
  } catch (e) {
    res.status(401).json({ error: "Token invalide" });
  }
});




// Récupérer token JWT
app.get("/token", (req, res) => {
  const token = req.cookies.jwt;
  if (!token) return res.status(401).json({ error: "Non authentifié" });

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    res.json({ token });
  } catch (e) {
    res.status(403).json({ error: "Token invalide" });
  }
});

// Logout : supprimer cookie JWT + déconnexion passport
app.get("/logout", (req, res) => {
  res.clearCookie("jwt", { httpOnly: true, sameSite: "lax" });
  req.logout(() => {
    res.json({ message: "Déconnecté avec succès" });
  });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`🔐 Auth Service lancé sur le port ${port}`);
});
