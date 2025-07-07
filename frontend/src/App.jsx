import { useState, useEffect } from "react";
import { useSwipeable } from "react-swipeable";
import './App.css';
import WinnersStats from "./components/WinnersStats";

function LoginButton() {
  return (
    <a href="http://localhost:4000/auth/google">
      <button>Se connecter avec Google</button>
    </a>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [jwtToken, setJwtToken] = useState(null);
  const [originalRecs, setOriginalRecs] = useState([]); // Liste initiale des films
  const [recommendations, setRecommendations] = useState([]); // Liste courante affichée
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swipeClass, setSwipeClass] = useState("");
  const [liked, setLiked] = useState([]);

  // Récupérer l'utilisateur connecté
  useEffect(() => {
    fetch("http://localhost:4000/profile", { credentials: "include" })
      .then(res => {
        if (!res.ok) throw new Error("Non authentifié");
        return res.json();  
      })
      .then(data => setUser(data.user))
      .catch(() => setUser(null));
  }, []);

  // Récupérer le token après login
  useEffect(() => {
    if (!user) return;

    fetch("http://localhost:4000/token", { credentials: "include" })
      .then(res => {
        if (!res.ok) throw new Error("Non authentifié");
        return res.json();
      })
      .then(data => {
        console.log("Token récupéré depuis /token:", data.token);
        setJwtToken(data.token);
      })
      .catch(() => setJwtToken(null));
  }, [user]);

  // Récupérer recommandations du backend
  const fetchRecommendations = () => {
    setLoading(true);
    fetch("http://localhost:5000/recommendations", {
      credentials: "include",
      headers: { Authorization: `Bearer ${jwtToken}` },
    })
      .then(res => {
        if (!res.ok) throw new Error("Erreur fetch recommandations");
        return res.json();
      })
      .then(data => {
        console.log("Recommandations reçues :", data.recommendations.map(f => f.title));
        setOriginalRecs(data.recommendations);
        setRecommendations(data.recommendations);
        setCurrentIndex(0);
        setLiked([]);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setRecommendations([]);
        setLoading(false);
      });
  };

  // Appel initial quand user + token prêts
  useEffect(() => {
    if (user && jwtToken) {
      fetchRecommendations();
    } else {
      setRecommendations([]);
      setLoading(false);
    }
  }, [user, jwtToken]);

  // Avancer à l'élément suivant
  const goNext = (likedNow = liked) => {
  setSwipeClass("");
  console.log("goNext appelé");
  console.log("currentIndex =", currentIndex);
  console.log("recommendations.length =", recommendations.length);
  console.log("liked.length =", likedNow.length);

  if (currentIndex < recommendations.length - 1) {
    setCurrentIndex(currentIndex + 1);
  } else {
    if (likedNow.length > 0) {
      console.log("Passage à la nouvelle liste de films aimés :", likedNow.map(f => f.title));
      setRecommendations(likedNow);
      setCurrentIndex(0);
      setLiked([]); // reset liked pour recommencer
    } else {
      alert("Tu n'as aimé aucun film.");
    }
  }
};

// gestion like
const handleLike = () => {
  if (!recommendations[currentIndex]) return;

  const currentMovie = recommendations[currentIndex];
  console.log("handleLike appelé sur :", currentMovie.title);

  setSwipeClass("swipe-right");

  // Enregistrer le "winner" dans la base PostgreSQL via ton API backend
  fetch("http://localhost:5000/winners", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtToken}`, // Assure-toi que jwtToken est défini dans le scope
    },
    body: JSON.stringify({
      userId: user.id,      // adapte selon ta structure d’objet user (ex: user.sub)
      filmId: currentMovie._id,
    }),
  })
    .then(res => res.json())
    .then(data => {
      console.log("Winner enregistré:", data);
    })
    .catch(err => {
      console.error("Erreur enregistrement winner:", err);
    });

  setTimeout(() => {
    setLiked((prev) => {
      const isAlreadyLiked = prev.some(m => m._id === currentMovie._id);
      let updatedLiked = prev;
      if (!isAlreadyLiked) {
        updatedLiked = [...prev, currentMovie];
        console.log("Ajout au liked:", currentMovie.title);
      } else {
        console.log("Film déjà dans liked :", currentMovie.title);
      }
      console.log("liked:", updatedLiked.map(m => m.title));
      goNext(updatedLiked); // 👈 on passe la version à jour ici
      return updatedLiked;
    });
  }, 300);
};



  // Gestion Skip
  const handleSkip = () => {
    if (!recommendations[currentIndex]) return;

    setSwipeClass("swipe-left");
    setTimeout(() => {
      goNext();
    }, 300);
  };

  const handlers = useSwipeable({
    onSwipedLeft: () => handleSkip(),
    onSwipedRight: () => handleLike(),
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  });

  // Logout
  const handleLogout = () => {
    fetch("http://localhost:4000/logout", {
      method: "GET",
      credentials: "include",
    })
      .then(() => {
        setUser(null);
        setJwtToken(null);
        setRecommendations([]);
        setCurrentIndex(0);
        setLiked([]);
        setLoading(false);
        setOriginalRecs([]);
      })
      .catch((e) => console.error("Erreur logout:", e));
  };

  // Écran gagnant si une seule recommandation
  if (recommendations.length === 1) {
    const winningMovie = recommendations[0];
    return (
      <div>
        <h1>🏆 Film gagnant !</h1>
        <h2>{winningMovie.title}</h2>
        <p><i>{winningMovie.genre}</i></p>
        <button onClick={() => fetchRecommendations()}>
          Recommencer
        </button>
        <button onClick={handleLogout} style={{ marginTop: "1rem" }}>
          Se déconnecter
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        <h1>Bienvenue sur MovieRecommender</h1>
        <LoginButton />
        <p>Connectez-vous pour recevoir des recommandations personnalisées.</p>
      </div>
    );
  }

  if (loading) return <p>Chargement...</p>;

  if (!recommendations || recommendations.length === 0) {
    return (
      <div>
        <button onClick={handleLogout} style={{ marginBottom: "1rem" }}>
          Se déconnecter
        </button>
        <h2>Aucune recommandation.</h2>
        <p>Connecté en tant que : {user.displayName}</p>
      </div>
    );
  }

  const currentMovie = recommendations[currentIndex];

  return (
    <div {...handlers}>
      <button onClick={handleLogout} style={{ marginBottom: "1rem" }}>
        Se déconnecter
      </button>

      <div className={`card ${swipeClass}`}>
        <h1>🎬 Découvre un film</h1>
        <h2>{currentMovie.title}</h2>
        <p><i>{currentMovie.genre}</i></p>
        <div className="buttons">
          <button className="skip" onClick={handleSkip}>👎 Passer</button>
          <button className="like" onClick={handleLike}>👍 J’aime</button>
        </div>
        <p style={{ marginTop: "1rem" }}>
          Film {currentIndex + 1} / {recommendations.length}
        </p>
      </div>

      <hr />
      <h3>Films aimés :</h3>
      <ul>
        {liked.map((movie, i) => (
          <li key={i}>{movie.title} ({movie.genre})</li>
        ))}
      </ul>

      <WinnersStats />

      <p style={{ fontSize: "0.8rem", color: "#666" }}>
        Swipe à gauche pour passer, à droite pour aimer.
      </p>
      <p>Connecté en tant que : {user.displayName}</p>
    </div>
  );
}
