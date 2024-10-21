import pkg from 'pg';

declare const Pool: typeof pkg.Pool;
interface IDataDict {
    [key: string]: any;
}
type PoolType = InstanceType<typeof Pool>;
type WhereCondition<T> = T | {
    value: T;
    mode: 'not';
} | {
    lt?: T;
    lte?: T;
    gt?: T;
    gte?: T;
};
type WhereClause<T> = {
    [K in keyof T]?: WhereCondition<T[K]>;
} & {
    OR?: WhereClause<T>;
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
    where?: WhereClause<T> & {
        OR?: WhereClause<T>;
    };
    orderBy?: {
        [K in keyof T]?: 'ASC' | 'DESC';
    };
    select?: SelectFields<T>;
    joins?: JoinParams<any>[];
};

export type { IDataDict, JoinParams, PoolType, SearchParams, SelectFields, WhereClause, WhereCondition };
