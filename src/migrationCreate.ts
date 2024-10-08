import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

class MigrationCreate {
  constructor(private migrationsPath: string) {}

  public async createMigrationFile(name: string) {
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '');
    const fileName = `${timestamp}_${name.replace(/\s+/g, '_')}.sql`;
    const filePath = join(this.migrationsPath, fileName);

    const fileContent = `-- up

-- down
`;

    try {
      await writeFile(filePath, fileContent);
      console.log(`Migração criada com sucesso: ${filePath}`);
    } catch (err) {
      console.error('Erro ao criar a migração:', err);
    }
  }
}

export default MigrationCreate;
