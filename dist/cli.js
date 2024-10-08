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
var import_promises4 = require("fs/promises");
var import_node_path4 = require("path");
var import_commander = require("commander");

// src/clientsManager.ts
var import_promises2 = require("fs/promises");
var import_node_path2 = require("path");

// src/database.ts
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

// src/pgUtils.ts
var PgUtils = class {
  constructor(user, host, password, port, database, migrationsPath) {
    this.user = user;
    this.host = host;
    this.password = password;
    this.port = port;
    this.database = database;
    this.migrationsPath = migrationsPath;
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
      await _ClientsManager.instance.loadClientsConfig();
    }
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
          client.migrationsDir
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
};
var clientsManager_default = ClientsManager;

// src/migrationCreate.ts
var import_promises3 = require("fs/promises");
var import_node_path3 = require("path");
var MigrationCreate = class {
  constructor(migrationsPath) {
    this.migrationsPath = migrationsPath;
  }
  async createMigrationFile(name) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[-:T.Z]/g, "");
    const fileName = `${timestamp}_${name.replace(/\s+/g, "_")}.sql`;
    const filePath = (0, import_node_path3.join)(this.migrationsPath, fileName);
    const fileContent = `-- up

-- down
`;
    try {
      await (0, import_promises3.writeFile)(filePath, fileContent);
      console.log(`Migra\xE7\xE3o criada com sucesso: ${filePath}`);
    } catch (err) {
      console.error("Erro ao criar a migra\xE7\xE3o:", err);
    }
  }
};
var migrationCreate_default = MigrationCreate;

// src/cli.ts
var program = new import_commander.Command();
var migrationsDir = (0, import_node_path4.resolve)("migrations");
var configFilePath = (0, import_node_path4.resolve)("pg-utils.json");
var gitignorePath = (0, import_node_path4.resolve)(".gitignore");
async function handleMigration(dbClient, options) {
  try {
    if (options.down) {
      if (typeof options.down === "string") {
        console.log(
          `Revertendo a migra\xE7\xE3o espec\xEDfica: "${options.down}" para o cliente ${dbClient}`
        );
        await dbClient.applyMigrationByName(options.down, "down");
      } else {
        console.log("Revertendo a \xFAltima migra\xE7\xE3o aplicada.");
        await dbClient.revertLastMigration();
      }
    }
    if (options.up) {
      console.log(
        `Aplicando a migra\xE7\xE3o espec\xEDfica: "${options.up}" para o cliente ${dbClient}`
      );
      await dbClient.applyMigrationByName(options.up, "up");
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
    await (0, import_promises4.mkdir)(migrationsDir, { recursive: true });
    console.log(`Diret\xF3rio "${migrationsDir}" criado com sucesso.`);
    const configContent = [
      {
        id: "development",
        user: "dev_user",
        host: "localhost",
        password: "dev_password",
        port: 5432,
        database: "dev_database",
        migrationsDir: "migrations"
      },
      {
        id: "production",
        user: "prod_user",
        host: "prod-db.example.com",
        password: "prod_password",
        port: 5432,
        database: "prod_database",
        migrationsDir: "migrations"
      }
    ];
    try {
      await (0, import_promises4.access)(configFilePath);
      console.log(`Arquivo "${configFilePath}" j\xE1 existe.`);
    } catch {
      await (0, import_promises4.writeFile)(
        configFilePath,
        JSON.stringify(configContent, null, 2),
        "utf-8"
      );
      console.log(`Arquivo de configura\xE7\xE3o "${configFilePath}" criado com sucesso.`);
    }
    try {
      await (0, import_promises4.access)(gitignorePath);
      const gitignoreContent = await (0, import_promises4.readFile)(gitignorePath, "utf-8");
      if (!gitignoreContent.includes("pg-utils.json")) {
        await (0, import_promises4.appendFile)(gitignorePath, "pg-utils.json\n");
        console.log(`Arquivo "${configFilePath}" adicionado ao .gitignore.`);
      } else {
        console.log(`"${configFilePath}" j\xE1 est\xE1 no .gitignore.`);
      }
    } catch {
      await (0, import_promises4.writeFile)(gitignorePath, "pg-utils.json\n", "utf-8");
      console.log(`Arquivo ".gitignore" criado com "${configFilePath}".`);
    }
  } catch (error) {
    console.error("Erro ao inicializar o projeto:", error.message);
  }
});
program.command("add").description("Adiciona um novo cliente ao arquivo de configura\xE7\xE3o pg-utils.json").requiredOption("-i, --id <id>", "ID do cliente").requiredOption("-u, --user <user>", "Usu\xE1rio do banco de dados").requiredOption("-h, --host <host>", "Host do banco de dados").requiredOption("-p, --password <password>", "Senha do banco de dados").requiredOption("-P, --port <port>", "Porta do banco de dados", "5432").requiredOption("-d, --database <database>", "Nome do banco de dados").action(async (options) => {
  const newClientConfig = {
    id: options.id,
    user: options.user,
    host: options.host,
    password: options.password,
    port: parseInt(options.port, 10),
    database: options.database,
    migrationsDir: "migrations"
  };
  try {
    await (0, import_promises4.access)(configFilePath);
    const configFileContent = await (0, import_promises4.readFile)(configFilePath, "utf-8");
    const config = JSON.parse(configFileContent);
    const idExists = config.some((client) => client.id === newClientConfig.id);
    if (idExists) {
      console.error(`Erro: O cliente com ID "${newClientConfig.id}" j\xE1 existe.`);
      process.exit(1);
    }
    config.push(newClientConfig);
    await (0, import_promises4.writeFile)(configFilePath, JSON.stringify(config, null, 2), "utf-8");
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
      const allClients = clientsManager.getAllClients();
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
program.command("migrate").description("Gerencia as migra\xE7\xF5es do banco de dados").option("-c, --create <name>", "Cria uma nova migra\xE7\xE3o com o nome fornecido").option("-d, --down <name>", "Reverte a \xFAltima migra\xE7\xE3o aplicada").option("-u, --up <name>", "Aplicar uma migra\xE7\xE3o especifica").option("-i, --id <id>", "ID do cliente").action(async (options) => {
  if (options.create) {
    const migrate = new migrationCreate_default(migrationsDir);
    await migrate.createMigrationFile(options.create);
    console.log(`Migra\xE7\xE3o "${options.create}" criada com sucesso`);
  } else {
    const clientsManager = await clientsManager_default.getInstance();
    if (options.id) {
      const dbClient = clientsManager.getClientById(options.id);
      if (!dbClient) {
        console.error(`Cliente com ID "${options.id}" n\xE3o encontrado.`);
        process.exit(1);
      }
      await handleMigration(dbClient, options);
    } else {
      const allClients = clientsManager.getAllClients();
      for (const [id, dbClient] of allClients.entries()) {
        console.log(`Aplicando migra\xE7\xF5es para o cliente: ${id}`);
        await handleMigration(dbClient, options);
      }
    }
  }
  process.exit(0);
});
program.parse();
