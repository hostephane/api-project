import { useEffect, useState } from 'react';
import { fetchExternalMovies } from '../api/external';

export default function ExternalMovies() {
  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchExternalMovies(page).then(setMovies).catch(console.error);
  }, [page]);

  return (
    <section>
      <h2>Films externes (page {page})</h2>
      <button onClick={() => setPage(p => Math.max(p - 1, 1))}>Précédent</button>
      <button onClick={() => setPage(p => p + 1)}>Suivant</button>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {movies.map(m => (
          <div key={m.id} style={{ width: 120 }}>
            <img src={m.poster} alt={m.title} width={120} />
            <p>{m.title}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
