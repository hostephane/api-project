// recommendation-service/graphql/resolvers.js
const { fetchPopularMovies } = require('../routes/tmdbClient');

module.exports = {
  Query: {
    popularMovies: async (_parent, args) => {
      // args.page est un Int
      return await fetchPopularMovies(args.page);
    }
  }
};
