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
    private buildWhereClause;
    connectPool(): Promise<void>;
    createDatabase(): Promise<void>;
    insertIntoTable<T>({ table, dataDict, select, }: {
        table: string;
        dataDict: IDataDict;
        select?: SelectFields;
    }): Promise<T | void>;
    updateIntoTable({ table, dataDict, where, }: {
        table: string;
        dataDict: IDataDict;
        where?: WhereClause;
    }): Promise<void>;
    findMany<T>({ table, alias, orderBy, select, where, joins, limit, offset, groupBy, }: SearchParams): Promise<T[]>;
    findFirst<T>(params: SearchParams): Promise<T | null>;
    deleteFromTable({ table, where, }: {
        table: string;
        where?: WhereClause;
    }): Promise<void>;
    count({ table, alias, where, joins, }: Omit<SearchParams, 'select' | 'orderBy' | 'limit' | 'offset' | 'groupBy'>): Promise<number>;
    query<T = any>(queryText: string, params?: any[]): Promise<T[]>;
}

export { Database as default };
