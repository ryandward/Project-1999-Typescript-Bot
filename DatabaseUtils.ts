// 2. Database Utilities
// Interfaces used by DatabaseUtils
import dotenv from "dotenv";
import pgPromise, { IDatabase, IMain } from "pg-promise";
import { logger } from "./Logger.js";

dotenv.config();
const pgp = pgPromise({});

export const db = pgp({
  user: process.env.PGUSER,
  password: process.env.PGPASS,
  host: process.env.PGHOST,
  port: 5432,
  database: process.env.PGDATA,
});

interface Row {
  [key: string]: any | null;
}

export const DatabaseUtils = {
  db: null as IDatabase<IMain> | null,
  init(db: IDatabase<IMain>) {
    this.db = db;
    return this;
  },

  async executeQuery(db: IDatabase<IMain>, query: string, params: any[]) {
    try {
      return db.one(query, params);
    } catch (error) {
      if (
        error instanceof pgPromise.errors.QueryResultError &&
        error.code === pgPromise.errors.queryResultErrorCode.noData
      ) {
        throw new Error(
          `No row found for query: ${query} with params: ${params}`
        );
      } else {
        throw error;
      }
    }
  },

  getDB(): IDatabase<IMain> {
    if (this.db === null) {
      throw new Error("Database connection not initialized");
    }
    return this.db;
  },

  async getRows(tableName: string, columnName: string, value: string) {
    try {
      this.db = this.getDB();
      const query = `SELECT * FROM ${tableName} WHERE ${columnName} = $1`;
      const result = db.any(query, value);
      return result; // Returning the full result for flexibility
    } catch (error) {
      logger.error(error);
      return [];
    }
  },

  async getRow(tableName: string, columnName: string, value: string) {
    try {
      this.db = this.getDB();
      const query = `SELECT * FROM ${tableName} WHERE ${columnName} = $1`;
      const result = db.one(query, value);
      return result; // Returning the full result for flexibility
    } catch (error) {
      logger.error(error);
      return [];
    }
  },

  async insertRow(tableName: string, row: Record<string, any>) {
    try {
      this.db = this.getDB();
      const columns = Object.keys(row).join(", ");
      const values = Object.values(row);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
      const query = `INSERT INTO ${tableName}(${columns}) VALUES(${placeholders}) RETURNING *`;
      const result = this.db.one(query, values);
      return result;
    } catch (error) {
      logger.error(error);
    }
  },

  async getSuggestions(
    tableName: string,
    searchColumn: string,
    partialName: string
  ) {
    try {
      this.db = this.getDB();
      const query = `SELECT DISTINCT ${searchColumn} FROM ${tableName} WHERE ${searchColumn} ILIKE $1 LIMIT 10`;
      const result = await db.any(query, [`%${partialName}%`]);
      return result.map((row: Row) => ({
        name: row[searchColumn],
        value: row[searchColumn],
      }));
    } catch (error) {
      logger.error(error);
      return [];
    }
  },

  async getSuggestionsAndCount(
    tableName: string,
    searchColumn: string,
    partialName: string
  ) {
    try {
      this.db = this.getDB();
      const query = `SELECT ${searchColumn}, COUNT(*) AS count FROM ${tableName} WHERE ${searchColumn} ILIKE $1 GROUP BY ${searchColumn} LIMIT 10`;
      const result = await this.db.any(query, [`%${partialName}%`]);
      return result.map((row: Row) => ({
        name: "(" + row.count + "x) " + row[searchColumn],
        value: row[searchColumn],
        count: row.count,
      }));
    } catch (error) {
      logger.error(error);
      return [];
    }
  },
};
