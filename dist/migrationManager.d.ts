import Database from './database.js';

declare class MigrationManager {
    private migrationsPath;
    private db;
    constructor(migrationsPath: string, db: Database);
    initialize(): Promise<void>;
    private getAppliedMigrations;
    applyMigration(fileName: string, direction: 'up' | 'down'): Promise<void>;
    applyAllMigrations(): Promise<void>;
    revertLastMigration(): Promise<void>;
}

export { MigrationManager as default };
