declare module "node:sqlite" {
  export interface StatementSyncResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  export interface StatementSync {
    all(...params: any[]): any[];
    get(...params: any[]): any | undefined;
    run(...params: any[]): StatementSyncResult;
  }

  export interface DatabaseSync {
    prepare(sql: string): StatementSync;
    exec(sql: string): void;
    close?(): void;
  }

  export const DatabaseSync: {
    new (caminho?: string): DatabaseSync;
  };
}
