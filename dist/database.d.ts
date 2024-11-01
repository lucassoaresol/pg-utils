import { EventEmitter } from 'node:events';
import { IDataDict, SelectFields, WhereClause, SearchParams } from './IDatabase.js';
import 'pg';

declare class Database extends EventEmitter {
    private user;
    private host;
    private password;
    private port;
    private database;
    private pool;
    private listenerClient;
    constructor(user: string, host: string, password: string, port: number, database: string);
    listenToEvents(channel: string): Promise<void>;
    stopListening(): Promise<void>;
    private createAlias;
    private mapNullToUndefined;
    private mapNullToUndefinedInArray;
    private processCondition;
    connectPool(): Promise<void>;
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
    findMany<T>({ table, orderBy, select, where, joins, }: SearchParams<T>): Promise<T[]>;
    findFirst<T>({ table, orderBy, select, where, joins, }: SearchParams<T>): Promise<T | null>;
    deleteFromTable<T>({ table, where, }: {
        table: string;
        where?: WhereClause<T>;
    }): Promise<void>;
    query<T = any>(queryText: string, params?: any[]): Promise<T[]>;
}

export { Database as default };
