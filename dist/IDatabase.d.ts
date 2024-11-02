import pkg from 'pg';

declare const Pool: typeof pkg.Pool;
declare const Client: typeof pkg.Client;
interface IDataDict {
    [key: string]: any;
}
type ClientType = InstanceType<typeof Client>;
type PoolType = InstanceType<typeof Pool>;
type WhereCondition = any | {
    value: any;
    mode: 'not';
} | {
    lt?: any;
    lte?: any;
    gt?: any;
    gte?: any;
};
type WhereField = any | {
    value: WhereCondition;
    alias: string;
};
type WhereClause = {
    [key: string]: WhereField;
} & {
    OR?: WhereClause;
};
type SelectFields<T> = {
    [K in keyof T]?: boolean;
};
type JoinParams<T> = {
    table: string;
    on: {
        [key: string]: string;
    };
    type?: 'INNER' | 'LEFT' | 'RIGHT';
    select?: SelectFields<T>;
};
type SearchParams<T> = {
    table: string;
    where?: WhereClause & {
        OR?: WhereClause;
    };
    orderBy?: {
        [K in keyof T]?: 'ASC' | 'DESC';
    };
    select?: SelectFields<T>;
    joins?: JoinParams<any>[];
    limit?: number;
};

export type { ClientType, IDataDict, JoinParams, PoolType, SearchParams, SelectFields, WhereClause, WhereCondition, WhereField };
