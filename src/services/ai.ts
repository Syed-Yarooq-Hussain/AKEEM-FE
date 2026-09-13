import { apiRequest } from "./api";

export type AssistantId =
  | "ceo"
  | "executive"
  | "sales"
  | "finance"
  | "marketing"
  | "legal"
  | "operations"
  | "customer-success";
export type ExecutionMode = "auto" | "suggest";
export type ActionType =
  | "create_task"
  | "create_draft_invoice"
  | "create_budget"
  | "create_report"
  | "create_approval"
  | "create_crm_activity";

export type ChatPageContext = {
  module?: string;
  page?: string;
  entityType?: string;
  entityId?: number;
  selection?: Record<string, unknown>;
};

export type ChatRequest = {
  message: string;
  projectId?: number;
  conversationId?: number;
  assistant?: AssistantId;
  executionMode?: ExecutionMode;
  context?: ChatPageContext;
};

export type ActionResult = {
  type: ActionType;
  status: "executed" | "proposed" | "failed";
  reason: string;
  resource?: {
    type:
      "task" | "invoice" | "budget" | "report" | "approval" | "crm_activity";
    id: number;
  };
  data?: Record<string, unknown>;
  error?: string;
};

export type DelegationResult = {
  id: number;
  assistant: AssistantId;
  objective: string;
  status: "pending" | "queued" | "running" | "completed" | "failed";
  parentDelegationId?: number | null;
  fromAssistant?: AssistantId;
  answer: string;
  model?: string;
  usage?: { inputTokens?: number; outputTokens?: number };
  actions?: ActionResult[];
  error?: string;
  startedAt?: string;
  completedAt?: string;
};

export type ChatResponse = {
  conversationId: number;
  messageId: number;
  projectId: number | null;
  assistant: AssistantId;
  answer: string;
  model?: string;
  routing?: { delegated: boolean; specialists: AssistantId[] };
  delegations?: DelegationResult[];
  actions?: ActionResult[];
  usage?: { inputTokens?: number; outputTokens?: number };
  createdAt?: string;
};

export type AssistantDirectoryItem = {
  key: AssistantId;
  label: string;
  description: string;
  capabilities: string[];
  actions: ActionType[];
  model: string;
};

export type AssistantConversation = {
  id: number;
  projectId?: number | null;
  assistant?: AssistantId;
  title: string;
  lastMessage?: string;
  messageCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type AssistantMessage = {
  id?: number | string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  model?: string;
  delegations?: DelegationResult[];
  actions?: ActionResult[];
  failed?: boolean;
};

type ListResult<T> = { items?: T[] };

export const actionLabels: Record<ActionType, string> = {
  create_task: "Task created",
  create_draft_invoice: "Draft invoice created",
  create_budget: "Budget created",
  create_report: "Report created",
  create_approval: "Approval requested",
  create_crm_activity: "CRM activity created",
};

export const actionResourceModule: Record<
  NonNullable<ActionResult["resource"]>["type"],
  string
> = {
  task: "tasks",
  invoice: "finance",
  budget: "finance",
  report: "reports",
  approval: "approvals",
  crm_activity: "crm",
};

export const getAssistantDirectory = () =>
  apiRequest<{
    items: AssistantDirectoryItem[];
    defaultAssistant: AssistantId;
    executionModes: ExecutionMode[];
  }>("/ai/assistants");

export type ChatProgress = { conversationId: number; delegations: DelegationResult[] };

export async function sendChatMessage(payload: ChatRequest, onProgress?: (progress: ChatProgress) => void) {
  const { conversationId } = await apiRequest<{ conversationId: number }>("/ai/conversations", {
    method: "POST", body: JSON.stringify(payload),
  });
  const previous = payload.conversationId
    ? await listDelegations({ conversationId, limit: 100 })
    : { items: [] };
  const previousIds = new Set(previous.items.map(item => item.id));
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const poll = async () => {
    try {
      const result = await listDelegations({ conversationId, limit: 100 });
      if (!stopped) onProgress?.({ conversationId, delegations: result.items.filter(item => !previousIds.has(item.id)).reverse() });
    } catch { /* A progress fetch must not interrupt the chat request. */ }
    if (!stopped) timer = setTimeout(poll, 2000);
  };
  onProgress?.({ conversationId, delegations: [] });
  if (onProgress) timer = setTimeout(poll, 1000);
  try {
    return await apiRequest<ChatResponse>("/ai/chat", {
      method: "POST", body: JSON.stringify({ ...payload, conversationId }),
    });
  } finally { stopped = true; clearTimeout(timer); }
}

export const sendDirectAssistantMessage = (
  assistant: AssistantId,
  payload: Omit<ChatRequest, "assistant">,
) =>
  apiRequest<ChatResponse>(`/ai/${assistant}/chat`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export async function listConversations(
  filters: {
    projectId?: number;
    assistant?: AssistantId;
    page?: number;
    limit?: number;
  } = {},
) {
  const query = new URLSearchParams();
  if (filters.projectId) query.set("projectId", String(filters.projectId));
  if (filters.assistant) query.set("assistant", filters.assistant);
  query.set("page", String(filters.page ?? 1));
  query.set("limit", String(filters.limit ?? 50));
  const data = await apiRequest<
    ListResult<AssistantConversation> | AssistantConversation[]
  >(`/ai/conversations?${query}`);
  return Array.isArray(data) ? data : (data.items ?? []);
}

export async function getConversationMessages(
  conversationId: number,
): Promise<AssistantMessage[]> {
  const [data, delegationData] = await Promise.all([
    apiRequest<
      { messages?: Record<string, unknown>[] } | Record<string, unknown>[]
    >(`/ai/conversations/${conversationId}/messages`),
    apiRequest<ListResult<Record<string, unknown>>>(
      `/ai/delegations?conversationId=${conversationId}&page=1&limit=100`,
    ).catch(() => ({ items: [] })),
  ]);
  const rows = Array.isArray(data) ? data : (data.messages ?? []);
  const delegations = (delegationData.items ?? []).map(normalizeDelegation);
  const byId = new Map(delegations.map((item) => [item.id, item]));
  const referencedIds = new Set(rows.flatMap(row => {
    const metadata = toRecord(row.metadata);
    return [...(arrayValue<Record<string, unknown>>(row.toolCalls) ?? []).map(item => Number(item.delegationId)),
      ...(arrayValue<unknown>(metadata.delegationIds) ?? []).map(Number)].filter(Boolean);
  }));
  await Promise.all([...referencedIds].filter(id => !byId.has(id)).map(async id => {
    try { byId.set(id, await getDelegation(id)); } catch { /* Keep the saved message visible. */ }
  }));
  return rows
    .map((row) => normalizeMessage(row, byId))
    .filter((message) => message.content);
}

export const deleteConversation = (conversationId: number) =>
  apiRequest(`/ai/conversations/${conversationId}`, { method: "DELETE" });

export async function listDelegations(
  filters: {
    conversationId?: number;
    projectId?: number;
    status?: string;
    page?: number;
    limit?: number;
  } = {},
) {
  const query = new URLSearchParams();
  Object.entries({
    ...filters,
    page: filters.page ?? 1,
    limit: filters.limit ?? 20,
  }).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const data = await apiRequest<ListResult<Record<string, unknown>>>(
    `/ai/delegations?${query}`,
  );
  return { ...data, items: (data.items ?? []).map(normalizeDelegation) };
}

export async function getDelegation(id: number) {
  return normalizeDelegation(
    await apiRequest<Record<string, unknown>>(`/ai/delegations/${id}`),
  );
}

function normalizeMessage(
  row: Record<string, unknown>,
  delegationById = new Map<number, DelegationResult>(),
): AssistantMessage {
  const rawRole = String(
    row.role ?? row.sender ?? row.type ?? "",
  ).toLowerCase();
  const metadata = toRecord(row.metadata);
  const toolCalls = arrayValue<Record<string, unknown>>(row.toolCalls) ?? [];
  const delegationIds = [
    ...toolCalls.map((item) => Number(item.delegationId)).filter(Boolean),
    ...(arrayValue<unknown>(metadata.delegationIds) ?? [])
      .map(Number)
      .filter(Boolean),
  ];
  const restoredDelegations = [...new Set(delegationIds)]
    .map((id) => delegationById.get(id))
    .filter((item): item is DelegationResult => Boolean(item));
  const toolActions = toolCalls.flatMap(
    (item) => arrayValue<ActionResult>(item.actions) ?? [],
  );
  return {
    id:
      typeof row.id === "number" || typeof row.id === "string"
        ? row.id
        : undefined,
    role: ["user", "human", "client"].includes(rawRole) ? "user" : "assistant",
    content: String(row.content ?? row.message ?? row.answer ?? row.text ?? ""),
    createdAt: row.createdAt ? String(row.createdAt) : undefined,
    model:
      typeof row.model === "string"
        ? row.model
        : typeof metadata.model === "string"
          ? metadata.model
          : undefined,
    delegations:
      arrayValue<DelegationResult>(row.delegations ?? metadata.delegations) ??
      (restoredDelegations.length ? restoredDelegations : undefined),
    actions:
      arrayValue<ActionResult>(row.actions ?? metadata.actions) ??
      (toolActions.length ? toolActions : undefined),
  };
}

function normalizeDelegation(row: Record<string, unknown>): DelegationResult {
  const output = toRecord(row.output);
  const toAgent = toRecord(row.toAgent);
  const rawName = String(row.assistant ?? toAgent.name ?? "").toLowerCase();
  const assistant =
    assistantIds.find(
      (id) => rawName === id || rawName.includes(id.replace("-", " ")),
    ) ?? "executive";
  return {
    id: Number(row.id),
    assistant,
    objective: String(row.objective ?? ""),
    status: (["pending", "queued", "running", "completed", "failed"].includes(String(row.status))
      ? String(row.status) : "pending") as DelegationResult["status"],
    parentDelegationId: row.parentDelegationId ? Number(row.parentDelegationId) : null,
    fromAssistant: typeof row.fromAssistant === "string" ? row.fromAssistant as AssistantId : undefined,
    answer: String(row.answer ?? output.answer ?? ""),
    model:
      typeof row.model === "string"
        ? row.model
        : typeof output.model === "string"
          ? output.model
          : undefined,
    usage: toRecord(row.usage ?? output.usage) as DelegationResult["usage"],
    actions: arrayValue<ActionResult>(row.actions ?? output.actions),
    error: typeof row.error === "string" ? row.error : undefined,
    startedAt: row.startedAt ? String(row.startedAt) : undefined,
    completedAt: row.completedAt ? String(row.completedAt) : undefined,
  };
}

const assistantIds: AssistantId[] = [
  "ceo",
  "executive",
  "sales",
  "finance",
  "marketing",
  "legal",
  "operations",
  "customer-success",
];

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value))
    return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function arrayValue<T>(value: unknown): T[] | undefined {
  return Array.isArray(value) && value.length ? (value as T[]) : undefined;
}
