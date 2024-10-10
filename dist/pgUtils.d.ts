import Database from './database.js';
import MigrationManager from './migrationManager.js';

declare class PgUtils {
    private user;
    private host;
    private password;
    private port;
    private database;
    private migrationsPath;
    private manageMigrations;
    private dbInstance;
    private migrations;
    constructor(user: string, host: string, password: string, port: number, database: string, migrationsPath: string, manageMigrations: boolean);
    createAndConnectDatabase(): Promise<void>;
    getClientDatabase(): Database;
    getManageMigrations(): boolean;
    getMigrations(): Promise<MigrationManager | undefined>;
}

export { PgUtils as default };
