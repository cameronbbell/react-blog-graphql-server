console.log({ starting: true });

import express from "express";
import graphqlHTTP from "express-graphql";
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLID
} from "graphql";
import {
  NodeInterface,
  UserType,
  PostType,
  CommentType
} from "./src/types";

import * as loaders from "./src/loaders";

const app = express();

const RootQuery = new GraphQLObjectType({
  name: "RootQuery",
  description: "Thre root query",
  fields: {
    node: {
      type: NodeInterface,
      args: {
        id: {
          type: new GraphQLNonNull(GraphQLID)
        }
      },
      resolve(source, args) {
        return loaders.getNodeById(args.id);
      }
    }
  }
});

let inMemoryStore = {};
const RootMutation = new GraphQLObjectType({
  name: "RootMutation",
  description: "The root mutation",
  fields: {
    setNode: {
      type: GraphQLString,
      args: {
        id: {
          type: new GraphQLNonNull(GraphQLID)
        },
        value: {
          type: new GraphQLNonNull(GraphQLString)
        }
      },
      resolve(source, args) {
        inMemoryStore[args.key] = args.value;
        return inMemoryStore[args.key];
      }
    }
  }
});

const Schema = new GraphQLSchema({
  types: [UserType, PostType, CommentType],
  query: RootQuery,
  mutation: RootMutation
});

app.use("/graphql", graphqlHTTP({ schema: Schema, graphiql: true }));

app.listen(3001, () => {
  console.log({ running: true });
});
