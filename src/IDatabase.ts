import pkg from 'pg';

const { Pool, Client } = pkg;

export interface IDataDict {
  [key: string]: any;
}

export type ClientType = InstanceType<typeof Client>;
export type PoolType = InstanceType<typeof Pool>;

export type WhereConditionValue = {
  value: any;
  mode?: 'not' | 'ilike' | 'like' | 'date';
  is_not?: boolean;
};

export type WhereConditionRange = {
  lt?: any | WhereConditionValue;
  lte?: any | WhereConditionValue;
  gt?: any | WhereConditionValue;
  gte?: any | WhereConditionValue;
};

export type WhereCondition = any | WhereConditionValue | WhereConditionRange;

export type WhereClause = {
  [key: string]: WhereCondition;
} & {
  OR?: WhereClause;
};

export type SelectFields = {
  [key: string]: boolean;
};

export type JoinParams = {
  table: string;
  alias?: string;
  on: { [key: string]: string };
  type?: 'INNER' | 'LEFT' | 'RIGHT';
};

export type SearchParams = {
  table: string;
  alias?: string;
  where?: WhereClause;
  orderBy?: { [key: string]: 'ASC' | 'DESC' };
  select?: SelectFields;
  joins?: JoinParams[];
  limit?: number;
  offset?: number;
  groupBy?: string[];
};
