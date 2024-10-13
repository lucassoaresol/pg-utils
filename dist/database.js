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
var import_pg = __toESM(require("pg"));
var { Pool, Client } = import_pg.default;
function processCondition(key, condition, conditionsArray, whereValues) {
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
var Database = class {
  constructor(user, host, password, port, database) {
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
  async insertIntoTable(tableName, dataDict, returningColumn = "id") {
    const columns = Object.keys(dataDict);
    const values = columns.map((col) => dataDict[col]);
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
    const query = `
      INSERT INTO ${tableName} (${columns.join(", ")})
      VALUES (${placeholders})
      RETURNING ${returningColumn};
    `;
    const result = await this.pool.query(query, values);
    return result.rows[0][returningColumn];
  }
  async updateIntoTable({
    table,
    dataDict,
    where
  }) {
    const columns = Object.keys(dataDict);
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
          processCondition(key, condition, andConditions, whereValues);
        }
      });
      if (where.OR) {
        Object.keys(where.OR).forEach((key) => {
          const condition = where.OR[key];
          processCondition(key, condition, orConditions, whereValues);
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
    where
  }) {
    let query = "";
    const whereValues = [];
    if (select && Object.keys(select).length > 0) {
      const selectedFields = Object.keys(select).filter((key) => select[key] === true).join(", ");
      query = selectedFields.length > 0 ? `SELECT ${selectedFields} FROM ${table}` : `SELECT * FROM ${table}`;
    } else {
      query = `SELECT * FROM ${table}`;
    }
    if (where) {
      const andConditions = [];
      const orConditions = [];
      Object.keys(where).forEach((key) => {
        if (key !== "OR") {
          const condition = where[key];
          processCondition(key, condition, andConditions, whereValues);
        }
      });
      if (where.OR) {
        Object.keys(where.OR).forEach((key) => {
          const condition = where.OR[key];
          processCondition(key, condition, orConditions, whereValues);
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
      const ordering = Object.keys(orderBy).map((key) => `${key} ${orderBy[key]}`).join(", ");
      query += ` ORDER BY ${ordering}`;
    }
    query += ";";
    const result = await this.pool.query(query, whereValues);
    return result.rows;
  }
  async findFirst({
    table,
    orderBy,
    select,
    where
  }) {
    let query = "";
    const whereValues = [];
    if (select && Object.keys(select).length > 0) {
      const selectedFields = Object.keys(select).filter((key) => select[key] === true).join(", ");
      query = selectedFields.length > 0 ? `SELECT ${selectedFields} FROM ${table}` : `SELECT * FROM ${table}`;
    } else {
      query = `SELECT * FROM ${table}`;
    }
    if (where) {
      const andConditions = [];
      const orConditions = [];
      Object.keys(where).forEach((key) => {
        if (key !== "OR") {
          const condition = where[key];
          processCondition(key, condition, andConditions, whereValues);
        }
      });
      if (where.OR) {
        Object.keys(where.OR).forEach((key) => {
          const condition = where.OR[key];
          processCondition(key, condition, orConditions, whereValues);
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
      const ordering = Object.keys(orderBy).map((key) => `${key} ${orderBy[key]}`).join(", ");
      query += ` ORDER BY ${ordering}`;
    }
    query += ";";
    const result = await this.pool.query(query, whereValues);
    if (result.rows.length > 0) {
      return result.rows[0];
    } else {
      return null;
    }
  }
  async deleteFromTable(tableName, id, idColumn = "id") {
    const query = `
      DELETE FROM ${tableName}
      WHERE ${idColumn} = $1;
    `;
    await this.pool.query(query, [id]);
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
