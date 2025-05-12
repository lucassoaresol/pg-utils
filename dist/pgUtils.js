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

// src/pgUtils.ts
var pgUtils_exports = {};
__export(pgUtils_exports, {
  default: () => pgUtils_default
});
module.exports = __toCommonJS(pgUtils_exports);

// src/database.ts
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
    const formatCondition = (expression, isNot) => isNot ? `NOT (${expression})` : expression;
    const parseSimpleComparison = (column, value, isNot, conditionsArray) => {
      if (value === null) {
        conditionsArray.push(formatCondition(`${column} IS NULL`, isNot));
      } else if (Array.isArray(value)) {
        const placeholders = value.map((_, i) => `$${whereValues.length + i + 1}`).join(", ");
        conditionsArray.push(formatCondition(`${column} IN (${placeholders})`, isNot));
        whereValues.push(...value);
      } else {
        conditionsArray.push(
          formatCondition(`${column} = $${whereValues.length + 1}`, isNot)
        );
        whereValues.push(value);
      }
    };
    const parseModeComparison = (column, condition, conditionsArray) => {
      const { mode, value, is_not: isNot = false } = condition;
      if (mode === "ilike") {
        conditionsArray.push(
          formatCondition(`${column} ILIKE $${whereValues.length + 1}`, isNot)
        );
        whereValues.push(`%${value}%`);
      } else if (mode === "like") {
        conditionsArray.push(
          formatCondition(`${column} LIKE $${whereValues.length + 1}`, isNot)
        );
        whereValues.push(`%${value}%`);
      } else if (mode === "date") {
        conditionsArray.push(
          formatCondition(`DATE(${column}) = $${whereValues.length + 1}`, isNot)
        );
        whereValues.push(value);
      } else {
        parseSimpleComparison(column, value, isNot, conditionsArray);
      }
    };
    const parseRangeOperators = (column, condition, conditionsArray) => {
      const operators = {
        lt: "<",
        lte: "<=",
        gt: ">",
        gte: ">="
      };
      for (const [opKey, sqlOp] of Object.entries(operators)) {
        if (condition[opKey] !== void 0) {
          const condValue = condition[opKey];
          const isNot = typeof condValue === "object" && "is_not" in condValue ? condValue.is_not : false;
          const value = typeof condValue === "object" && "value" in condValue ? condValue.value : condValue;
          conditionsArray.push(
            formatCondition(`${column} ${sqlOp} $${whereValues.length + 1}`, isNot)
          );
          whereValues.push(value);
        }
      }
    };
    const processCondition = (key, condition, conditionsArray, alias) => {
      const column = alias && !key.includes(".") ? `${alias}.${key}` : key;
      if (condition === null || condition === void 0) {
        conditionsArray.push(`${column} IS NULL`);
      } else if (typeof condition === "object" && !Array.isArray(condition)) {
        const isNot = condition.is_not || false;
        if ("value" in condition && condition.mode) {
          parseModeComparison(column, condition, conditionsArray);
        } else if (["lt", "lte", "gt", "gte"].some((op) => op in condition)) {
          parseRangeOperators(column, condition, conditionsArray);
        } else {
          parseSimpleComparison(column, condition.value, isNot, conditionsArray);
        }
      } else {
        parseSimpleComparison(column, condition, false, conditionsArray);
      }
    };
    for (const [key, condition] of Object.entries(where)) {
      if (key !== "OR") {
        processCondition(key, condition, andConditions, mainTableAlias);
      }
    }
    if (where.OR) {
      for (const [key, condition] of Object.entries(where.OR)) {
        processCondition(key, condition, orConditions, mainTableAlias);
      }
    }
    let clause = "";
    if (andConditions.length > 0 || orConditions.length > 0) {
      clause += " WHERE ";
      if (andConditions.length > 0) {
        clause += `(${andConditions.join(" AND ")})`;
      }
      if (orConditions.length > 0) {
        if (andConditions.length > 0) clause += " OR ";
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
    const columns = Object.keys(dataDict);
    const values = columns.map(
      (col) => dataDict[col] === void 0 ? null : dataDict[col]
    );
    const setClause = columns.map((col, index) => `"${col}" = $${index + 1}`).join(", ");
    const { clause: whereClause, values: whereValues } = this.buildWhereClause(
      where,
      values
    );
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
      for (const join2 of joins) {
        const joinAlias = join2.alias || this.createAlias(join2.table, existingAliases);
        if (join2.alias) {
          existingAliases.add(join2.alias);
        }
        const joinType = join2.type || "INNER";
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
                    where: { "i.table_name": join2.table },
                    select: { "i.column_name AS column_name": true }
                  })
                );
              }
            }
          });
          const joinColumns = (await Promise.all(promisesColumns)).flat();
          selectedFields.push(
            ...joinColumns.map(
              (column) => `${joinAlias}.${column.column_name} AS ${joinAlias}_${column.column_name}`
            )
          );
        } else {
          const joinColumns = await this.findMany({
            table: "information_schema.columns",
            alias: "i",
            where: { "i.table_name": join2.table },
            select: { "i.column_name AS column_name": true }
          });
          selectedFields.push(
            ...joinColumns.map(
              (column) => `${joinAlias}.${column.column_name} AS ${joinAlias}_${column.column_name}`
            )
          );
        }
        const joinConditions = Object.keys(join2.on).map((key) => {
          const column = !key.includes(".") ? `${mainTableAlias}.${key}` : key;
          return `${column} = ${joinAlias}.${join2.on[key]}`;
        }).join(" AND ");
        query_aux += ` ${joinType} JOIN ${join2.table} AS ${joinAlias} ON ${joinConditions}`;
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
      for (const join2 of joins) {
        const joinAlias = join2.alias || this.createAlias(join2.table, existingAliases);
        if (join2.alias) {
          existingAliases.add(join2.alias);
        }
        const joinType = join2.type || "INNER";
        const joinConditions = Object.keys(join2.on).map((key) => {
          const column = !key.includes(".") ? `${mainTableAlias}.${key}` : key;
          return `${column} = ${joinAlias}.${join2.on[key]}`;
        }).join(" AND ");
        query_aux += ` ${joinType} JOIN ${join2.table} AS ${joinAlias} ON ${joinConditions}`;
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

// src/migrationManager.ts
var import_promises = require("fs/promises");
var import_node_path = require("path");
var MigrationManager = class {
  constructor(migrationsPath, db) {
    this.migrationsPath = migrationsPath;
    this.db = db;
  }
  async initialize() {
    await this.db.connectPool();
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS "_migrations" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }
  async getAppliedMigrations() {
    const result = await this.db.findMany({
      table: "_migrations",
      select: { name: true }
    });
    return result.map((row) => row.name);
  }
  async applyMigration(fileName, direction) {
    const filePath = (0, import_node_path.join)(this.migrationsPath, fileName);
    const fileContent = await (0, import_promises.readFile)(filePath, "utf-8");
    const [up, down] = fileContent.split("-- down");
    const sqlToExecute = direction === "up" ? up.replace("-- up", "") : down;
    try {
      await this.db.query("BEGIN");
      await this.db.query(sqlToExecute);
      if (direction === "up") {
        await this.db.insertIntoTable({
          table: "_migrations",
          dataDict: { name: fileName }
        });
      } else {
        await this.db.deleteFromTable({
          table: "_migrations",
          where: { name: fileName }
        });
      }
      await this.db.query("COMMIT");
    } catch (err) {
      console.error(`Erro ao aplicar migra\xE7\xE3o "${fileName}" (${direction}):`, err);
      await this.db.query("ROLLBACK");
      throw err;
    }
  }
  async applyAllMigrations() {
    const appliedMigrations = await this.getAppliedMigrations();
    const allMigrations = await (0, import_promises.readdir)(this.migrationsPath);
    const pendingMigrations = allMigrations.filter(
      (file) => !appliedMigrations.includes(file)
    );
    for (const migration of pendingMigrations) {
      console.log(`Aplicando migra\xE7\xE3o: ${migration}`);
      await this.applyMigration(migration, "up");
    }
    console.log("Todas as migra\xE7\xF5es foram aplicadas com sucesso!");
  }
  async revertLastMigration() {
    const result = await this.db.findFirst({
      table: "_migrations",
      select: { name: true },
      orderBy: { id: "DESC" }
    });
    const lastMigration = result?.name;
    if (!lastMigration) {
      console.log("Nenhuma migra\xE7\xE3o encontrada para reverter.");
      return;
    }
    console.log(`Revertendo a migra\xE7\xE3o: ${lastMigration}`);
    await this.applyMigration(lastMigration, "down");
    console.log(`Migra\xE7\xE3o ${lastMigration} revertida com sucesso!`);
  }
  async revertAllMigrations() {
    const results = await this.db.findMany({
      table: "_migrations",
      select: { name: true },
      orderBy: { id: "DESC" }
    });
    if (results.length === 0) {
      console.log("Nenhuma migra\xE7\xE3o encontrada para reverter.");
      return;
    }
    console.log("Iniciando a revers\xE3o de todas as migra\xE7\xF5es...");
    for (const migration of results) {
      console.log(`Revertendo a migra\xE7\xE3o: ${migration.name}`);
      await this.applyMigration(migration.name, "down");
      console.log(`Migra\xE7\xE3o ${migration.name} revertida com sucesso!`);
    }
    console.log("Todas as migra\xE7\xF5es foram revertidas com sucesso!");
  }
};
var migrationManager_default = MigrationManager;

// src/pgUtils.ts
var PgUtils = class {
  constructor(user, host, password, port, database, migrationsPath, manageMigrations) {
    this.user = user;
    this.host = host;
    this.password = password;
    this.port = port;
    this.database = database;
    this.migrationsPath = migrationsPath;
    this.manageMigrations = manageMigrations;
    this.dbInstance = new database_default(
      this.user,
      this.host,
      this.password,
      this.port,
      this.database
    );
    this.migrations = new migrationManager_default(this.migrationsPath, this.dbInstance);
  }
  dbInstance;
  migrations;
  async createAndConnectDatabase() {
    if (!this.manageMigrations) {
      throw new Error(
        "O gerenciamento de migra\xE7\xF5es n\xE3o est\xE1 ativado. A cria\xE7\xE3o do banco de dados n\xE3o \xE9 permitida."
      );
    }
    try {
      await this.dbInstance.createDatabase();
      console.log(`Banco de dados "${this.database}" criado e pool inicializado.`);
    } catch (err) {
      console.error("Erro ao criar o banco de dados:", err);
    }
  }
  getClientDatabase() {
    return this.dbInstance;
  }
  getManageMigrations() {
    return this.manageMigrations;
  }
  async getMigrations() {
    if (this.manageMigrations) {
      try {
        await this.migrations.initialize();
        console.log("Gerenciamento de migra\xE7\xF5es iniciado.");
        return this.migrations;
      } catch (err) {
        console.error("Erro ao inicializar migra\xE7\xF5es:", err);
      }
    } else {
      console.log("Gerenciamento de migra\xE7\xF5es est\xE1 desativado.");
    }
  }
};
var pgUtils_default = PgUtils;
