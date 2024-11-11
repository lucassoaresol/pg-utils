import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

async function getAllFilesInDirectory(directory: string): Promise<string[]> {
  let files: string[] = [];
  const items = await readdir(directory, { withFileTypes: true });

  for (const item of items) {
    const fullPath = join(directory, item.name);
    if (item.isDirectory()) {
      const subFiles = await getAllFilesInDirectory(fullPath);
      files = files.concat(subFiles);
    } else if (item.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function formatColumnConstraints(constraints: string): string {
  let constraintElements = constraints
    .replace(/\bNOT NULL\b/g, 'NOT NULL')
    .replace(/\bPRIMARY KEY\b/g, 'PK')
    .replace(/\bUNIQUE\b/g, 'UNIQUE')
    .replace(/\bDEFAULT\b/g, 'DEFAULT:')
    .replace('CURRENT_TIMESTAMP', '"CURRENT_TIMESTAMP"')
    .split(/\s+/);

  // Remove duplicatas e formata
  let formattedConstraints = Array.from(new Set(constraintElements)).join(', ');
  formattedConstraints = formattedConstraints
    .replace('NOT,', 'NOT')
    .replace('DEFAULT:,', 'DEFAULT:');

  return `[${formattedConstraints}]`;
}

function parseSQLToDbDiagramFormat(fileContent: string): string {
  const createTableRegex = /CREATE TABLE "([\w]+)" \(([\s\S]*?)\);/g;
  let match;
  let result = '';
  let referencesSection = '';

  while ((match = createTableRegex.exec(fileContent)) !== null) {
    const tableName = match[1];
    let indexes = '';

    const columnsDefinitions = match[2]
      .trim()
      .split(',\n')
      .map((line) => {
        line = line.trim();

        if (line.includes('CONSTRAINT') && line.includes('_pkey')) {
          const pkMatch = line.match(
            /CONSTRAINT "([\w]+)" PRIMARY KEY \(([\w",\s]+)\)/,
          );
          if (pkMatch) {
            const pkColumns = pkMatch[2].replace(/["\s]/g, '').split(',').join(', ');
            indexes += `  indexes {\n    (${pkColumns}) [pk]\n  }\n`;
          }
          return '';
        }

        if (line.includes('CONSTRAINT') && line.includes('_fkey')) {
          const fkMatch = line.match(
            /CONSTRAINT "([\w]+)" FOREIGN KEY \("([\w]+)"\) REFERENCES "([\w]+)" \("([\w]+)"\)( ON DELETE CASCADE| ON UPDATE CASCADE)*/g,
          );
          if (fkMatch) {
            const [, columnName, refTable, refColumn] =
              fkMatch[0].match(
                /FOREIGN KEY \("([\w]+)"\) REFERENCES "([\w]+)" \("([\w]+)"\)/,
              ) || [];

            if (columnName && refTable && refColumn) {
              referencesSection += `Ref: ${tableName}.${columnName} > ${refTable}.${refColumn}\n`;
            }
          }
          return '';
        }

        const [columnName, columnType, ...rest] = line.split(/\s+/);
        const formattedColumnName = columnName.replace(/["]/g, '');
        const formattedColumnType = columnType.replace(/["]/g, '');
        const constraints = formatColumnConstraints(rest.join(' ').replace(/["]/g, ''));
        return `  "${formattedColumnName}" ${formattedColumnType} ${constraints}`;
      })
      .filter(Boolean)
      .join('\n');

    result += `Table ${tableName} {\n${columnsDefinitions}\n${indexes}}\n\n`;
  }

  return referencesSection
    ? `${result.trim()}\n\n${referencesSection.trim()}`
    : result.trim();
}

export async function generateDbDiagramFile(
  migrationsDirectoryPath: string,
  diagramOutputFile: string,
) {
  try {
    const migrationFiles = await getAllFilesInDirectory(migrationsDirectoryPath);

    const fileContents = await Promise.all(
      migrationFiles.map((filePath) => readFile(filePath, 'utf-8')),
    );

    const dbDiagramContent = fileContents
      .map((fileContent) => parseSQLToDbDiagramFormat(fileContent))
      .filter(Boolean)
      .join('\n\n');

    await writeFile(diagramOutputFile, dbDiagramContent.trim());
    console.log(
      `Arquivo ${diagramOutputFile} gerado com sucesso no formato dbdiagram.io!`,
    );
  } catch (error) {
    console.error('Erro ao gerar o arquivo dbdiagram:', error);
  }
}
