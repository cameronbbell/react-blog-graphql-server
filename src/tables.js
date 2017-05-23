import sql from "sql";

sql.setDialect("sqlite");

export const users = sql.define({
  name: "users",
  columns: [
    {
      name: "id",
      dataType: "INTEGER",
      primaryKey: true
    },
    {
      name: "name",
      dataType: "text"
    },
    {
      name: "role",
      dataType: "text"
    }
  ]
});

export const posts = sql.define({
  name: "posts",
  columns: [
    {
      name: "id",
      dataType: "INTEGER",
      primaryKey: true
    },
    {
      name: "posted_by_user_id",
      dataType: "int"
    },
    {
      name: "created_at",
      dataType: "datetime"
    },
    {
      name: "title",
      dataType: "text"
    },
    {
      name: "body",
      dataType: "text"
    },
    {
      name: "timestamp",
      dataType: "datetime"
    },
    {
      name: "last_modified_by_user_id",
      dataType: "int"
    }
  ]
});

export const comments = sql.define({
  name: "comments",
  columns: [
    {
      name: "id",
      dataType: "INTEGER",
      primaryKey: true
    },
    {
      name: "post_id",
      dataType: "int"
    },
    {
      name: "posted_by_user_id",
      dataType: "int"
    },
    {
      name: "created_at",
      dataType: "datetime"
    },
    {
      name: "body",
      dataType: "text"
    },
    {
      name: "timestamp",
      dataType: "datetime"
    },
    {
      name: "last_modified_by_user_id",
      dataType: "int"
    }
  ]
});

export const dbIdToNodeId = (dbId, tableName) => {
  return `${tableName}:${dbId}`;
};

export const splitNodeId = nodeId => {
  const [tableName, dbId] = nodeId.split(":");
  return { tableName, dbId };
};
