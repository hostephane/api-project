require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const { ApolloServer, gql } = require('apollo-server-express')

const externalRouter = require('./routes/external')
const { fetchPopularMovies } = require('./routes/tmdbClient')

// --- Schéma GraphQL (défini ici pour simplifier) ---
const typeDefs = gql`
  type Movie {
    id: ID!
    title: String!
    overview: String
    poster: String
  }

  type Query {
    popularMovies(page: Int = 1): [Movie!]!
  }
`

// --- Résolveurs GraphQL ---
const resolvers = {
  Query: {
    popularMovies: async (_, { page }) => {
      return await fetchPopularMovies(page)
    }
  }
}

const app = express()

// --- Middlewares globaux ---
app.use(cors()); // permet toutes origines en développement
// À la place de app.use(express.json()):
app.use((req, res, next) => {
  if (req.path.startsWith('/graphql')) {
    return next();
  }
  express.json()(req, res, next);
});


// --- Middleware JWT (une seule définition) ---
function authenticateToken(req, res, next) {
  // Autoriser les preflights CORS et toutes les requêtes GraphQL/public
  if (
    req.method === 'OPTIONS' ||
    req.path === '/' ||
    req.path === '/movies' ||
    req.path.startsWith('/external') ||
    req.path.startsWith('/graphql') ||
    req.path.startsWith('/auth/google')
  ) {
    return next()
  }
  // Récupération du token
  const authHeader = req.headers['authorization'] || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: 'Token manquant' })
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'Token invalide' })
  }
}

// --- Pagination publique TMDB ---
app.get('/movies', async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1
  try {
    const movies = await fetchPopularMovies(page)
    res.json({ movies })
  } catch (err) {
    console.error('[movies] erreur TMDB', err)
    res.status(502).json({ error: 'Erreur lors de la récupération des films' })
  }
})

// --- Démarrage ApolloServer ---
async function startGraphQL() {
  const server = new ApolloServer({ typeDefs, resolvers })
  await server.start()
  server.applyMiddleware({ app, path: '/graphql' })
}
startGraphQL()

// --- Routes REST externes ---
app.use('/external', externalRouter)

// --- Appliquer JWT sur les routes suivantes ---
app.use(authenticateToken)

// --- Schéma Mongoose et initFilms ---
const filmSchema = new mongoose.Schema({ title: String, genre: String })
const userPreferenceSchema = new mongoose.Schema({
  userId: String,
  filmStatuses: [
    {
      filmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Film' },
      status: { type: String, enum: ['liked','skipped'], default: 'none' },
      updatedAt: { type: Date, default: Date.now }
    }
  ]
})
const Film = mongoose.model('Film', filmSchema)
const UserPreference = mongoose.model('UserPreference', userPreferenceSchema)

async function initFilms() {
  if (await Film.countDocuments() === 0) {
    await Film.insertMany([
      { title: 'Inception', genre: 'Sci-Fi' },
      { title: 'Amélie', genre: 'Comédie dramatique' },
      { title: 'Parasite', genre: 'Thriller social' },
      { title: 'Your Name', genre: 'Animation / Romance' }
    ])
    console.log('🎬 Films initialisés')
  }
}

// --- Routes privées ---
app.get('/films', async (req, res) => {
  try {
    const films = await Film.find()
    res.json(films)
  } catch {
    res.status(500).json({ error: 'Erreur interne' })
  }
})

app.get('/recommendations', async (req, res) => {
  const userId = req.user.id
  try {
    let prefs = await UserPreference.findOne({ userId }).populate('filmStatuses.filmId')
    if (!prefs) prefs = await UserPreference.create({ userId, filmStatuses: [] })
    const all = await Film.find()
    const skipped = prefs.filmStatuses
      .filter(fs => fs.status === 'skipped')
      .map(fs => fs.filmId._id.toString())
    const recos = all.filter(f => !skipped.includes(f._id.toString()))
    res.json({ userId, recommendations: recos })
  } catch {
    res.status(500).json({ error: 'Erreur interne' })
  }
})

app.post('/like', async (req, res) => {
  const userId = req.user.id
  const { filmId } = req.body
  if (!filmId) return res.status(400).json({ error: 'filmId requis' })
  try {
    let prefs = await UserPreference.findOne({ userId })
    if (!prefs) prefs = new UserPreference({ userId, filmStatuses: [] })
    const exist = prefs.filmStatuses.find(fs => fs.filmId.toString() === filmId)
    if (exist) {
      exist.status = 'liked'; exist.updatedAt = new Date()
    } else {
      prefs.filmStatuses.push({ filmId, status: 'liked', updatedAt: new Date() })
    }
    await prefs.save()
    res.json({ message: 'Film liké', prefs })
  } catch {
    res.status(500).json({ error: 'Erreur interne' })
  }
})

app.post('/skip', async (req, res) => {
  const userId = req.user.id
  const { filmId } = req.body
  if (!filmId) return res.status(400).json({ error: 'filmId requis' })
  try {
    let prefs = await UserPreference.findOne({ userId })
    if (!prefs) prefs = new UserPreference({ userId, filmStatuses: [] })
    const exist = prefs.filmStatuses.find(fs => fs.filmId.toString() === filmId)
    if (exist) {
      exist.status = 'skipped'; exist.updatedAt = new Date()
    } else {
      prefs.filmStatuses.push({ filmId, status: 'skipped', updatedAt: new Date() })
    }
    await prefs.save()
    res.json({ message: 'Film passé', prefs })
  } catch {
    res.status(500).json({ error: 'Erreur interne' })
  }
})

// --- MongoDB + initFilms + lancement du serveur ---
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connecté')
    initFilms()
  })
  .catch(err => console.error('❌ Erreur MongoDB:', err))

const PORT = process.env.PORT || 5000
app.listen(PORT, '127.0.0.1', () => {
  console.log(`🎬 Recommendation Service running on 127.0.0.1:${PORT}`)
})
