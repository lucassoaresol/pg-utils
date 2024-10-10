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
    const result = await this.db.query<{ name: string }>(
      `SELECT name FROM "_migrations"`,
    );
    return result.map((row) => row.name);
  }

  public async applyMigration(fileName: string, direction: 'up' | 'down') {
    const filePath = join(this.migrationsPath, fileName);
    const fileContent = await readFile(filePath, 'utf-8');
    const [up, down] = fileContent.split('-- down');

    const sqlToExecute = direction === 'up' ? up.replace('-- up', '') : down;

    try {
      await this.db.beginTransaction();
      await this.db.executeMigration(sqlToExecute);

      if (direction === 'up') {
        await this.db.query(`INSERT INTO "_migrations" (name) VALUES ($1)`, [fileName]);
      } else {
        await this.db.query(`DELETE FROM "_migrations" WHERE name = $1`, [fileName]);
      }

      await this.db.commitTransaction();
    } catch (err) {
      console.error(`Erro ao aplicar migração "${fileName}" (${direction}):`, err);
      await this.db.rollbackTransaction();
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
    const result = await this.db.query<{ name: string }>(
      `SELECT name FROM "_migrations" ORDER BY id DESC LIMIT 1`,
    );
    const lastMigration = result[0]?.name;

    if (!lastMigration) {
      console.log('Nenhuma migração encontrada para reverter.');
      return;
    }

    console.log(`Revertendo a migração: ${lastMigration}`);
    await this.applyMigration(lastMigration, 'down');
    console.log(`Migração ${lastMigration} revertida com sucesso!`);
  }
}

export default MigrationManager;
