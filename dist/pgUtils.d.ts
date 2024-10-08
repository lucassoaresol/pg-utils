import Database from './database.js';

declare class PgUtils {
    private user;
    private host;
    private password;
    private port;
    private database;
    private migrationsPath;
    private dbInstance;
    private migrations;
    constructor(user: string, host: string, password: string, port: number, database: string, migrationsPath: string);
    createAndConnectDatabase(): Promise<void>;
    getClientDatabase(): Database;
    revertLastMigration(): Promise<void>;
    applyAllMigrations(): Promise<void>;
    applyMigrationByName(name: string, direction: 'up' | 'down'): Promise<void>;
}

export { PgUtils as default };
