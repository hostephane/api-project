import { ApolloClient, InMemoryCache, gql } from '@apollo/client';

export const client = new ApolloClient({
  uri: 'http://localhost:5000/graphql',
  cache: new InMemoryCache()
});

export const GET_POPULAR = gql`
  query GetPopular($page: Int!) {
    popularMovies(page: $page) {
      id
      title
      poster
    }
  }
`;
