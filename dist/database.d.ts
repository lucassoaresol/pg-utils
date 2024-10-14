import { IDataDict, SelectFields, WhereClause, SearchParams } from './IDatabase.js';
import 'pg';

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
    insertIntoTable<T>({ table, dataDict, select, }: {
        table: string;
        dataDict: IDataDict;
        select?: SelectFields<T>;
    }): Promise<T | void>;
    updateIntoTable<T>({ table, dataDict, where, }: {
        table: string;
        dataDict: IDataDict;
        where?: WhereClause<T>;
    }): Promise<void>;
    findMany<T>({ table, orderBy, select, where, }: SearchParams<T>): Promise<T[]>;
    findFirst<T>({ table, orderBy, select, where, }: SearchParams<T>): Promise<T | null>;
    deleteFromTable<T>({ table, where, }: {
        table: string;
        where?: WhereClause<T>;
    }): Promise<void>;
    query<T = any>(queryText: string, params?: any[]): Promise<T[]>;
}

export { Database as default };
