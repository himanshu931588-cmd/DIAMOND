import { AuditEntry } from '../types';

export class AuditLogService {
  private logs: AuditEntry[] = [];
  private readonly maxEntries: number = 1000;

  public append(entry: AuditEntry): void {
    this.logs.unshift(entry); // newest first for fast table rendering
    if (this.logs.length > this.maxEntries) {
      this.logs.pop();
    }
  }

  public getAll(): AuditEntry[] {
    return [...this.logs];
  }

  public getById(id: string): AuditEntry | undefined {
    return this.logs.find(log => log.id === id);
  }

  public updateEntry(id: string, updates: Partial<AuditEntry>): boolean {
    const index = this.logs.findIndex(log => log.id === id);
    if (index !== -1) {
      this.logs[index] = { ...this.logs[index], ...updates };
      return true;
    }
    return false;
  }

  public clear(): void {
    this.logs = [];
  }
}

export const auditLog = new AuditLogService();
