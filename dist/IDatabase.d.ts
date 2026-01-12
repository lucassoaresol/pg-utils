import pkg from 'pg';

declare const Pool: typeof pkg.Pool;
declare const Client: typeof pkg.Client;
interface IDataDict {
    [key: string]: any;
}
type ClientType = InstanceType<typeof Client>;
type PoolType = InstanceType<typeof Pool>;
type WhereConditionValue = {
    value: any;
    mode?: 'not' | 'ilike' | 'like' | 'date' | 'json';
    is_not?: boolean;
};
type WhereConditionRange = {
    lt?: any | WhereConditionValue;
    lte?: any | WhereConditionValue;
    gt?: any | WhereConditionValue;
    gte?: any | WhereConditionValue;
};
type WhereCondition = any | WhereConditionValue | WhereConditionRange;
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
    offset?: number;
    groupBy?: string[];
};

export type { ClientType, IDataDict, JoinParams, PoolType, SearchParams, SelectFields, WhereClause, WhereCondition, WhereConditionRange, WhereConditionValue };
