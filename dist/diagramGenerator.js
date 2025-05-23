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

// src/diagramGenerator.ts
var diagramGenerator_exports = {};
__export(diagramGenerator_exports, {
  generateDbDiagramFile: () => generateDbDiagramFile
});
module.exports = __toCommonJS(diagramGenerator_exports);
var import_promises = require("fs/promises");
var import_node_path = require("path");
async function getAllFilesInDirectory(directory) {
  let files = [];
  const items = await (0, import_promises.readdir)(directory, { withFileTypes: true });
  for (const item of items) {
    const fullPath = (0, import_node_path.join)(directory, item.name);
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
      migrationFiles.map((filePath) => (0, import_promises.readFile)(filePath, "utf-8"))
    );
    const dbDiagramContent = fileContents.map((fileContent) => parseSQLToDbDiagramFormat(fileContent)).filter(Boolean).join("\n\n");
    await (0, import_promises.writeFile)(diagramOutputFile, dbDiagramContent.trim());
    console.log(
      `Arquivo ${diagramOutputFile} gerado com sucesso no formato dbdiagram.io!`
    );
  } catch (error) {
    console.error("Erro ao gerar o arquivo dbdiagram:", error);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  generateDbDiagramFile
});
