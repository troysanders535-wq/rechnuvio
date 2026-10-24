/**
 * A very small SQL evaluator for the in-browser database viewer.
 *
 * The viewer holds one table, `users`, and runs the SELECT the user types
 * against it: the WHERE clause filters the rows, ORDER BY sorts them and LIMIT
 * cuts them off. The syntax it understands is the part of SQL a browser needs.
 */

export interface SqlRow {
  [column: string]: string | number;
}

export interface SqlTable {
  name: string;
  columns: string[];
  rows: SqlRow[];
}

export interface SqlResult {
  rows: SqlRow[];
  error: string;
  statement: string;
}

/**
 * A translator that resolves a catalogue key to a localized string.
 *
 * This module is a plain toolkit without a React hook, so the caller passes the
 * translator of the namespace it renders the result in.
 */
export type SqlTranslate = (key: string, values?: Record<string, string | number>) => string;

type Operand = { column: string } | { literal: string };

interface Condition {
  column: string;
  operator: string;
  value: Operand;
  negate: boolean;
}

const KEYWORDS = ["select", "from", "where", "order by", "limit", "and", "or", "asc", "desc", "like"];

function tokenize(sql: string): string[] {
  return sql
    .replace(/;+\s*$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

/** Split a WHERE clause into its AND/OR conditions. */
function parseConditions(clause: string): { conditions: Condition[]; joiners: string[] } {
  const parts = clause.split(/\s+(AND|OR)\s+/i);
  const conditions: Condition[] = [];
  const joiners: string[] = [];

  for (let i = 0; i < parts.length; i += 1) {
    if (i % 2 === 1) {
      joiners.push(parts[i].toUpperCase());
      continue;
    }
    const match = /^\s*([A-Za-z_][\w.]*)\s*(>=|<=|<>|!=|=|<|>|LIKE)\s*(.+?)\s*$/i.exec(parts[i]);
    if (!match) {
      conditions.push({ column: "", operator: "=", value: { literal: "1" }, negate: false });
      continue;
    }
    const raw = match[3].trim();
    const isLiteral = /^'.*'$/.test(raw) || /^-?\d+(\.\d+)?$/.test(raw);
    conditions.push({
      column: match[1],
      operator: match[2].toUpperCase(),
      value: isLiteral
        ? { literal: raw.replace(/^'|'$/g, "") }
        : { column: raw },
      negate: false,
    });
  }

  return { conditions, joiners };
}

function compare(left: string | number, operator: string, right: string | number): boolean {
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  const numeric =
    !Number.isNaN(leftNumber) && !Number.isNaN(rightNumber) && left !== "" && right !== "";

  if (operator === "=") return numeric ? leftNumber === rightNumber : String(left) === String(right);
  if (operator === "!=" || operator === "<>") {
    return numeric ? leftNumber !== rightNumber : String(left) !== String(right);
  }
  if (operator === "<") return numeric ? leftNumber < rightNumber : String(left) < String(right);
  if (operator === ">") return numeric ? leftNumber > rightNumber : String(left) > String(right);
  if (operator === "<=") return numeric ? leftNumber <= rightNumber : String(left) <= String(right);
  if (operator === ">=") return numeric ? leftNumber >= rightNumber : String(left) >= String(right);
  if (operator === "LIKE") {
    const pattern = new RegExp(
      `^${String(right)
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/%/g, ".*")
        .replace(/_/g, ".")}$`,
      "i",
    );
    return pattern.test(String(left));
  }
  return false;
}

/** Run a SELECT against the table. */
export function runSelect(table: SqlTable, sql: string, t: SqlTranslate): SqlResult {
  const statement = sql.trim();
  if (!statement) {
    return { rows: table.rows, error: "", statement };
  }

  const tokens = tokenize(statement);
  const upper = tokens.map((token) => token.toUpperCase());

  const fromAt = upper.indexOf("FROM");
  if (upper[0] !== "SELECT" || fromAt === -1) {
    return {
      rows: [],
      error: t("sqlUnsupportedStatement", { statement }),
      statement,
    };
  }

  const whereAt = upper.indexOf("WHERE");
  // "ORDER BY" is two words, so the phrase is looked for in two steps.
  const orderAt = upper.indexOf("ORDER");
  const orderBy = orderAt !== -1 && upper[orderAt + 1] === "BY" ? orderAt : -1;
  const limitAt = upper.indexOf("LIMIT");

  const tableName = tokens[fromAt + 1]?.toLowerCase();
  if (tableName && tableName !== table.name) {
    return {
      rows: [],
      error: t("sqlUnknownTable", { name: tableName, table: table.name }),
      statement,
    };
  }

  let rows = [...table.rows];

  if (whereAt !== -1) {
    const end =
      orderBy === -1
        ? limitAt === -1
          ? tokens.length
          : limitAt
        : orderBy;
    const clause = tokens.slice(whereAt + 1, end).join(" ");
    const { conditions, joiners } = parseConditions(clause);
    if (!conditions.length) {
      return { rows: [], error: t("sqlWhereClauseCouldNotBeRead"), statement };
    }
    rows = rows.filter((row) => {
      let result: boolean | null = null;
      for (let i = 0; i < conditions.length; i += 1) {
        const condition = conditions[i];
        const raw =
          condition.value && "column" in condition.value
            ? String(row[condition.value.column] ?? "")
            : String(condition.value.literal);
        const left = String(row[condition.column] ?? "");
        const value = compare(left, condition.operator, raw);
        if (result === null) result = value;
        else if (joiners[i - 1] === "OR") result = result || value;
        else result = result && value;
      }
      return result === true;
    });
  }

  if (orderBy !== -1) {
    const end = limitAt === -1 ? tokens.length : limitAt;
    const clause = tokens.slice(orderBy + 2, end);
    const column = clause[0];
    const descending = clause[1]?.toUpperCase() === "DESC";
    rows.sort((a, b) => {
      const left = a[column];
      const right = b[column];
      const leftNumber = Number(left);
      const rightNumber = Number(right);
      if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)) {
        return descending ? rightNumber - leftNumber : leftNumber - rightNumber;
      }
      const comparison = String(left).localeCompare(String(right));
      return descending ? -comparison : comparison;
    });
  }

  if (limitAt !== -1) {
    const count = Number(tokens[limitAt + 1]);
    if (Number.isFinite(count)) rows = rows.slice(0, count);
  }

  return { rows, error: "", statement };
}

export const SQL_KEYWORDS = KEYWORDS;
