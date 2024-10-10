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
    private manageMigrations: boolean,
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
    if (!this.manageMigrations) {
      throw new Error(
        'O gerenciamento de migrações não está ativado. A criação do banco de dados não é permitida.',
      );
    }

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

  public getManageMigrations(): boolean {
    return this.manageMigrations;
  }

  public async getMigrations(): Promise<MigrationManager | undefined> {
    if (this.manageMigrations) {
      try {
        await this.migrations.initialize();
        console.log('Gerenciamento de migrações iniciado.');
        return this.migrations;
      } catch (err) {
        console.error('Erro ao inicializar migrações:', err);
      }
    } else {
      console.log('Gerenciamento de migrações está desativado.');
    }
  }
}

export default PgUtils;
