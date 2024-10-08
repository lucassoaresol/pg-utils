import Database from './database';
import MigrationManager from './migrationManager';

class PgUtils {
  private dbInstance: Database;
  private migrations: MigrationManager;

  constructor(
    private user: string,
    private host: string,
    private password: string,
    private port: number,
    private database: string,
    private migrationsPath: string,
  ) {
    this.dbInstance = new Database(
      this.user,
      this.host,
      this.password,
      this.port,
      this.database,
    );
    this.migrations = new MigrationManager(this.migrationsPath, this.dbInstance);
  }

  public async createAndConnectDatabase(): Promise<void> {
    try {
      await this.dbInstance.createDatabase();
      console.log(`Banco de dados "${this.database}" criado e pool inicializado.`);
    } catch (err) {
      console.error('Erro ao criar o banco de dados:', err);
    }
  }

  public getClientDatabase(): Database {
    return this.dbInstance;
  }

  public async revertLastMigration(): Promise<void> {
    await this.migrations.initialize();
    await this.migrations.revertLastMigration();
  }

  public async applyAllMigrations(): Promise<void> {
    await this.migrations.initialize();
    await this.migrations.applyAllMigrations();
  }

  public async applyMigrationByName(name: string, direction: 'up' | 'down') {
    await this.migrations.initialize();
    await this.migrations.applyMigrationByName(name, direction);
  }
}

export default PgUtils;
