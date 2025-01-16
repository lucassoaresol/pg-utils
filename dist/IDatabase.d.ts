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
    value: any;
    mode: 'ilike';
} | {
    lt?: any;
    lte?: any;
    gt?: any;
    gte?: any;
};
type WhereClause = {
    [key: string]: WhereCondition;
} & {
    OR?: WhereClause;
};
type SelectFields = {
    [key: string]: boolean;
};
type JoinParams = {
    table: string;
    alias?: string;
    on: {
        [key: string]: string;
    };
    type?: 'INNER' | 'LEFT' | 'RIGHT';
};
type SearchParams = {
    table: string;
    alias?: string;
    where?: WhereClause;
    orderBy?: {
        [key: string]: 'ASC' | 'DESC';
    };
    select?: SelectFields;
    joins?: JoinParams[];
    limit?: number;
};

export type { ClientType, IDataDict, JoinParams, PoolType, SearchParams, SelectFields, WhereClause, WhereCondition };
