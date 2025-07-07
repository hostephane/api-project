import { useState, useEffect } from "react";
import { useSwipeable } from "react-swipeable";
import './App.css';
import ExternalMovies from './components/ExternalMovies';
import SecurePing    from './components/SecurePing';
import GraphQLMovies from './components/GraphQLMovies';

function LoginButton() {
  return (
    <a href="http://localhost:3000/auth/google">
      <button>Se connecter avec Google</button>
    </a>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [jwtToken, setJwtToken] = useState(null);
  const [originalRecs, setOriginalRecs] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swipeClass, setSwipeClass] = useState("");
  const [liked, setLiked] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3000/profile", { credentials: "include" })
      .then(res => {
        if (!res.ok) throw new Error("Non authentifié");
        return res.json();
      })
      .then(data => setUser(data.user))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch("http://localhost:3000/token", { credentials: "include" })
      .then(res => {
        if (!res.ok) throw new Error("Non authentifié");
        return res.json();
      })
      .then(data => setJwtToken(data.token))
      .catch(() => setJwtToken(null));
  }, [user]);

  const fetchRecommendations = () => {
    setLoading(true);
    fetch("http://localhost:3000/recommendations", {
      headers: { Authorization: `Bearer ${jwtToken}` }
    })
      .then(res => {
        if (!res.ok) throw new Error("Erreur fetch recommandations");
        return res.json();
      })
      .then(data => {
        setOriginalRecs(data.recommendations);
        setRecommendations(data.recommendations);
        setCurrentIndex(0);
        setLiked([]);
        setLoading(false);
      })
      .catch(() => {
        setRecommendations([]);
        setLoading(false);
      });
  };

  useEffect(() => {
  if (user && jwtToken) {
    console.log('JWT envoyé :', jwtToken);    // ← log du token
    fetchRecommendations();
  } else {
    setRecommendations([]);
    setLoading(false);
  }
}, [user, jwtToken]);

  const goNext = (updatedLiked = liked) => {
    setSwipeClass("");
    if (currentIndex < recommendations.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (updatedLiked.length > 0) {
      setRecommendations(updatedLiked);
      setCurrentIndex(0);
      setLiked([]);
    } else {
      alert("Tu n'as aimé aucun film.");
    }
  };

  const handleLike = () => {
    const currentMovie = recommendations[currentIndex];
    setSwipeClass("swipe-right");
    setTimeout(() => {
      setLiked(prev => {
        if (!prev.some(m => m._id === currentMovie._id)) {
          const newLiked = [...prev, currentMovie];
          goNext(newLiked);
          return newLiked;
        }
        goNext(prev);
        return prev;
      });
    }, 300);
  };

  const handleSkip = () => {
    setSwipeClass("swipe-left");
    setTimeout(() => goNext(), 300);
  };

  const handlers = useSwipeable({
    onSwipedLeft: handleSkip,
    onSwipedRight: handleLike,
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  });

  const handleLogout = () => {
    fetch("http://localhost:3000/logout", { credentials: "include" })
      .then(() => {
        setUser(null);
        setJwtToken(null);
        setRecommendations([]);
        setCurrentIndex(0);
        setLiked([]);
        setLoading(false);
      });
  };

  if (recommendations.length === 1) {
    const winning = recommendations[0];
    return (
      <div>
        <h1>🏆 Film gagnant !</h1>
        <h2>{winning.title}</h2>
        <button onClick={fetchRecommendations}>Recommencer</button>
        <button onClick={handleLogout}>Se déconnecter</button>
      </div>
    );
  }

  if (!user) return (
    <div>
      <h1>Bienvenue sur MovieRecommender</h1>
      <LoginButton />
      <p>Connectez-vous pour recevoir des recommandations.</p>
    </div>
  );

  if (loading) return <p>Chargement...</p>;

  if (recommendations.length === 0) return (
    <div>
      <button onClick={handleLogout}>Se déconnecter</button>
      <h2>Aucune recommandation.</h2>
      <p>Connecté en tant que : {user.displayName}</p>
    </div>
  );

  const current = recommendations[currentIndex];

  return (
    <div {...handlers}>
      <button onClick={handleLogout}>Se déconnecter</button>
      <div className={`card ${swipeClass}`}>
        <h1>🎬 Découvre un film</h1>
        <h2>{current.title}</h2>
        <p><i>{current.genre}</i></p>
        <div className="buttons">
          <button className="skip" onClick={handleSkip}>👎 Passer</button>
          <button className="like" onClick={handleLike}>👍 J’aime</button>
        </div>
        <p>Film {currentIndex+1}/{recommendations.length}</p>
      </div>
      <hr />
      <h3>Films aimés :</h3>
      <ul>{liked.map((m,i)=><li key={i}>{m.title}</li>)}</ul>
      <hr />
      <ExternalMovies />
      <hr />
      <SecurePing />
      <hr />
      <GraphQLMovies />
    </div>
  );
}
