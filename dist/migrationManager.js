"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/migrationManager.ts
var migrationManager_exports = {};
__export(migrationManager_exports, {
  default: () => migrationManager_default
});
module.exports = __toCommonJS(migrationManager_exports);
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
