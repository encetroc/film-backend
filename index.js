const { ApolloServer, gql } = require("apollo-server");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const typeDefs = gql`
  type Movie {
    id: String
    title: String
    shareholders: [Shareholder]
  }

  type Shareholder {
    id: String
    firstName: String
    lastName: String
    address: String
    IBAN: String
    movie: Movie
    movieId: String
  }

  type Transfer {
    id: String
    amount: Float
    description: String
    movie: Movie
    movieId: String
  }

  type ShareholderTransfer {
    id: String
    amount: Float
    movie: Movie
    movieId: String
    shareholder: Shareholder
    shareholderId: String
  }

  type Query {
    movies: [Movie]
    shareholders: [Shareholder]
    transfers: [Transfer]
    shareholderTransfers(id: String!): [ShareholderTransfer]
  }

  input CreateMovieInput {
    title: String!
  }

  input CreateShareholderInput {
    firstName: String!
    lastName: String!
    address: String!
    IBAN: String!
    movieId: String!
  }

  input CreateTransferInput {
    amount: Float!
    description: String!
    movieId: String!
  }

  type Mutation {
    createMovie(data: CreateMovieInput!): Movie
    createShareholder(data: CreateShareholderInput!): Shareholder
    createTransfer(data: CreateTransferInput!): Transfer
  }
`;

// Resolvers define the technique for fetching the types defined in the
// schema. This resolver retrieves books from the "books" array above.
const resolvers = {
  Query: {
    movies: async () => {
      return await prisma.movie.findMany({
        include: {
          shareholders: true,
          transfers: true,
        },
      });
    },
    shareholders: async () => {
      return await prisma.shareholder.findMany({
        include: {
          movie: true,
        },
      });
    },
    transfers: async () => {
      return await prisma.transfer.findMany({
        include: {
          movie: true,
        },
      });
    },
    shareholderTransfers: async (_, { id }, __) => {
      return await prisma.shareholderTransfer.findMany({
        where: { shareholderId: id },
        include: {
          shareholder: true,
          movie: true,
        },
      });
    },
  },
  Mutation: {
    createMovie: async (_, { data: { title } }) => {
      return await prisma.movie.create({
        data: {
          title,
        },
      });
    },
    createShareholder: async (
      _,
      { data: { firstName, lastName, address, IBAN, movieId } }
    ) => {
      return await prisma.shareholder.create({
        data: {
          firstName,
          lastName,
          address,
          IBAN,
          movieId,
        },
        include: {
          movie: true,
        },
      });
    },
    createTransfer: async (_, { data: { amount, description, movieId } }) => {
      const transfer = await prisma.transfer.create({
        data: {
          amount,
          description,
          movieId,
        },
        include: {
          movie: true,
        },
      });
      const shareholders = await prisma.shareholder.findMany({
        where: { movieId: transfer.movieId },
      });
      const evenAmount = transfer.amount / shareholders.length;
      for (let i = 0; i < shareholders.length; i++) {
        await prisma.shareholderTransfer.create({
          data: {
            movieId,
            shareholderId: shareholders[i].id,
            amount: evenAmount,
          },
        });
      }
      return transfer;
    },
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
