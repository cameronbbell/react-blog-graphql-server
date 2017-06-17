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
import { NodeInterface, UserType, PostType, CommentType } from "./src/types";

import * as loaders from "./src/loaders";

const app = express();

const RootQuery = new GraphQLObjectType({
  name: "RootQuery",
  description: "The root query",
  fields: {
    viewer: {
      type: NodeInterface,
      resolve(source, args, context) {
        return loaders.getNodeById(context);
      }
    },
    node: {
      type: NodeInterface,
      args: {
        id: {
          type: new GraphQLNonNull(GraphQLID)
        }
      },
      resolve(source, args, context) {
        return loaders.getNodeById(args.id);
      }
    }
  }
});

const RootMutation = new GraphQLObjectType({
  name: "RootMutation",
  description: "The root mutation",
  fields: {
    createPost: {
      type: PostType,
      args: {
        body: {
          type: new GraphQLNonNull(GraphQLString)
        },
        title: {
          type: new GraphQLNonNull(GraphQLString)
        }
      },
      resolve(source, args, context) {
        return loaders
          .createPost(args.title, args.body, context)
          .then(nodeId => {
            return loaders.getNodeById(nodeId);
          });
      }
    }
  }
});

const Schema = new GraphQLSchema({
  types: [UserType, PostType, CommentType],
  query: RootQuery,
  mutation: RootMutation
});

app.use(
  "/graphql",
  graphqlHTTP(() => {
    const context = "users:1";
    return { schema: Schema, graphiql: true, context: context, pretty: true };
  })
);

app.listen(3001, () => {
  console.log({ running: true });
});
