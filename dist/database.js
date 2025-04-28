"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/database.ts
var database_exports = {};
__export(database_exports, {
  default: () => database_default
});
module.exports = __toCommonJS(database_exports);
var import_node_events = require("events");
var import_pg = __toESM(require("pg"));
var { Pool, Client } = import_pg.default;
var Database = class extends import_node_events.EventEmitter {
  constructor(user, host, password, port, database) {
    super();
    this.user = user;
    this.host = host;
    this.password = password;
    this.port = port;
    this.database = database;
    this.pool = new Pool({
      user: this.user,
      host: this.host,
      password: this.password,
      port: this.port,
      database: this.database
    });
    this.listenerClient = new Client({
      user: this.user,
      host: this.host,
      password: this.password,
      port: this.port,
      database: this.database
    });
  }
  pool;
  listenerClient;
  async listenToEvents(channel) {
    try {
      await this.listenerClient.connect();
      await this.listenerClient.query(`LISTEN ${channel}`);
      this.listenerClient.on("notification", (msg) => {
        const payload = msg.payload ? JSON.parse(msg.payload) : null;
        this.emit(channel, payload);
      });
    } catch (err) {
      console.error("Erro ao escutar eventos:", err);
      throw err;
    }
  }
  async stopListening() {
    try {
      await this.listenerClient.end();
      console.log("Parou de escutar eventos.");
    } catch (err) {
      console.error("Erro ao parar o listener:", err);
      throw err;
    }
  }
  createAlias = (table, existingAliases) => {
    const parts = table.split("_");
    let alias = parts.map((part) => part[0]).join("");
    let counter = 0;
    while (existingAliases.has(alias)) {
      counter++;
      alias = parts.map((part) => part[0]).join("") + counter;
    }
    existingAliases.add(alias);
    return alias;
  };
  mapNullToUndefined(row) {
    const mappedRow = {};
    for (const key in row) {
      if (Object.prototype.hasOwnProperty.call(row, key)) {
        const value = row[key];
        mappedRow[key] = value === null ? void 0 : value;
      }
    }
    return mappedRow;
  }
  mapNullToUndefinedInArray(array) {
    return array.map((item) => this.mapNullToUndefined(item));
  }
  buildWhereClause(where, values, mainTableAlias) {
    if (!where) return { clause: "", values: [] };
    const andConditions = [];
    const orConditions = [];
    const whereValues = values ? [...values] : [];
    const processCondition = (key, condition, conditionsArray, alias) => {
      const column = alias && !key.includes(".") ? `${alias}.${key}` : key;
      if (condition === null || condition === void 0) {
        conditionsArray.push(`${column} IS NULL`);
      } else if (Array.isArray(condition)) {
        const placeholders = condition.map((_, i) => `$${whereValues.length + i + 1}`).join(", ");
        conditionsArray.push(`${column} IN (${placeholders})`);
        whereValues.push(...condition);
      } else if (typeof condition === "object") {
        if ("value" in condition && "mode" in condition) {
          if (condition.mode === "not") {
            if (condition.value === null) {
              conditionsArray.push(`${column} IS NOT NULL`);
            } else if (Array.isArray(condition.value)) {
              const placeholders = condition.value.map((_, i) => `$${whereValues.length + i + 1}`).join(", ");
              conditionsArray.push(`${column} NOT IN (${placeholders})`);
              whereValues.push(...condition.value);
            } else {
              conditionsArray.push(`${column} != $${whereValues.length + 1}`);
              whereValues.push(condition.value);
            }
          } else if (condition.mode === "ilike") {
            conditionsArray.push(`${column} ILIKE $${whereValues.length + 1}`);
            whereValues.push(`%${condition.value}%`);
          } else if (condition.mode === "like") {
            conditionsArray.push(`${column} LIKE $${whereValues.length + 1}`);
            whereValues.push(`%${condition.value}%`);
          } else if (condition.mode === "date") {
            conditionsArray.push(`DATE(${column}) = $${whereValues.length + 1}`);
            whereValues.push(`%${condition.value}%`);
          } else {
            conditionsArray.push(`${column} = $${whereValues.length + 1}`);
            whereValues.push(condition.value);
          }
        } else if ("lt" in condition || "lte" in condition || "gt" in condition || "gte" in condition) {
          if (condition.lt !== void 0) {
            conditionsArray.push(`${column} < $${whereValues.length + 1}`);
            whereValues.push(condition.lt);
          }
          if (condition.lte !== void 0) {
            conditionsArray.push(`${column} <= $${whereValues.length + 1}`);
            whereValues.push(condition.lte);
          }
          if (condition.gt !== void 0) {
            conditionsArray.push(`${column} > $${whereValues.length + 1}`);
            whereValues.push(condition.gt);
          }
          if (condition.gte !== void 0) {
            conditionsArray.push(`${column} >= $${whereValues.length + 1}`);
            whereValues.push(condition.gte);
          }
        }
      } else {
        conditionsArray.push(`${column} = $${whereValues.length + 1}`);
        whereValues.push(condition);
      }
    };
    Object.keys(where).forEach((key) => {
      if (key !== "OR") {
        const condition = where[key];
        processCondition(key, condition, andConditions, mainTableAlias);
      }
    });
    if (where.OR) {
      Object.keys(where.OR).forEach((key) => {
        const condition = where.OR[key];
        processCondition(key, condition, orConditions, mainTableAlias);
      });
    }
    let clause = "";
    if (andConditions.length > 0 || orConditions.length > 0) {
      clause += " WHERE ";
      if (andConditions.length > 0) {
        clause += `(${andConditions.join(" AND ")})`;
      }
      if (orConditions.length > 0) {
        if (andConditions.length > 0) clause += " AND ";
        clause += `(${orConditions.join(" OR ")})`;
      }
    }
    return { clause, values: whereValues };
  }
  async connectPool() {
    try {
      await this.pool.connect();
      console.log(`Conex\xE3o com o banco de dados "${this.database}" foi estabelecida.`);
    } catch (err) {
      console.error("Erro ao conectar ao pool:", err);
      throw err;
    }
  }
  async createDatabase() {
    const client = new Client({
      user: this.user,
      host: this.host,
      password: this.password,
      port: this.port,
      database: "postgres"
    });
    try {
      await client.connect();
      await client.query(`CREATE DATABASE "${this.database}"`);
      console.log(`Banco de dados "${this.database}" criado com sucesso.`);
    } catch (err) {
      if (err.code === "42P04") {
        console.log(`Banco de dados "${this.database}" j\xE1 existe.`);
      } else {
        console.error("Erro ao criar o banco de dados:", err);
      }
    } finally {
      await client.end();
    }
  }
  async insertIntoTable({
    table,
    dataDict,
    select
  }) {
    const columns = Object.keys(dataDict).filter((col) => dataDict[col] !== void 0);
    const values = columns.map((col) => dataDict[col]);
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
    let returningClause = "";
    if (select && Object.keys(select).length > 0) {
      const selectedFields = Object.keys(select).filter((key) => select[key]).join(", ");
      if (selectedFields.length > 0) {
        returningClause = `RETURNING ${selectedFields}`;
      }
    }
    const query = `
    INSERT INTO ${table} (${columns.join(", ")})
    VALUES (${placeholders})
    ${returningClause};
  `;
    const result = await this.pool.query(query, values);
    if (returningClause && result.rows.length > 0) {
      const mappedResult = this.mapNullToUndefined(result.rows[0]);
      return mappedResult;
    }
  }
  async updateIntoTable({
    table,
    dataDict,
    where
  }) {
    const columns = Object.keys(dataDict).filter((col) => dataDict[col] !== void 0);
    const values = columns.map((col) => dataDict[col]);
    const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(", ");
    const { clause: whereClause, values: whereValues } = this.buildWhereClause(where, [
      ...values
    ]);
    const query = `UPDATE ${table} SET ${setClause}${whereClause};`;
    await this.pool.query(query, whereValues);
  }
  async findMany({
    table,
    alias,
    orderBy,
    select,
    where,
    joins,
    limit,
    offset,
    groupBy
  }) {
    let query = "";
    let query_aux = "";
    const selectedFields = [];
    const existingAliases = /* @__PURE__ */ new Set();
    const mainTableAlias = alias || this.createAlias(table, existingAliases);
    if (alias) {
      existingAliases.add(alias);
    }
    if (select && Object.keys(select).length > 0) {
      const matchSelect = [];
      Object.keys(select).filter((key) => select[key] === true).forEach((key) => {
        if (key.includes(" AS ")) {
          const keySplit = key.split(" AS ");
          const originalKey = keySplit[0];
          const keyAlias = keySplit.at(-1);
          if (!originalKey.includes(".")) {
            matchSelect.push(`${mainTableAlias}.${originalKey} AS ${keyAlias}`);
          } else {
            matchSelect.push(`${originalKey} AS ${keyAlias}`);
          }
        } else if (key.includes("*")) {
          if (!key.includes(".")) {
            matchSelect.push(`${mainTableAlias}.${key}`);
          }
        } else {
          if (!key.includes(".")) {
            matchSelect.push(`${mainTableAlias}.${key}`);
          }
          const slSplit = key.split(".");
          const slAlias = slSplit[0];
          if (slAlias !== mainTableAlias) {
            matchSelect.push(`${key} AS ${slAlias}_${slSplit.at(-1)}`);
          }
        }
      });
      selectedFields.push(...matchSelect);
    } else {
      selectedFields.push(`${mainTableAlias}.*`);
    }
    if (joins && joins.length > 0) {
      for (const join of joins) {
        const joinAlias = join.alias || this.createAlias(join.table, existingAliases);
        if (join.alias) {
          existingAliases.add(join.alias);
        }
        const joinType = join.type || "INNER";
        if (select && Object.keys(select).length > 0) {
          const promisesColumns = [];
          Object.keys(select).filter((key) => select[key] === true).forEach((key) => {
            if (key.includes("*")) {
              const keySplit = key.split(".");
              const originalKey = keySplit[0];
              if (originalKey === joinAlias) {
                promisesColumns.push(
                  this.findMany({
                    table: "information_schema.columns",
                    alias: "i",
                    where: { "i.table_name": join.table },
                    select: { "i.column_name AS column_name": true }
                  })
                );
              }
            }
          });
          const joinColumns = (await Promise.all(promisesColumns)).flat();
          console.log(joinColumns);
          selectedFields.push(
            ...joinColumns.map(
              (column) => `${joinAlias}.${column.column_name} AS ${joinAlias}_${column.column_name}`
            )
          );
        } else {
          const joinColumns = await this.findMany({
            table: "information_schema.columns",
            alias: "i",
            where: { "i.table_name": join.table },
            select: { "i.column_name AS column_name": true }
          });
          selectedFields.push(
            ...joinColumns.map(
              (column) => `${joinAlias}.${column.column_name} AS ${joinAlias}_${column.column_name}`
            )
          );
        }
        const joinConditions = Object.keys(join.on).map((key) => {
          const column = !key.includes(".") ? `${mainTableAlias}.${key}` : key;
          return `${column} = ${joinAlias}.${join.on[key]}`;
        }).join(" AND ");
        query_aux += ` ${joinType} JOIN ${join.table} AS ${joinAlias} ON ${joinConditions}`;
      }
    }
    query = `SELECT ${selectedFields.join(", ")} FROM ${table} AS ${mainTableAlias} ${query_aux}`;
    const { clause: whereClause, values: whereValues } = this.buildWhereClause(
      where,
      void 0,
      mainTableAlias
    );
    query += whereClause;
    if (groupBy && groupBy.length > 0) {
      const groupByClause = groupBy.map((key) => !key.includes(".") ? `${mainTableAlias}.${key}` : key).join(", ");
      query += ` GROUP BY ${groupByClause}`;
    }
    if (orderBy && Object.keys(orderBy).length > 0) {
      const ordering = Object.keys(orderBy).map(
        (key) => !key.includes(".") ? `${mainTableAlias}.${key} ${orderBy[key]}` : `${key} ${orderBy[key]}`
      ).join(", ");
      query += ` ORDER BY ${ordering}`;
    }
    if (limit) {
      query += ` LIMIT ${limit}`;
    }
    if (offset) {
      query += ` OFFSET ${offset}`;
    }
    query += ";";
    const result = await this.pool.query(query, whereValues);
    const cleanedResult = this.mapNullToUndefinedInArray(result.rows);
    return cleanedResult;
  }
  async findFirst(params) {
    const result = await this.findMany({ ...params, limit: 1 });
    return result.length > 0 ? result[0] : null;
  }
  async deleteFromTable({
    table,
    where
  }) {
    const { clause: whereClause, values: whereValues } = this.buildWhereClause(where);
    const query = `DELETE FROM ${table}${whereClause};`;
    await this.pool.query(query, whereValues);
  }
  async count({
    table,
    alias,
    where,
    joins
  }) {
    let query = "";
    let query_aux = "";
    const existingAliases = /* @__PURE__ */ new Set();
    const mainTableAlias = alias || this.createAlias(table, existingAliases);
    if (alias) {
      existingAliases.add(alias);
    }
    if (joins && joins.length > 0) {
      for (const join of joins) {
        const joinAlias = join.alias || this.createAlias(join.table, existingAliases);
        if (join.alias) {
          existingAliases.add(join.alias);
        }
        const joinType = join.type || "INNER";
        const joinConditions = Object.keys(join.on).map((key) => {
          const column = !key.includes(".") ? `${mainTableAlias}.${key}` : key;
          return `${column} = ${joinAlias}.${join.on[key]}`;
        }).join(" AND ");
        query_aux += ` ${joinType} JOIN ${join.table} AS ${joinAlias} ON ${joinConditions}`;
      }
    }
    query = `SELECT COUNT(*) AS total FROM ${table} AS ${mainTableAlias} ${query_aux}`;
    const { clause: whereClause, values: whereValues } = this.buildWhereClause(
      where,
      void 0,
      mainTableAlias
    );
    query += whereClause;
    query += ";";
    const result = await this.pool.query(query, whereValues);
    return result.rows[0]?.total ? parseInt(result.rows[0].total, 10) : 0;
  }
  async query(queryText, params = []) {
    try {
      const result = await this.pool.query(queryText, params);
      return result.rows;
    } catch (err) {
      console.error("Erro ao executar query:", err);
      throw err;
    }
  }
};
var database_default = Database;
