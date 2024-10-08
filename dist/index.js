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

// src/index.ts
var src_exports = {};
__export(src_exports, {
  default: () => src_default
});
module.exports = __toCommonJS(src_exports);

// src/Database.ts
var import_pg = __toESM(require("pg"));
var { Pool, Client } = import_pg.default;
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
  async updateIntoTable(tableName, dataDict, referenceColumn = "id") {
    const columns = Object.keys(dataDict).filter((key) => key !== referenceColumn);
    const values = columns.map((col) => dataDict[col]);
    const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(", ");
    const query = `
    UPDATE ${tableName}
    SET ${setClause}
    WHERE ${referenceColumn} = $${columns.length + 1};
  `;
    await this.pool.query(query, [...values, dataDict[referenceColumn]]);
  }
  async searchAll(table, fields = null) {
    let query;
    if (fields && fields.length > 0) {
      if (fields.length === 1) {
        query = `
          SELECT ${fields[0]}
          FROM ${table};
        `;
      } else {
        const selectedFields = fields.join(", ");
        query = `
          SELECT ${selectedFields}
          FROM ${table};
        `;
      }
    } else {
      query = `
        SELECT *
        FROM ${table};
      `;
    }
    const result = await this.pool.query(query);
    return result.rows;
  }
  async searchUniqueByField(table, field, value, fields = null) {
    let query;
    if (fields && fields.length > 0) {
      if (fields.length === 1) {
        query = `
          SELECT ${fields[0]}
          FROM ${table}
          WHERE ${field} = $1
          LIMIT 1;
        `;
      } else {
        const selectedFields = fields.join(", ");
        query = `
          SELECT ${selectedFields}
          FROM ${table}
          WHERE ${field} = $1
          LIMIT 1;
        `;
      }
    } else {
      query = `
        SELECT *
        FROM ${table}
        WHERE ${field} = $1
        LIMIT 1;
      `;
    }
    const result = await this.pool.query(query, [value]);
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
var Database_default = Database;

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
    const result = await this.db.query(
      `SELECT name FROM "_migrations"`
    );
    return result.map((row) => row.name);
  }
  async applyMigration(fileName, direction) {
    const filePath = (0, import_node_path.join)(this.migrationsPath, fileName);
    const fileContent = await (0, import_promises.readFile)(filePath, "utf-8");
    const [up, down] = fileContent.split("-- down");
    const sqlToExecute = direction === "up" ? up.replace("-- up", "") : down;
    try {
      await this.db.beginTransaction();
      await this.db.executeMigration(sqlToExecute);
      if (direction === "up") {
        await this.db.query(`INSERT INTO "_migrations" (name) VALUES ($1)`, [fileName]);
      } else {
        await this.db.query(`DELETE FROM "_migrations" WHERE name = $1`, [fileName]);
      }
      await this.db.commitTransaction();
    } catch (err) {
      console.error(`Erro ao aplicar migra\xE7\xE3o "${fileName}" (${direction}):`, err);
      await this.db.rollbackTransaction();
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
    var _a;
    const result = await this.db.query(
      `SELECT name FROM "_migrations" ORDER BY id DESC LIMIT 1`
    );
    const lastMigration = (_a = result[0]) == null ? void 0 : _a.name;
    if (!lastMigration) {
      console.log("Nenhuma migra\xE7\xE3o encontrada para reverter.");
      return;
    }
    console.log(`Revertendo a migra\xE7\xE3o: ${lastMigration}`);
    await this.applyMigration(lastMigration, "down");
    console.log(`Migra\xE7\xE3o ${lastMigration} revertida com sucesso!`);
  }
  async applyMigrationByName(name, direction) {
    try {
      const allMigrations = await (0, import_promises.readdir)(this.migrationsPath);
      const migrationFile = allMigrations.find(
        (file) => file.includes(`_${name.replace(/\s+/g, "_")}.sql`)
      );
      if (!migrationFile) {
        console.error(`Erro: Migra\xE7\xE3o com o nome "${name}" n\xE3o encontrada.`);
        return;
      }
      await this.applyMigration(migrationFile, direction);
      console.log(`Migra\xE7\xE3o "${migrationFile}" (${direction}) aplicada com sucesso.`);
    } catch (err) {
      console.error(`Erro ao buscar/aplicar migra\xE7\xE3o "${name}":`, err);
    }
  }
};
var migrationManager_default = MigrationManager;

// src/index.ts
var PgUtils = class {
  constructor(user, host, password, port, database, migrationsPath) {
    this.user = user;
    this.host = host;
    this.password = password;
    this.port = port;
    this.database = database;
    this.migrationsPath = migrationsPath;
    this.dbInstance = new Database_default(
      this.user,
      this.host,
      this.password,
      this.port,
      this.database
    );
    this.migrations = new migrationManager_default(this.migrationsPath, this.dbInstance);
  }
  async createAndConnectDatabase() {
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
  async revertLastMigration() {
    await this.migrations.initialize();
    await this.migrations.revertLastMigration();
  }
  async applyAllMigrations() {
    await this.migrations.initialize();
    await this.migrations.applyAllMigrations();
  }
  async applyMigrationByName(name, direction) {
    await this.migrations.initialize();
    await this.migrations.applyMigrationByName(name, direction);
  }
};
var src_default = PgUtils;
