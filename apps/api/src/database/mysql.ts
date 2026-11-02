import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __filename = fileURLToPath(import.meta.url);

export function traduzirSqlParaMySQL(sql: string): string {
  let s = sql;
  s = s.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, "INSERT IGNORE INTO");
  s = s.replace(/INSERT\s+OR\s+REPLACE\s+INTO/gi, "REPLACE INTO");
  s = s.replace(/datetime\('now'\)/gi, "NOW()");
  s = s.replace(/PRAGMA\s+foreign_keys\s*=\s*ON;/gi, "SET FOREIGN_KEY_CHECKS = 1;");
  s = s.replace(/BEGIN\s+IMMEDIATE;/gi, "START TRANSACTION;");
  s = s.replace(/COLLATE\s+NOCASE/gi, "");
  
  // Tratamento de PRAGMA table_info(tabela)
  const pragmaMatch = s.match(/PRAGMA\s+table_info\(([^)]+)\)/i);
  if (pragmaMatch && pragmaMatch[1]) {
    const tbl = pragmaMatch[1].trim().replace(/['"`]/g, "");
    s = `SHOW COLUMNS FROM \`${tbl}\`;`;
  }

  return s;
}

if (!isMainThread) {
  const { poolConfig, sab, notifySab } = workerData as {
    poolConfig: mysql.PoolOptions;
    sab: SharedArrayBuffer;
    notifySab: SharedArrayBuffer;
  };

  const pool = mysql.createPool({
    ...poolConfig,
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0,
    charset: "utf8mb4",
    multipleStatements: true
  });

  const notifyInt32 = new Int32Array(notifySab);
  const dataView = new Uint8Array(sab);

  parentPort?.on("message", async (msg: { type: string; sql: string; params?: any[] }) => {
    const { type, sql, params } = msg;
    try {
      const translated = traduzirSqlParaMySQL(sql);
      
      if (type === "exec") {
        const statements = translated
          .split(";")
          .map((st) => st.trim())
          .filter((st) => st.length > 0);

        for (const st of statements) {
          try {
            await pool.query(st);
          } catch (err: any) {
            const stUpper = st.toUpperCase();
            if (
              stUpper.startsWith("CREATE TABLE") ||
              stUpper.startsWith("CREATE INDEX") ||
              stUpper.startsWith("PRAGMA") ||
              stUpper.startsWith("ALTER TABLE") ||
              stUpper.startsWith("DROP INDEX")
            ) {
              // DDL legado do SQLite é ignorado com segurança no MySQL operacional
              continue;
            }
            throw err;
          }
        }

        const res = JSON.stringify({ ok: true });
        const enc = new TextEncoder().encode(res);
        dataView.set(enc);
        notifyInt32[1] = enc.length;
        notifyInt32[0] = 1;
        Atomics.notify(notifyInt32, 0);
      } else {
        const [rows] = await pool.query(translated, params || []);
        let resultData: any;

        // Se foi query de SHOW COLUMNS (ex-PRAGMA table_info), normalizar para formato { name, type }
        if (sql.toUpperCase().includes("PRAGMA TABLE_INFO") && Array.isArray(rows)) {
          resultData = (rows as any[]).map((r) => ({
            cid: 0,
            name: r.Field,
            type: r.Type,
            notnull: r.Null === "NO" ? 1 : 0,
            dflt_value: r.Default,
            pk: r.Key === "PRI" ? 1 : 0
          }));
        } else if (type === "get") {
          resultData = Array.isArray(rows) ? (rows[0] !== undefined ? rows[0] : undefined) : rows;
        } else if (type === "all") {
          resultData = rows;
        } else if (type === "run") {
          const r = rows as mysql.ResultSetHeader;
          resultData = {
            changes: r && "affectedRows" in r ? r.affectedRows : 0,
            lastInsertRowid: r && "insertId" in r ? r.insertId : 0
          };
        }

        const res = JSON.stringify({ ok: true, data: resultData });
        const enc = new TextEncoder().encode(res);
        dataView.set(enc);
        notifyInt32[1] = enc.length;
        notifyInt32[0] = 1;
        Atomics.notify(notifyInt32, 0);
      }
    } catch (err: any) {
      const res = JSON.stringify({ ok: false, error: err?.message || String(err), sql });
      const enc = new TextEncoder().encode(res);
      dataView.set(enc);
      notifyInt32[1] = enc.length;
      notifyInt32[0] = 1;
      Atomics.notify(notifyInt32, 0);
    }
  });
}

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

export class MySQLDatabaseSync implements DatabaseSync {
  private worker: Worker;
  private sab: SharedArrayBuffer;
  private notifySab: SharedArrayBuffer;
  private notifyInt32: Int32Array;
  private dataView: Uint8Array;

  constructor(poolConfig: mysql.PoolOptions) {
    this.sab = new SharedArrayBuffer(16 * 1024 * 1024); // 16MB
    this.notifySab = new SharedArrayBuffer(8); // 2 x Int32
    this.notifyInt32 = new Int32Array(this.notifySab);
    this.dataView = new Uint8Array(this.sab);

    this.worker = new Worker(__filename, {
      workerData: {
        poolConfig,
        sab: this.sab,
        notifySab: this.notifySab
      }
    });
  }

  private querySync(type: "all" | "get" | "run" | "exec", sql: string, params: any[] = []): any {
    this.notifyInt32[0] = 0;
    this.notifyInt32[1] = 0;
    this.worker.postMessage({ type, sql, params });
    Atomics.wait(this.notifyInt32, 0, 0);

    const len = this.notifyInt32[1];
    const bytes = this.dataView.slice(0, len);
    const jsonStr = new TextDecoder().decode(bytes);
    const res = JSON.parse(jsonStr);
    if (!res.ok) {
      throw new Error(`[MySQL Database Error] ${res.error} on SQL: ${res.sql}`);
    }
    return res.data;
  }

  public prepare(sql: string): StatementSync {
    return {
      all: (...params: any[]) => this.querySync("all", sql, params),
      get: (...params: any[]) => this.querySync("get", sql, params),
      run: (...params: any[]) => this.querySync("run", sql, params)
    };
  }

  public exec(sql: string): void {
    this.querySync("exec", sql);
  }

  public close(): void {
    this.worker.terminate();
  }
}
