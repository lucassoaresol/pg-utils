declare class MigrationCreate {
    private migrationsPath;
    constructor(migrationsPath: string);
    createMigrationFile(name: string): Promise<void>;
}

export { MigrationCreate as default };
