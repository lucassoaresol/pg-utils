interface IDataDict {
    [key: string]: any;
}
declare class Database {
    private user;
    private host;
    private password;
    private port;
    private database;
    private pool;
    constructor(user: string, host: string, password: string, port: number, database: string);
    connectPool(): Promise<void>;
    beginTransaction(): Promise<void>;
    commitTransaction(): Promise<void>;
    rollbackTransaction(): Promise<void>;
    executeMigration(sql: string): Promise<void>;
    createDatabase(): Promise<void>;
    insertIntoTable(tableName: string, dataDict: IDataDict, returningColumn?: string): Promise<number | string>;
    updateIntoTable(tableName: string, dataDict: IDataDict, referenceColumn?: string): Promise<void>;
    searchAll<T>(table: string, fields?: string[] | null): Promise<T[]>;
    searchUniqueByField<T>(table: string, field: string, value: any, fields?: string[] | null): Promise<T | null>;
    deleteFromTable(tableName: string, id: number | string, idColumn?: string): Promise<void>;
    query<T = any>(queryText: string, params?: any[]): Promise<T[]>;
}

export { Database as default };
