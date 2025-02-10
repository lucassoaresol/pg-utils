#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// src/cli.ts
var import_promises5 = require("fs/promises");
var import_node_path5 = require("path");
var import_commander = require("commander");

// src/clientsManager.ts
var import_promises2 = require("fs/promises");
var import_node_path2 = require("path");

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
  buildWhereClause(where, values, mainTableAlias) {
    if (!where) return { clause: "", values: [] };
    const andConditions = [];
    const orConditions = [];
    const whereValues = values ? [...values] : [];
    const processCondition = (key, condition, conditionsArray, alias) => {
      const column = alias && !key.includes(".") ? `${alias}.${key}` : key;
      if (condition === null || condition === void 0) {
        conditionsArray.push(`${column} IS NULL`);
      } else if (typeof condition === "object") {
        if ("value" in condition && "mode" in condition) {
          if (condition.mode === "not") {
            if (condition.value === null) {
              conditionsArray.push(`${column} IS NOT NULL`);
            } else {
              conditionsArray.push(`${column} != $${whereValues.length + 1}`);
              whereValues.push(condition.value);
            }
          } else if (condition.mode === "ilike") {
            conditionsArray.push(`${column} ILIKE $${whereValues.length + 1}`);
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
    offset
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
      selectedFields.push(
        ...Object.keys(select).filter((key) => select[key] === true).map((key) => {
          if (key.includes(" AS ")) {
            const keySplit = key.split(" AS ");
            const originalKey = keySplit[0];
            const keyAlias = keySplit.at(-1);
            if (!originalKey.includes(".")) {
              return `${mainTableAlias}.${originalKey} AS ${keyAlias}`;
            } else {
              return `${originalKey} AS ${keyAlias}`;
            }
          } else {
            if (!key.includes(".")) {
              return `${mainTableAlias}.${key}`;
            }
            const slSplit = key.split(".");
            const slAlias = slSplit[0];
            if (slAlias !== mainTableAlias) {
              return `${key} AS ${slAlias}_${slSplit.at(-1)}`;
            }
          }
          return key;
        })
      );
    } else {
      selectedFields.push(`${mainTableAlias}.*`);
    }
    if (joins && joins.length > 0) {
      for (const join4 of joins) {
        const joinAlias = join4.alias || this.createAlias(join4.table, existingAliases);
        if (join4.alias) {
          existingAliases.add(join4.alias);
        }
        const joinType = join4.type || "INNER";
        if (!select) {
          const joinColumns = await this.findMany({
            table: "information_schema.columns",
            alias: "i",
            where: { table_name: join4.table },
            select: { column_name: true }
          });
          selectedFields.push(
            ...joinColumns.map(
              (column) => `${joinAlias}.${column.column_name} AS ${joinAlias}_${column.column_name}`
            )
          );
        }
        const joinConditions = Object.keys(join4.on).map((key) => {
          const column = !key.includes(".") ? `${mainTableAlias}.${key}` : key;
          return `${column} = ${joinAlias}.${join4.on[key]}`;
        }).join(" AND ");
        query_aux += ` ${joinType} JOIN ${join4.table} AS ${joinAlias} ON ${joinConditions}`;
      }
    }
    query = `SELECT ${selectedFields.join(", ")} FROM ${table} AS ${mainTableAlias} ${query_aux}`;
    const { clause: whereClause, values: whereValues } = this.buildWhereClause(
      where,
      void 0,
      mainTableAlias
    );
    query += whereClause;
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
    var _a;
    let query = "";
    let query_aux = "";
    const existingAliases = /* @__PURE__ */ new Set();
    const mainTableAlias = alias || this.createAlias(table, existingAliases);
    if (alias) {
      existingAliases.add(alias);
    }
    if (joins && joins.length > 0) {
      for (const join4 of joins) {
        const joinAlias = join4.alias || this.createAlias(join4.table, existingAliases);
        if (join4.alias) {
          existingAliases.add(join4.alias);
        }
        const joinType = join4.type || "INNER";
        const joinConditions = Object.keys(join4.on).map((key) => {
          const column = !key.includes(".") ? `${mainTableAlias}.${key}` : key;
          return `${column} = ${joinAlias}.${join4.on[key]}`;
        }).join(" AND ");
        query_aux += ` ${joinType} JOIN ${join4.table} AS ${joinAlias} ON ${joinConditions}`;
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
    return ((_a = result.rows[0]) == null ? void 0 : _a.total) ? parseInt(result.rows[0].total, 10) : 0;
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
    const lastMigration = result == null ? void 0 : result.name;
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

// src/clientsManager.ts
var ClientsManager = class _ClientsManager {
  constructor() {
    this.clientsMap = /* @__PURE__ */ new Map();
    this.configFilePath = (0, import_node_path2.resolve)("pg-utils.json");
  }
  static async getInstance() {
    if (!_ClientsManager.instance) {
      _ClientsManager.instance = new _ClientsManager();
    }
    await _ClientsManager.instance.loadClientsConfig();
    return _ClientsManager.instance;
  }
  async loadClientsConfig() {
    try {
      const configFileContent = await (0, import_promises2.readFile)(this.configFilePath, "utf-8");
      const config = JSON.parse(configFileContent);
      config.forEach((client) => {
        const pgUtilsInstance = new pgUtils_default(
          client.user,
          client.host,
          client.password,
          client.port,
          client.database,
          client.migrationsDir,
          client.manageMigrations
        );
        this.clientsMap.set(client.id, pgUtilsInstance);
      });
    } catch (error) {
      console.error("Erro ao carregar as configura\xE7\xF5es dos clientes:", error.message);
      throw error;
    }
  }
  getClientById(id) {
    return this.clientsMap.get(id);
  }
  getAllClients() {
    return this.clientsMap;
  }
  getClientsWithManageMigrations() {
    const clientsWithMigrations = /* @__PURE__ */ new Map();
    this.clientsMap.forEach((client, id) => {
      if (client.getManageMigrations()) {
        clientsWithMigrations.set(id, client);
      }
    });
    return clientsWithMigrations;
  }
};
var clientsManager_default = ClientsManager;

// src/diagramGenerator.ts
var import_promises3 = require("fs/promises");
var import_node_path3 = require("path");
async function getAllFilesInDirectory(directory) {
  let files = [];
  const items = await (0, import_promises3.readdir)(directory, { withFileTypes: true });
  for (const item of items) {
    const fullPath = (0, import_node_path3.join)(directory, item.name);
    if (item.isDirectory()) {
      const subFiles = await getAllFilesInDirectory(fullPath);
      files = files.concat(subFiles);
    } else if (item.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}
function formatColumnConstraints(constraints) {
  let constraintElements = constraints.replace(/\bPRIMARY KEY\b/g, "PK").replace(/\bDEFAULT\b/g, "DEFAULT:").split(/\s+/);
  let formattedConstraints = constraintElements.join(", ");
  formattedConstraints = formattedConstraints.replace("NOT,", "NOT").replace("DEFAULT:,", "DEFAULT:");
  formattedConstraints = formattedConstraints.replace(
    /DEFAULT:\s?([^\s,]+)/,
    'DEFAULT: "$1"'
  );
  return `[${formattedConstraints}]`;
}
function parseForeignKeyReference(line, tableName) {
  const fkMatch = line.match(
    /CONSTRAINT "([\w]+)" FOREIGN KEY \("([\w]+)"\) REFERENCES "([\w]+)" \("([\w]+)"\)( ON DELETE (CASCADE|SET NULL|RESTRICT|NO ACTION))?( ON UPDATE (CASCADE|SET NULL|RESTRICT|NO ACTION))?/
  );
  if (fkMatch) {
    const [, , columnName, refTable, refColumn, , deleteAction, , updateAction] = fkMatch;
    return `Ref: ${tableName}.${columnName} > ${refTable}.${refColumn} [DELETE: ${deleteAction}, UPDATE: ${updateAction}]
`;
  }
  return "";
}
function parseSQLToDbDiagramFormat(fileContent) {
  const createTableRegex = /CREATE TABLE "([\w]+)" \(([\s\S]*?)\);/g;
  let match;
  let result = "";
  let referencesSection = "";
  while ((match = createTableRegex.exec(fileContent)) !== null) {
    const tableName = match[1];
    let indexes = "";
    const columnsDefinitions = match[2].trim().split(",\n").map((line) => {
      line = line.trim();
      if (line.includes("CONSTRAINT") && line.includes("_pkey")) {
        const pkMatch = line.match(
          /CONSTRAINT "([\w]+)" PRIMARY KEY \(([\w",\s]+)\)/
        );
        if (pkMatch) {
          const pkColumns = pkMatch[2].replace(/["\s]/g, "").split(",").join(", ");
          indexes += `  indexes {
    (${pkColumns}) [pk]
  }
`;
        }
        return "";
      }
      if (line.includes("CONSTRAINT") && line.includes("UNIQUE")) {
        const uniqueMatch = line.match(/CONSTRAINT "([\w]+)" UNIQUE \(([\w",\s]+)\)/);
        if (uniqueMatch) {
          const uniqueColumns = uniqueMatch[2].replace(/["\s]/g, "").split(",").join(", ");
          indexes += `  indexes {
    (${uniqueColumns}) [unique]
  }
`;
        }
        return "";
      }
      if (line.includes("CONSTRAINT") && line.includes("_fkey")) {
        referencesSection += parseForeignKeyReference(line, tableName);
        return "";
      }
      const [columnName, columnType, ...rest] = line.split(/\s+/);
      const formattedColumnName = columnName.replace(/["]/g, "");
      const formattedColumnType = columnType.replace(/["]/g, "");
      const constraints = formatColumnConstraints(rest.join(" ").replace(/["]/g, ""));
      return `  "${formattedColumnName}" ${formattedColumnType} ${constraints}`;
    }).filter(Boolean).join("\n");
    result += `Table ${tableName} {
${columnsDefinitions}
${indexes}}

`;
  }
  return referencesSection ? `${result.trim()}

${referencesSection.trim()}` : result.trim();
}
async function generateDbDiagramFile(migrationsDirectoryPath, diagramOutputFile) {
  try {
    const migrationFiles = await getAllFilesInDirectory(migrationsDirectoryPath);
    const fileContents = await Promise.all(
      migrationFiles.map((filePath) => (0, import_promises3.readFile)(filePath, "utf-8"))
    );
    const dbDiagramContent = fileContents.map((fileContent) => parseSQLToDbDiagramFormat(fileContent)).filter(Boolean).join("\n\n");
    await (0, import_promises3.writeFile)(diagramOutputFile, dbDiagramContent.trim());
    console.log(
      `Arquivo ${diagramOutputFile} gerado com sucesso no formato dbdiagram.io!`
    );
  } catch (error) {
    console.error("Erro ao gerar o arquivo dbdiagram:", error);
  }
}

// src/migrationCreate.ts
var import_promises4 = require("fs/promises");
var import_node_path4 = require("path");
var MigrationCreate = class {
  constructor(migrationsPath) {
    this.migrationsPath = migrationsPath;
  }
  async createMigrationFile(name) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[-:T.Z]/g, "");
    const fileName = `${timestamp}_${name.replace(/\s+/g, "_")}.sql`;
    const filePath = (0, import_node_path4.join)(this.migrationsPath, fileName);
    const fileContent = `-- up

-- down
`;
    try {
      await (0, import_promises4.writeFile)(filePath, fileContent);
      console.log(`Migra\xE7\xE3o criada com sucesso: ${filePath}`);
    } catch (err) {
      console.error("Erro ao criar a migra\xE7\xE3o:", err);
    }
  }
};
var migrationCreate_default = MigrationCreate;

// src/cli.ts
var program = new import_commander.Command();
var migrationsDir = (0, import_node_path5.resolve)("migrations");
var configFilePath = (0, import_node_path5.resolve)("pg-utils.json");
var gitignorePath = (0, import_node_path5.resolve)(".gitignore");
async function handleMigration(dbClient, options) {
  try {
    if (options.down) {
      if (options.all) {
        console.log("Revertendo todas as migra\xE7\xF5es aplicadas.");
        await dbClient.revertAllMigrations();
      } else {
        console.log("Revertendo a \xFAltima migra\xE7\xE3o aplicada.");
        await dbClient.revertLastMigration();
      }
    }
    if (!options.create && !options.down && !options.up) {
      console.log("Aplicando todas as migra\xE7\xF5es pendentes.");
      await dbClient.applyAllMigrations();
    }
  } catch (err) {
    console.error("Erro ao gerenciar as migra\xE7\xF5es:", err);
  }
}
program.command("init").description(
  "Inicializa o projeto criando o diret\xF3rio de migra\xE7\xF5es e o arquivo de configura\xE7\xE3o pg-utils.json, al\xE9m de adicionar o arquivo de configura\xE7\xE3o ao .gitignore."
).action(async () => {
  try {
    await (0, import_promises5.mkdir)(migrationsDir, { recursive: true });
    console.log(`Diret\xF3rio "${migrationsDir}" criado com sucesso.`);
    const configContent = [
      {
        id: "development",
        user: "dev_user",
        host: "localhost",
        password: "dev_password",
        port: 5432,
        database: "dev_database",
        migrationsDir: "migrations",
        manageMigrations: true
      },
      {
        id: "production",
        user: "prod_user",
        host: "prod-db.example.com",
        password: "prod_password",
        port: 5432,
        database: "prod_database",
        migrationsDir: "migrations",
        manageMigrations: false
      }
    ];
    try {
      await (0, import_promises5.access)(configFilePath);
      console.log(`Arquivo "${configFilePath}" j\xE1 existe.`);
    } catch {
      await (0, import_promises5.writeFile)(
        configFilePath,
        JSON.stringify(configContent, null, 2),
        "utf-8"
      );
      console.log(`Arquivo de configura\xE7\xE3o "${configFilePath}" criado com sucesso.`);
    }
    try {
      await (0, import_promises5.access)(gitignorePath);
      const gitignoreContent = await (0, import_promises5.readFile)(gitignorePath, "utf-8");
      if (!gitignoreContent.includes("pg-utils.json")) {
        await (0, import_promises5.appendFile)(gitignorePath, "pg-utils.json\n");
        console.log(`Arquivo "${configFilePath}" adicionado ao .gitignore.`);
      } else {
        console.log(`"${configFilePath}" j\xE1 est\xE1 no .gitignore.`);
      }
    } catch {
      await (0, import_promises5.writeFile)(gitignorePath, "pg-utils.json\n", "utf-8");
      console.log(`Arquivo ".gitignore" criado com "${configFilePath}".`);
    }
  } catch (error) {
    console.error("Erro ao inicializar o projeto:", error.message);
  }
});
program.command("add").description("Adiciona um novo cliente ao arquivo de configura\xE7\xE3o pg-utils.json").requiredOption("-i, --id <id>", "ID do cliente").requiredOption("-u, --user <user>", "Usu\xE1rio do banco de dados").requiredOption("-h, --host <host>", "Host do banco de dados").requiredOption("-p, --password <password>", "Senha do banco de dados").requiredOption("-P, --port <port>", "Porta do banco de dados", "5432").requiredOption("-d, --database <database>", "Nome do banco de dados").option("-m, --manageMigrations", "Ativar gerenciamento de migra\xE7\xF5es", false).action(async (options) => {
  const newClientConfig = {
    id: options.id,
    user: options.user,
    host: options.host,
    password: options.password,
    port: parseInt(options.port, 10),
    database: options.database,
    migrationsDir: "migrations",
    manageMigrations: options.manageMigrations || false
  };
  try {
    await (0, import_promises5.access)(configFilePath);
    const configFileContent = await (0, import_promises5.readFile)(configFilePath, "utf-8");
    const config = JSON.parse(configFileContent);
    const idExists = config.some((client) => client.id === newClientConfig.id);
    if (idExists) {
      console.error(`Erro: O cliente com ID "${newClientConfig.id}" j\xE1 existe.`);
      process.exit(1);
    }
    config.push(newClientConfig);
    await (0, import_promises5.writeFile)(configFilePath, JSON.stringify(config, null, 2), "utf-8");
    console.log(`Cliente "${newClientConfig.id}" adicionado com sucesso.`);
  } catch (error) {
    if (error.code === "ENOENT") {
      console.error(
        'Erro: O arquivo de configura\xE7\xE3o "pg-utils.json" n\xE3o existe. Por favor, execute o comando "init" primeiro.'
      );
    } else {
      console.error("Erro ao adicionar cliente:", error.message);
    }
  }
});
program.command("create").description(
  "Cria o banco de dados para um cliente espec\xEDfico ou para todos os clientes se nenhum ID for fornecido."
).option("-i, --id <id>", "ID do cliente").action(async (options) => {
  try {
    const clientsManager = await clientsManager_default.getInstance();
    if (options.id) {
      const dbClient = clientsManager.getClientById(options.id);
      if (dbClient) {
        try {
          await dbClient.createAndConnectDatabase();
          console.log(
            `Banco de dados para o cliente "${options.id}" criado/conectado com sucesso.`
          );
        } catch (err) {
          console.error(
            `Erro ao criar/conectar banco de dados para o cliente "${options.id}":`,
            err.message
          );
        }
      } else {
        console.error(`Cliente com ID "${options.id}" n\xE3o encontrado.`);
      }
    } else {
      const allClients = clientsManager.getClientsWithManageMigrations();
      for (const [id, dbClient] of allClients.entries()) {
        try {
          await dbClient.createAndConnectDatabase();
          console.log(
            `Banco de dados para o cliente "${id}" criado/conectado com sucesso.`
          );
        } catch (err) {
          console.error(
            `Erro ao criar/conectar banco de dados para o cliente "${id}":`,
            err.message
          );
        }
      }
    }
  } catch (err) {
    console.error("Erro ao executar comando:", err.message);
  }
});
program.command("migrate").description("Gerencia as migra\xE7\xF5es do banco de dados").option("-c, --create <name...>", "Cria uma nova migra\xE7\xE3o com o nome fornecido").option("-d, --down", "Reverte a \xFAltima migra\xE7\xE3o aplicada").option("-a, --all", "Aplica a a\xE7\xE3o (down) para todas as migra\xE7\xF5es").option("-i, --id <id>", "ID do cliente").action(async (options) => {
  if (options.create) {
    const name = options.create.join(" ");
    const migrate = new migrationCreate_default(migrationsDir);
    await migrate.createMigrationFile(name);
    console.log(`Migra\xE7\xE3o "${name}" criada com sucesso`);
  } else {
    const clientsManager = await clientsManager_default.getInstance();
    if (options.id) {
      const dbClient = clientsManager.getClientById(options.id);
      if (!dbClient) {
        console.error(`Cliente com ID "${options.id}" n\xE3o encontrado.`);
        process.exit(1);
      }
      const migrations = await dbClient.getMigrations();
      if (!migrations) {
        console.log("Gerenciamento de migra\xE7\xF5es n\xE3o est\xE1 ativado para este cliente.");
        process.exit(1);
      }
      await handleMigration(migrations, options);
    } else {
      const allClients = clientsManager.getClientsWithManageMigrations();
      for (const [id, dbClient] of allClients.entries()) {
        console.log(`Aplicando migra\xE7\xF5es para o cliente: ${id}`);
        const migrations = await dbClient.getMigrations();
        await handleMigration(migrations, options);
      }
    }
  }
  process.exit(0);
});
program.command("diagram").description(
  "Gera um diagrama do banco de dados com base nas migra\xE7\xF5es e salva no formato dbdiagram.io"
).option(
  "-o, --output <file>",
  "Caminho do arquivo de sa\xEDda do diagrama (padr\xE3o: dbdiagram.txt)",
  "dbdiagram.txt"
).action(async (options) => {
  const outputFile = (0, import_node_path5.resolve)(options.output);
  options.output || (0, import_node_path5.resolve)("dbdiagram.txt");
  try {
    await generateDbDiagramFile(migrationsDir, outputFile);
    console.log(`Diagrama gerado com sucesso no arquivo: ${outputFile}`);
  } catch (error) {
    console.error("Erro ao gerar o diagrama:", error.message);
  }
});
program.parse();
