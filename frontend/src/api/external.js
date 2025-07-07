export async function fetchExternalMovies(page = 1) {
  const res = await fetch(`http://localhost:5000/external/popular?page=${page}`);
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
  const { movies } = await res.json();
  return movies;
}
