import { Inject, Injectable } from "@nestjs/common";
import sqlite3 from "sqlite3";

export interface RunResult {
  lastID: number;
  changes: number;
}

// deno-lint-ignore no-explicit-any
export type SqlParams = Record<string, any>;

@Injectable()
export class DatabaseService {
  constructor(
    @Inject(sqlite3.Database) private readonly database: sqlite3.Database
  ) {}

  run(sql: string, params: SqlParams = {}): Promise<RunResult> {
    return new Promise<RunResult>((resolve, reject) => {
      this.database.run(sql, params, function(this: RunResult, err: Error | null) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  get<T>(sql: string, params: SqlParams = {}): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.database.get(sql, params, (err: Error | null, row: T) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  all<T>(sql: string, params: SqlParams = {}): Promise<T[]> {
    return new Promise<T[]>((resolve, reject) => {
      this.database.all(sql, params, (err: Error | null, rows: T[]) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }
} 