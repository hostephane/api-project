import { useState } from 'react';
import { ApolloProvider, useQuery } from '@apollo/client';
import { client, GET_POPULAR } from '../api/graphql';

function Inner() {
  const [page, setPage] = useState(1);
  const { data, loading, error } = useQuery(GET_POPULAR, { variables: { page } });

  if (loading) return <p>Chargement…</p>;
  if (error) return <p>Erreur : {error.message}</p>;

  return (
    <section>
      <h2>GraphQL (page {page})</h2>
      <button onClick={() => setPage(p => Math.max(p - 1, 1))}>Précédent</button>
      <button onClick={() => setPage(p => p + 1)}>Suivant</button>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {data.popularMovies.map(m => (
          <div key={m.id} style={{ width: 120 }}>
            <img src={m.poster} alt={m.title} width={120} />
            <p>{m.title}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function GraphQLMovies() {
  return (
    <ApolloProvider client={client}>
      <Inner />
    </ApolloProvider>
  );
}
