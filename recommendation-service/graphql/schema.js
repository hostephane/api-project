import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  type Movie {
    id: ID!
    title: String!
    overview: String
    poster: String
  }

  type Query {
    popularMovies(page: Int = 1): [Movie!]!
  }
`;
