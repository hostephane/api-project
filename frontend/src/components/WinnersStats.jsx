import React, { useEffect, useState } from "react";

export default function WinnersStats() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5000/winners/stats")
      .then((res) => {
        if (!res.ok) throw new Error("Erreur réseau");
        return res.json();
      })
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Chargement des statistiques...</p>;
  if (error) return <p>Erreur : {error}</p>;

  return (
    <div>
      <h2>Top 5 Films Gagnants</h2>
      <table border="1" cellPadding="5" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Film ID</th>
            <th>Nombre de victoires</th>
            <th>Dernière victoire</th>
          </tr>
        </thead>
        <tbody>
          {stats.map(({ film_id, count, last_win }) => (
            <tr key={film_id}>
              <td>{film_id}</td>
              <td>{count}</td>
              <td>{new Date(last_win).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
