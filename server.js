console.log({ starting: true });

import express from "express";
import graphqlHTTP from "express-graphql";
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLID,
  GraphQLInt
} from "graphql";
import {
  NodeInterface,
  UserType,
  PostType,
  CommentType,
  PostsConnectionType
} from "./src/types";

import * as loaders from "./src/loaders";
import * as tables from "./src/tables";

const app = express();

const RootQuery = new GraphQLObjectType({
  name: "RootQuery",
  description: "The root query",
  fields: () => {
    return {
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
      },
      posts: {
        type: PostsConnectionType,
        args: {
          after: {
            type: GraphQLString
          },
          first: {
            type: GraphQLInt
          }
        },
        resolve(source, args, context) {
          return loaders
            .getPostIds(source, args, context)
            .then(({ rows, pageInfo }) => {
              const promises = rows.map(row => {
                const postNodeId = tables.dbIdToNodeId(row.id, row.__tableName);
                return loaders.getNodeById(postNodeId).then(node => {
                  const edge = {
                    node,
                    cursor: row.__cursor
                  };
                  return edge;
                });
              });

              return Promise.all(promises).then(edges => {
                return {
                  edges,
                  pageInfo
                };
              });
            });
        }
      }
    };
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

app.use((req, res, next) => {
  let oneof = false;
  if (
    req.headers.origin &&
    req.headers.origin.match(/^https?:[/][/]localhost/)
  ) {
    res.header("Access-Control-Allow-Origin", req.headers.origin);
    oneof = true;
  }
  if (req.headers["access-control-request-method"]) {
    res.header(
      "Access-Control-Allow-Methods",
      req.headers["access-control-request-method"]
    );
    oneof = true;
  }
  if (req.headers["access-control-request-headers"]) {
    res.header(
      "Access-Control-Allow-Headers",
      req.headers["access-control-request-headers"]
    );
    oneof = true;
  }
  if (oneof) {
    res.header("Access-Control-Max-Age", 60 * 60 * 24 * 365);
  }

  // Intercept OPTIONS method.
  if (oneof && req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(
  "/graphql",
  graphqlHTTP(() => {
    const context = "users:1";
    return { schema: Schema, graphiql: true, context: context, pretty: true };
  })
);

app.listen(3002, () => {
  console.log({ running: true });
});
