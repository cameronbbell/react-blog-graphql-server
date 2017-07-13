import * as database from "./database";
import * as tables from "./tables";

import DataLoader from "dataloader";

let nodeLoaders;

const createNodeLoader = table => {
  return new DataLoader(ids => {
    const query = table.select(table.star()).where(table.id.in(ids)).toQuery();

    return database.getSql(query).then(rows => {
      rows.forEach(row => {
        row.__tableName = table.getName();
      });
      return rows;
    });
  });
};

export const createNodeLoaders = () => {
  return {
    users: createNodeLoader(tables.users),
    posts: createNodeLoader(tables.posts),
    comments: createNodeLoader(tables.comments)
  };
};

export const setLoaders = () => {
  nodeLoaders = createNodeLoaders();
};

export const getTableCount = tableName => {
  const table = tables.tableLookup(tableName);
  const query = table.select(table.id.count()).toQuery();

  return database.getSql(query).then(result => {
    return result[0].id_count;
  });
};

export const getNodeById = nodeId => {
  const { tableName, dbId } = tables.splitNodeId(nodeId);
  return nodeLoaders[tableName].load(dbId);
};

export const getCommentsForPost = postSource => {
  const table = tables.comments;
  const query = table
    .select(table.id)
    .where(table.post_id.equals(postSource.id))
    .toQuery();

  return database.getSql(query).then(rows => {
    rows.forEach(row => {
      row.__tableName = tables.users.getName();
    });
    return rows;
  });
};

export const getPostIdsForUser = (userSource, args, context) => {
  let { after, first } = args;
  if (!first) {
    first = 2;
  }

  const table = tables.posts;
  let query = table
    .select(table.id, table.created_at)
    .where(table.posted_by_user_id.equals(userSource.id))
    .order(table.created_at.asc)
    .limit(first + 2);

  if (after) {
    const [id, created_at] = after.split(":");
    query = query.where(table.created_at.gt(after)).where(table.id.gt(id));
  }

  return database.getSql(query.toQuery()).then(allRows => {
    const rows = allRows.slice(0, first);

    rows.forEach(row => {
      row.__tableName = tables.posts.getName();
      row.__cursor = row.id + ":" + row.created_at;
    });

    const hasNextPage = allRows.length > first;
    const hasPreviousPage = false;

    const pageInfo = {
      hasNextPage: hasNextPage,
      hasPreviousPage: hasPreviousPage
    };

    if (rows.length > 0) {
      pageInfo.startCursor = rows[0].__cursor;
      pageInfo.endCursor = rows[rows.length - 1].__cursor;
    }

    return { rows, pageInfo };
  });
};

export const getPostIds = (source, args, context) => {
  let { first } = args;
  const { after, linkText, offset } = args;
  if (!first) {
    first = 1;
  }

  const table = tables.posts;
  let query = table.select(table.id, table.created_at);

  if (after) {
    const [id, created_at] = after.split(":");
    query = query.where(table.created_at.gt(created_at)).where(table.id.gt(id));
  }

  if (linkText) {
    query = query.where(table.link_text.equals(linkText));
  }

  query.order(table.created_at.desc).limit(first);

  if (offset) {
    query.offset(offset);
  }

  return database.getSql(query.toQuery()).then(allRows => {
    const rows = allRows.slice(0, first);

    rows.forEach(row => {
      row.__tableName = tables.posts.getName();
      row.__cursor = row.id + ":" + row.created_at;
    });

    const hasNextPage = false;
    const hasPreviousPage = allRows.length > first;

    const pageInfo = {
      hasNextPage: hasNextPage,
      hasPreviousPage: hasPreviousPage
    };

    if (rows.length > 0) {
      pageInfo.startCursor = rows[0].__cursor;
      pageInfo.endCursor = rows[rows.length - 1].__cursor;
    }

    rows.sort((a, b) => {
      return a.id - b.id;
    });

    return { rows, pageInfo };
  });
};

export const getPosts = (rows, pageInfo) => {
  const promises = rows.map(row => {
    const postNodeId = tables.dbIdToNodeId(row.id, row.__tableName);
    return getNodeById(postNodeId).then(node => {
      const edge = {
        node,
        cursor: row.__cursor
      };
      return edge;
    });
  });

  return Promise.all(promises).then(edges => {
    // post edges should be sorted descending by date so that the most recent
    // posts are returned first
    edges.sort((a, b) => {
      return new Date(b.node.created_at) - new Date(a.node.created_at);
    });

    return {
      edges,
      pageInfo
    };
  });
};

export const getCommentIdsForPost = (postSource, args, context) => {
  let { after, first } = args;
  if (!first) {
    first = 10;
  }

  const table = tables.comments;
  let query = table
    .select(table.id, table.created_at)
    .where(table.post_id.equals(postSource.id))
    .order(table.created_at.asc)
    .limit(first + 2);

  if (after) {
    const [id, created_at] = after.split(":");
    query = query.where(table.created_at.gt(after)).where(table.id.gt(id));
  }

  return database.getSql(query.toQuery()).then(allRows => {
    const rows = allRows.slice(0, first);

    rows.forEach(row => {
      row.__tableName = tables.comments.getName();
      row.__cursor = row.id + ":" + row.created_at;
    });

    const hasNextPage = allRows.length > first;
    const hasPreviousPage = false;

    const pageInfo = {
      hasNextPage: hasNextPage,
      hasPreviousPage: hasPreviousPage
    };

    if (rows.length > 0) {
      pageInfo.startCursor = rows[0].__cursor;
      pageInfo.endCursor = rows[rows.length - 1].__cursor;
    }

    return { rows, pageInfo };
  });
};

export const createPost = (title, body, context) => {
  const { dbId } = tables.splitNodeId(context);
  const created_at = new Date().toISOString().split("T")[0];
  const posts = [
    {
      posted_by_user_id: dbId,
      created_at,
      title,
      body,
      timestamp: created_at,
      last_modified_by_user_id: dbId
    }
  ];

  let query = tables.posts.insert(posts).toQuery();
  return database
    .getSql(query)
    .then(() => {
      return database.getSql({
        text: "SELECT last_insert_rowid() AS id FROM posts"
      });
    })
    .then(ids => {
      return tables.dbIdToNodeId(ids[0].id, tables.posts.getName());
    });
};
