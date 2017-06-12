import {
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLNonNull,
  GraphQLList,
  GraphQLBoolean,
  GraphQLInt
} from "graphql";
import * as loaders from "./loaders";
import * as tables from "./tables";

export const NodeInterface = new GraphQLInterfaceType({
  name: "Node",
  fields: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  resolveType: source => {
    switch (source.__tableName) {
      case tables.users.getName():
        return UserType;
      case tables.posts.getName():
        return PostType;
      case tables.comments.getName():
        return CommentType;
      default:
        return UserType;
    }
  }
});

const resolveId = source => {
  return tables.dbIdToNodeId(source.id, source.__tableName);
};

export const UserType = new GraphQLObjectType({
  name: "User",
  interfaces: [NodeInterface],
  fields: () => {
    return {
      id: {
        type: new GraphQLNonNull(GraphQLID),
        resolve: resolveId
      },
      name: {
        type: new GraphQLNonNull(GraphQLString)
      },
      role: {
        type: new GraphQLNonNull(GraphQLString)
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
            .getPostIdsForUser(source, args, context)
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

export const PostType = new GraphQLObjectType({
  name: "Post",
  interfaces: [NodeInterface],
  fields: () => {
    return {
      id: {
        type: new GraphQLNonNull(GraphQLID),
        resolve: resolveId
      },
      created_at: {
        type: new GraphQLNonNull(GraphQLString)
      },
      posted_by_user_id: {
        type: new GraphQLNonNull(GraphQLInt)
      },
      title: {
        type: new GraphQLNonNull(GraphQLString)
      },
      body: {
        type: new GraphQLNonNull(GraphQLString)
      },
      comments: {
        type: new GraphQLList(CommentType),
        resolve(source) {
          return loaders.getCommentsForPost(source).then(rows => {
            const promises = rows.map(row => {
              const commentNodeId = tables.dbIdToNodeId(row.id, "comments");
              return loaders.getNodeById(commentNodeId);
            });
            return Promise.all(promises);
          });
        }
      }
    };
  }
});

export const CommentType = new GraphQLObjectType({
  name: "Comment",
  interfaces: [NodeInterface],
  fields: () => {
    return {
      id: {
        type: new GraphQLNonNull(GraphQLID),
        resolve: resolveId
      },
      post_id: {
        type: new GraphQLNonNull(GraphQLInt)
      },
      posted_by_user_id: {
        type: new GraphQLNonNull(GraphQLInt)
      },
      created_at: {
        type: new GraphQLNonNull(GraphQLString)
      },
      body: {
        type: new GraphQLNonNull(GraphQLString)
      }
    };
  }
});

const PageInfoType = new GraphQLObjectType({
  name: "PageInfo",
  fields: {
    hasNextPage: {
      type: new GraphQLNonNull(GraphQLBoolean)
    },
    hasPreviousPage: {
      type: new GraphQLNonNull(GraphQLBoolean)
    },
    startCursor: {
      type: GraphQLString
    },
    endCursor: {
      type: GraphQLString
    }
  }
});

const PostEdgeType = new GraphQLObjectType({
  name: "PostEdge",
  fields: () => {
    return {
      cursor: {
        type: new GraphQLNonNull(GraphQLString)
      },
      node: {
        type: new GraphQLNonNull(PostType)
      }
    };
  }
});

const PostsConnectionType = new GraphQLObjectType({
  name: "PostsConnection",
  fields: {
    pageInfo: {
      type: new GraphQLNonNull(PageInfoType)
    },
    edges: {
      type: new GraphQLList(PostEdgeType)
    }
  }
});
