import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import Database from './database';

class MigrationManager {
  constructor(
    private migrationsPath: string,
    private db: Database,
  ) {}

  public async initialize() {
    await this.db.connectPool();

    await this.db.query(`
      CREATE TABLE IF NOT EXISTS "_migrations" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  private async getAppliedMigrations(): Promise<string[]> {
    const result = await this.db.findMany<{ name: string }>({
      table: '_migrations',
      select: { name: true },
    });
    return result.map((row) => row.name);
  }

  public async applyMigration(fileName: string, direction: 'up' | 'down') {
    const filePath = join(this.migrationsPath, fileName);
    const fileContent = await readFile(filePath, 'utf-8');
    const [up, down] = fileContent.split('-- down');

    const sqlToExecute = direction === 'up' ? up.replace('-- up', '') : down;

    try {
      await this.db.query('BEGIN');
      await this.db.query(sqlToExecute);

      if (direction === 'up') {
        await this.db.insertIntoTable({
          table: '_migrations',
          dataDict: { name: fileName },
        });
      } else {
        await this.db.deleteFromTable({
          table: '_migrations',
          where: { name: fileName },
        });
      }

      await this.db.query('COMMIT');
    } catch (err) {
      console.error(`Erro ao aplicar migração "${fileName}" (${direction}):`, err);
      await this.db.query('ROLLBACK');
      throw err;
    }
  }

  public async applyAllMigrations() {
    const appliedMigrations = await this.getAppliedMigrations();
    const allMigrations = await readdir(this.migrationsPath);
    const pendingMigrations = allMigrations.filter(
      (file) => !appliedMigrations.includes(file),
    );

    for (const migration of pendingMigrations) {
      console.log(`Aplicando migração: ${migration}`);
      await this.applyMigration(migration, 'up');
    }

    console.log('Todas as migrações foram aplicadas com sucesso!');
  }

  public async revertLastMigration() {
    const result = await this.db.findFirst<{ name: string }>({
      table: '_migrations',
      select: { name: true },
      orderBy: { id: 'DESC' },
    });
    const lastMigration = result?.name;

    if (!lastMigration) {
      console.log('Nenhuma migração encontrada para reverter.');
      return;
    }

    console.log(`Revertendo a migração: ${lastMigration}`);
    await this.applyMigration(lastMigration, 'down');
    console.log(`Migração ${lastMigration} revertida com sucesso!`);
  }

  public async revertAllMigrations() {
    const results = await this.db.findMany<{ name: string }>({
      table: '_migrations',
      select: { name: true },
      orderBy: { id: 'DESC' },
    });

    if (results.length === 0) {
      console.log('Nenhuma migração encontrada para reverter.');
      return;
    }

    console.log('Iniciando a reversão de todas as migrações...');
    for (const migration of results) {
      console.log(`Revertendo a migração: ${migration.name}`);
      await this.applyMigration(migration.name, 'down');
      console.log(`Migração ${migration.name} revertida com sucesso!`);
    }

    console.log('Todas as migrações foram revertidas com sucesso!');
  }
}

export default MigrationManager;
