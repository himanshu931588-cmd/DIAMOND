import { AllowList, ToolRequest } from '../types';

export interface InterceptResult {
  inAllowList: boolean;
  matchedRule?: string;
  reason?: string;
}

export class EBPFInterceptor {
  private activeAllowLists: Map<string, AllowList> = new Map();
  private latestAllowList: AllowList | null = null;

  public loadAllowList(allowList: AllowList): void {
    this.activeAllowLists.set(allowList.sessionId, allowList);
    this.activeAllowLists.set(allowList.agentId, allowList);
    this.latestAllowList = allowList;
    console.log(`[eBPF Kernel Mock] Installed eBPF filter probe for agent ${allowList.agentId} (session: ${allowList.sessionId})`);
    console.log(`[eBPF Kernel Mock] Allowed Tools: [${allowList.allowedTools.join(', ')}]`);
  }

  public getAllowList(identifier?: string): AllowList | null {
    if (identifier && this.activeAllowLists.has(identifier)) {
      return this.activeAllowLists.get(identifier) || null;
    }
    return this.latestAllowList;
  }

  public intercept(request: ToolRequest): InterceptResult {
    const allowList = this.getAllowList(request.sessionId) || this.getAllowList(request.agentId) || this.latestAllowList;

    if (!allowList) {
      console.warn(`[eBPF Kernel Mock] [TRAP] Request ${request.id} intercepted: No active AllowList loaded. Denying by default.`);
      return {
        inAllowList: false,
        reason: 'No active AllowList found for session or agent'
      };
    }

    const requestedTool = request.tool.trim();

    for (const rule of allowList.allowedTools) {
      if (this.matchesRule(requestedTool, rule)) {
        console.log(`[eBPF Kernel Mock] [PASS] Syscall/Tool match: '${requestedTool}' satisfies rule '${rule}'`);
        return {
          inAllowList: true,
          matchedRule: rule
        };
      }
    }

    console.warn(`[eBPF Kernel Mock] [INTERCEPT] Syscall/Tool '${requestedTool}' not found in AllowList. Redirecting to Security AI engine.`);
    return {
      inAllowList: false,
      reason: `Tool '${requestedTool}' is not present in active eBPF AllowList`
    };
  }

  private matchesRule(requestedTool: string, rule: string): boolean {
    const cleanTool = requestedTool.toLowerCase();
    const cleanRule = rule.toLowerCase().trim();

    // Exact match
    if (cleanTool === cleanRule) {
      return true;
    }

    // Wildcard rule e.g. "http_get:*" or "*" or "read_file:*"
    if (cleanRule.endsWith(':*')) {
      const prefix = cleanRule.slice(0, -2);
      if (cleanTool === prefix || cleanTool.startsWith(prefix + ':') || cleanTool.startsWith(prefix + '/')) {
        return true;
      }
    }

    if (cleanRule.endsWith('*')) {
      const prefix = cleanRule.slice(0, -1);
      if (cleanTool.startsWith(prefix)) {
        return true;
      }
    }

    // Check base tool name before colon (e.g., requestedTool: "read_file:/path" vs rule: "read_file")
    const toolBase = cleanTool.split(/[:\s]/)[0];
    if (toolBase === cleanRule) {
      return true;
    }

    // Check regex pattern if rule has wildcards in between
    if (cleanRule.includes('*')) {
      const regexPattern = new RegExp('^' + cleanRule.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
      if (regexPattern.test(cleanTool)) {
        return true;
      }
    }

    return false;
  }
}

export const ebpfInterceptor = new EBPFInterceptor();
