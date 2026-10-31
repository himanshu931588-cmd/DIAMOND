import { v4 as uuidv4 } from 'uuid';
import { AllowList } from '../types';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

interface PolicyResponseJSON {
  allowedTools?: string[];
  deniedCategories?: string[];
}

export async function generateAllowList(userPrompt: string, agentId: string): Promise<AllowList> {
  const sessionId = `sess_${uuidv4().substring(0, 8)}`;
  const createdAt = new Date().toISOString();

  console.log(`[Policy AI] Analyzing user prompt for agent '${agentId}': "${userPrompt}"`);

  const promptLower = userPrompt.toLowerCase();

  // Try calling Ollama
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 second timeout

    const systemInstruction = `You are an AI Security Policy Engine for autonomous agent containment.
Given a user's prompt defining an agent's task, output a minimal privilege security policy in strict JSON format.
Only allow the minimum set of tools and syscalls strictly required for the stated task.

Respond ONLY with valid JSON with this exact schema:
{
  "allowedTools": ["tool_name_or_pattern"],
  "deniedCategories": ["category_name"]
}

Common tool names:
- "read_file" or "read_file:*"
- "web_search"
- "http_get:*"
- "list_directory"
- "query_database"
- "render_chart"
- "calculate"

DO NOT allow shell execution, file deletion, root operations, or unauthorized upload tools unless strictly safe and explicitly requested.`;

    const requestBody = {
      model: OLLAMA_MODEL,
      prompt: `${systemInstruction}\n\nUser Task: "${userPrompt}"\n\nJSON Output:`,
      stream: false,
      format: 'json'
    };

    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data: any = await response.json();
      const rawText = data?.response || '';
      const parsed = extractJSON<PolicyResponseJSON>(rawText);

      if (parsed && Array.isArray(parsed.allowedTools) && parsed.allowedTools.length > 0) {
        console.log(`[Policy AI] Policy generated via Ollama (${OLLAMA_MODEL}):`, parsed.allowedTools);
        return {
          sessionId,
          agentId,
          allowedTools: parsed.allowedTools,
          deniedCategories: parsed.deniedCategories || ['filesystem_write', 'process_execution', 'credential_access', 'raw_sockets'],
          createdAt
        };
      }
    }
  } catch (err: any) {
    console.log(`[Policy AI] Ollama call skipped or unavailable (${err?.message || 'offline'}). Using intelligent heuristic policy generator.`);
  }

  // Fallback heuristic policy generation based on intent analysis
  const allowedTools: string[] = [];
  const deniedCategories: string[] = [
    'destructive_filesystem',
    'system_shell_exec',
    'privilege_escalation',
    'arbitrary_upload'
  ];

  // Base tools for standard benign tasks
  if (promptLower.includes('search') || promptLower.includes('find') || promptLower.includes('research') || promptLower.includes('paper') || promptLower.includes('lookup')) {
    allowedTools.push('web_search', 'http_get:*');
  }

  if (promptLower.includes('read') || promptLower.includes('report') || promptLower.includes('doc') || promptLower.includes('file') || promptLower.includes('summarize')) {
    allowedTools.push('read_file', 'read_file:*', 'list_directory');
  }

  if (promptLower.includes('api') || promptLower.includes('fetch') || promptLower.includes('http') || promptLower.includes('openai') || promptLower.includes('query')) {
    allowedTools.push('http_get:*');
  }

  if (promptLower.includes('code') || promptLower.includes('analyze') || promptLower.includes('data') || promptLower.includes('audit')) {
    allowedTools.push('read_file', 'read_file:*', 'list_directory', 'calculate');
  }

  // Ensure sensible default if no specific keywords matched
  if (allowedTools.length === 0) {
    allowedTools.push('read_file', 'read_file:*', 'web_search', 'http_get:*', 'list_directory');
  }

  // Ensure unique list
  const uniqueAllowed = Array.from(new Set(allowedTools));

  console.log(`[Policy AI] Heuristic AllowList established for agent ${agentId}:`, uniqueAllowed);

  return {
    sessionId,
    agentId,
    allowedTools: uniqueAllowed,
    deniedCategories,
    createdAt
  };
}

function extractJSON<T>(text: string): T | null {
  try {
    return JSON.parse(text);
  } catch {
    // Attempt markdown block regex
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}
