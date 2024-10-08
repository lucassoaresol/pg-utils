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

// src/migrationCreate.ts
var migrationCreate_exports = {};
__export(migrationCreate_exports, {
  default: () => migrationCreate_default
});
module.exports = __toCommonJS(migrationCreate_exports);
var import_promises = require("fs/promises");
var import_node_path = require("path");
var MigrationCreate = class {
  constructor(migrationsPath) {
    this.migrationsPath = migrationsPath;
  }
  async createMigrationFile(name) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[-:T.Z]/g, "");
    const fileName = `${timestamp}_${name.replace(/\s+/g, "_")}.sql`;
    const filePath = (0, import_node_path.join)(this.migrationsPath, fileName);
    const fileContent = `-- up

-- down
`;
    try {
      await (0, import_promises.writeFile)(filePath, fileContent);
      console.log(`Migra\xE7\xE3o criada com sucesso: ${filePath}`);
    } catch (err) {
      console.error("Erro ao criar a migra\xE7\xE3o:", err);
    }
  }
};
var migrationCreate_default = MigrationCreate;
