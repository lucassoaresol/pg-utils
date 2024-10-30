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
    this.createAlias = (table, existingAliases) => {
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
  processCondition(key, condition, conditionsArray, whereValues) {
    if (condition === null || condition === void 0) {
      conditionsArray.push(`${key} IS NULL`);
    } else if (typeof condition === "object") {
      if ("value" in condition && "mode" in condition) {
        if (condition.mode === "not") {
          if (condition.value === null) {
            conditionsArray.push(`${key} IS NOT NULL`);
          } else {
            conditionsArray.push(`${key} != $${whereValues.length + 1}`);
            whereValues.push(condition.value);
          }
        } else {
          conditionsArray.push(`${key} = $${whereValues.length + 1}`);
          whereValues.push(condition.value);
        }
      } else if ("lt" in condition || "lte" in condition || "gt" in condition || "gte" in condition) {
        if (condition.lt !== void 0) {
          conditionsArray.push(`${key} < $${whereValues.length + 1}`);
          whereValues.push(condition.lt);
        }
        if (condition.lte !== void 0) {
          conditionsArray.push(`${key} <= $${whereValues.length + 1}`);
          whereValues.push(condition.lte);
        }
        if (condition.gt !== void 0) {
          conditionsArray.push(`${key} > $${whereValues.length + 1}`);
          whereValues.push(condition.gt);
        }
        if (condition.gte !== void 0) {
          conditionsArray.push(`${key} >= $${whereValues.length + 1}`);
          whereValues.push(condition.gte);
        }
      }
    } else {
      conditionsArray.push(`${key} = $${whereValues.length + 1}`);
      whereValues.push(condition);
    }
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
  async beginTransaction() {
    try {
      await this.pool.query("BEGIN");
      console.log("Transa\xE7\xE3o iniciada.");
    } catch (err) {
      console.error("Erro ao iniciar a transa\xE7\xE3o:", err);
      throw err;
    }
  }
  async commitTransaction() {
    try {
      await this.pool.query("COMMIT");
      console.log("Transa\xE7\xE3o comitada.");
    } catch (err) {
      console.error("Erro ao comitar a transa\xE7\xE3o:", err);
      throw err;
    }
  }
  async rollbackTransaction() {
    try {
      await this.pool.query("ROLLBACK");
      console.log("Transa\xE7\xE3o revertida.");
    } catch (err) {
      console.error("Erro ao reverter a transa\xE7\xE3o:", err);
      throw err;
    }
  }
  async executeMigration(sql) {
    try {
      await this.pool.query(sql);
      console.log("Migra\xE7\xE3o executada com sucesso.");
    } catch (err) {
      console.error("Erro ao executar migra\xE7\xE3o:", err);
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
    let query = `UPDATE ${table} SET ${setClause}`;
    const whereValues = [...values];
    if (where) {
      const andConditions = [];
      const orConditions = [];
      Object.keys(where).forEach((key) => {
        if (key !== "OR") {
          const condition = where[key];
          this.processCondition(key, condition, andConditions, whereValues);
        }
      });
      if (where.OR) {
        Object.keys(where.OR).forEach((key) => {
          const condition = where.OR[key];
          this.processCondition(key, condition, orConditions, whereValues);
        });
      }
      if (andConditions.length > 0 || orConditions.length > 0) {
        query += " WHERE ";
        if (andConditions.length > 0) {
          query += `(${andConditions.join(" AND ")})`;
        }
        if (orConditions.length > 0) {
          if (andConditions.length > 0) {
            query += " OR ";
          }
          query += `(${orConditions.join(" OR ")})`;
        }
      }
    }
    query += ";";
    await this.pool.query(query, whereValues);
  }
  async findMany({
    table,
    orderBy,
    select,
    where,
    joins
  }) {
    let query = "";
    let query_aux = "";
    const selectedFields = [];
    const whereValues = [];
    const existingAliases = /* @__PURE__ */ new Set();
    const mainTableAlias = this.createAlias(table, existingAliases);
    if (select && Object.keys(select).length > 0) {
      selectedFields.push(
        ...Object.keys(select).filter((key) => select[key] === true).map((key) => `${mainTableAlias}.${key}`)
      );
    } else {
      selectedFields.push(`${mainTableAlias}.*`);
    }
    if (joins && joins.length > 0) {
      for (const join of joins) {
        const joinAlias = this.createAlias(join.table, existingAliases);
        const joinType = join.type || "INNER";
        if (join.select && Object.keys(join.select).length > 0) {
          selectedFields.push(
            ...Object.keys(join.select).filter((key) => join.select[key] === true).map((key) => `${joinAlias}.${key} AS ${joinAlias}_${key}`)
          );
        } else {
          const joinColumns = await this.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = $1",
            [join.table]
          );
          selectedFields.push(
            ...joinColumns.map(
              (column) => `${joinAlias}.${column.column_name} AS ${joinAlias}_${column.column_name}`
            )
          );
        }
        const joinConditions = Object.keys(join.on).map((key) => `${mainTableAlias}.${key} = ${joinAlias}.${join.on[key]}`).join(" AND ");
        query_aux += ` ${joinType} JOIN ${join.table} AS ${joinAlias} ON ${joinConditions}`;
      }
    }
    query = `SELECT ${selectedFields.join(", ")} FROM ${table} AS ${mainTableAlias} ${query_aux}`;
    if (where) {
      const andConditions = [];
      const orConditions = [];
      Object.keys(where).forEach((key) => {
        if (key !== "OR") {
          const condition = where[key];
          this.processCondition(
            `${mainTableAlias}.${key}`,
            condition,
            andConditions,
            whereValues
          );
        }
      });
      if (where.OR) {
        Object.keys(where.OR).forEach((key) => {
          const condition = where.OR[key];
          this.processCondition(
            `${mainTableAlias}.${key}`,
            condition,
            orConditions,
            whereValues
          );
        });
      }
      if (andConditions.length > 0 || orConditions.length > 0) {
        query += " WHERE ";
        if (andConditions.length > 0) {
          query += `(${andConditions.join(" AND ")})`;
        }
        if (orConditions.length > 0) {
          if (andConditions.length > 0) {
            query += " OR ";
          }
          query += `(${orConditions.join(" OR ")})`;
        }
      }
    }
    if (orderBy && Object.keys(orderBy).length > 0) {
      const ordering = Object.keys(orderBy).map((key) => `${mainTableAlias}.${key} ${orderBy[key]}`).join(", ");
      query += ` ORDER BY ${ordering}`;
    }
    query += ";";
    const result = await this.pool.query(query, whereValues);
    const cleanedResult = this.mapNullToUndefinedInArray(result.rows);
    return cleanedResult;
  }
  async findFirst({
    table,
    orderBy,
    select,
    where,
    joins
  }) {
    let query = "";
    let query_aux = "";
    const selectedFields = [];
    const whereValues = [];
    const existingAliases = /* @__PURE__ */ new Set();
    const mainTableAlias = this.createAlias(table, existingAliases);
    if (select && Object.keys(select).length > 0) {
      selectedFields.push(
        ...Object.keys(select).filter((key) => select[key] === true).map((key) => `${mainTableAlias}.${key}`)
      );
    } else {
      selectedFields.push(`${mainTableAlias}.*`);
    }
    if (joins && joins.length > 0) {
      for (const join of joins) {
        const joinAlias = this.createAlias(join.table, existingAliases);
        const joinType = join.type || "INNER";
        if (join.select && Object.keys(join.select).length > 0) {
          selectedFields.push(
            ...Object.keys(join.select).filter((key) => join.select[key] === true).map((key) => `${joinAlias}.${key} AS ${joinAlias}_${key}`)
          );
        } else {
          const joinColumns = await this.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = $1",
            [join.table]
          );
          selectedFields.push(
            ...joinColumns.map(
              (column) => `${joinAlias}.${column.column_name} AS ${joinAlias}_${column.column_name}`
            )
          );
        }
        const joinConditions = Object.keys(join.on).map((key) => `${mainTableAlias}.${key} = ${joinAlias}.${join.on[key]}`).join(" AND ");
        query_aux += ` ${joinType} JOIN ${join.table} AS ${joinAlias} ON ${joinConditions}`;
      }
    }
    query = `SELECT ${selectedFields.join(", ")} FROM ${table} AS ${mainTableAlias} ${query_aux}`;
    if (where) {
      const andConditions = [];
      const orConditions = [];
      Object.keys(where).forEach((key) => {
        if (key !== "OR") {
          const condition = where[key];
          this.processCondition(
            `${mainTableAlias}.${key}`,
            condition,
            andConditions,
            whereValues
          );
        }
      });
      if (where.OR) {
        Object.keys(where.OR).forEach((key) => {
          const condition = where.OR[key];
          this.processCondition(
            `${mainTableAlias}.${key}`,
            condition,
            orConditions,
            whereValues
          );
        });
      }
      if (andConditions.length > 0 || orConditions.length > 0) {
        query += " WHERE ";
        if (andConditions.length > 0) {
          query += `(${andConditions.join(" AND ")})`;
        }
        if (orConditions.length > 0) {
          if (andConditions.length > 0) {
            query += " OR ";
          }
          query += `(${orConditions.join(" OR ")})`;
        }
      }
    }
    if (orderBy && Object.keys(orderBy).length > 0) {
      const ordering = Object.keys(orderBy).map((key) => `${mainTableAlias}.${key} ${orderBy[key]}`).join(", ");
      query += ` ORDER BY ${ordering}`;
    }
    query += ";";
    const result = await this.pool.query(query, whereValues);
    if (result.rows.length > 0) {
      const mappedResult = this.mapNullToUndefined(result.rows[0]);
      return mappedResult;
    } else {
      return null;
    }
  }
  async deleteFromTable({
    table,
    where
  }) {
    let query = `DELETE FROM ${table}`;
    const whereValues = [];
    if (where) {
      const andConditions = [];
      const orConditions = [];
      Object.keys(where).forEach((key) => {
        if (key !== "OR") {
          const condition = where[key];
          this.processCondition(key, condition, andConditions, whereValues);
        }
      });
      if (where.OR) {
        Object.keys(where.OR).forEach((key) => {
          const condition = where.OR[key];
          this.processCondition(key, condition, orConditions, whereValues);
        });
      }
      if (andConditions.length > 0 || orConditions.length > 0) {
        query += " WHERE ";
        if (andConditions.length > 0) {
          query += `(${andConditions.join(" AND ")})`;
        }
        if (orConditions.length > 0) {
          if (andConditions.length > 0) {
            query += " OR ";
          }
          query += `(${orConditions.join(" OR ")})`;
        }
      }
    }
    query += ";";
    await this.pool.query(query, whereValues);
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
