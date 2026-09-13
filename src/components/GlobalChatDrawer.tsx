import { selectProject as persistProjectSelection } from '../services/project-selection';
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { assistantConfigs, ModeSwitch } from "../pages/AssistantWorkspace";
import { ApiError } from "../services/api";
import {
  ActionResult,
  AssistantDirectoryItem,
  AssistantId,
  AssistantMessage,
  ExecutionMode,
  ChatProgress,
  getAssistantDirectory,
  getConversationMessages,
  listConversations,
  sendChatMessage,
} from "../services/ai";
import { getProjects, Project } from "../services/projects";
import AgentResultCards from "./AgentResultCards";
import Icon from "./Icon";

type Props = { activeModule: string; onNavigate: (id: string) => void };

export default function GlobalChatDrawer({ activeModule, onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const [assistant, setAssistant] = useState<AssistantId>(() =>
    defaultAssistant(activeModule),
  );
  const [directory, setDirectory] = useState<AssistantDirectoryItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number>();
  const [conversationId, setConversationId] = useState<number>();
  const [conversationOptions, setConversationOptions] = useState<
    Array<{ id: number; title: string }>
  >([]);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ExecutionMode>("suggest");
  const [sending, setSending] = useState(false);
  const [liveProgress, setLiveProgress] = useState<ChatProgress>();
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState("");
  const [retryText, setRetryText] = useState("");
  const [disabled, setDisabled] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const config =
    assistantConfigs.find((item) => item.id === assistant) ??
    assistantConfigs[0];

  useEffect(() => {
    getAssistantDirectory()
      .then((result) => setDirectory(result.items ?? []))
      .catch(() => undefined);
    const loadProjectOptions = () =>
      getProjects()
        .then((items) => {
          setProjects(items);
          const saved =
            Number(localStorage.getItem("selectedProjectId")) || undefined;
          setProjectId(
            items.some((project) => project.id === saved) ? saved : undefined,
          );
        })
        .catch(() => undefined);
    void loadProjectOptions();
    window.addEventListener("project:selected", loadProjectOptions);
    return () =>
      window.removeEventListener("project:selected", loadProjectOptions);
  }, []);

  useEffect(() => {
    setAssistant(defaultAssistant(activeModule));
  }, [activeModule]);

  useEffect(() => {
    setConversationId(undefined);
    setMessages([]);
    setError("");
    setRetryText("");
    if (!open) return;
    listConversations({
      assistant,
      ...(projectId ? { projectId } : {}),
      limit: 20,
    })
      .then((items) => {
        const matching = projectId
          ? items
          : items.filter((item) => item.projectId == null);
        setConversationOptions(
          matching.map((item) => ({
            id: item.id,
            title: item.title || `Conversation #${item.id}`,
          })),
        );
        const savedId = Number(
          localStorage.getItem(drawerHistoryKey(assistant, projectId)),
        );
        if (matching.some((item) => item.id === savedId))
          void openConversation(savedId);
      })
      .catch(() => setConversationOptions([]));
  }, [assistant, projectId, open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function openConversation(id: number) {
    if (!id) {
      setConversationId(undefined);
      setMessages([]);
      localStorage.removeItem(drawerHistoryKey(assistant, projectId));
      return;
    }
    setConversationId(id);
    localStorage.setItem(drawerHistoryKey(assistant, projectId), String(id));
    setLoadingHistory(true);
    setError("");
    try {
      setMessages(await getConversationMessages(id));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to load this conversation.",
      );
    } finally {
      setLoadingHistory(false);
    }
  }

  async function sendText(text: string, addUser: boolean, force = false) {
    if (!text || sending || (disabled && !force)) return;
    if (addUser)
      setMessages((items) => [
        ...items,
        {
          id: `drawer-${Date.now()}`,
          role: "user",
          content: text,
          createdAt: new Date().toISOString(),
        },
      ]);
    setInput("");
    setSending(true);
    setLiveProgress(undefined);
    setError("");
    setRetryText("");
    try {
      const response = await sendChatMessage({
        message: text,
        assistant,
        executionMode: mode,
        ...(projectId ? { projectId } : {}),
        ...(conversationId ? { conversationId } : {}),
        context: { module: contextModule(activeModule), page: activeModule },
      }, progress => {
        setLiveProgress(progress);
        setConversationId(progress.conversationId);
        localStorage.setItem(drawerHistoryKey(assistant, projectId), String(progress.conversationId));
      });
      setDisabled(false);
      setConversationId(response.conversationId);
      localStorage.setItem(
        drawerHistoryKey(assistant, projectId),
        String(response.conversationId),
      );
      setMessages((items) => [
        ...items,
        {
          id: response.messageId,
          role: "assistant",
          content: response.answer,
          createdAt: response.createdAt,
          model: response.model,
          delegations: response.delegations,
          actions: response.actions,
        },
      ]);
      announce(
        response.actions,
        response.delegations?.flatMap((delegation) => delegation.actions ?? []),
      );
      const title = text.length > 42 ? `${text.slice(0, 42)}...` : text;
      setConversationOptions((items) =>
        items.some((item) => item.id === response.conversationId)
          ? items
          : [{ id: response.conversationId, title }, ...items],
      );
    } catch (reason) {
      const apiError = reason instanceof ApiError ? reason : undefined;
      if (apiError?.code === "AI_PROVIDER_NOT_CONFIGURED") setDisabled(true);
      if (apiError?.status === 403 || (apiError?.status === 404 && apiError.code === "NOT_FOUND")) {
        setConversationId(undefined);
        localStorage.removeItem(drawerHistoryKey(assistant, projectId));
      }
      if (apiError?.status === 404 && apiError.code === "PROJECT_NOT_FOUND") {
        setProjectId(undefined);
        persistProjectSelection(undefined);
      }
      setRetryText(text);
      setError(
        reason instanceof Error ? reason.message : "AI chat could not respond.",
      );
    } finally {
      setSending(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (text) void sendText(text, true);
  }
  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }
  function navigate(module: string) {
    setOpen(false);
    onNavigate(module);
  }

  const assistantOptions = directory.length
    ? directory
    : assistantConfigs.map((item) => ({
        key: item.id,
        label: item.label,
        description: item.description,
        capabilities: item.capabilities,
        actions: [],
        model: "",
      }));

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open AI chat"
        className="fixed bottom-5 right-5 z-20 flex h-14 items-center gap-2 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 px-4 text-white shadow-xl shadow-blue-900/20 transition hover:-translate-y-0.5 hover:shadow-2xl"
      >
        <Icon name="bot" className="h-5 w-5" />
        <span className="hidden text-xs font-bold sm:inline">Ask AKEEM</span>
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/35"
          role="dialog"
          aria-modal="true"
          aria-label="AKEEM AI chat"
        >
          <button
            aria-label="Close AI chat"
            className="absolute inset-0 cursor-default"
            onClick={() => { if (!sending) setOpen(false); }}
          />
          <section className="relative flex h-full w-full flex-col bg-white shadow-2xl sm:max-w-[440px]">
            <header className="flex items-center gap-3 border-b border-slate-200 bg-[#0A0E1A] px-4 py-3 text-white">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-[10px] font-bold ${config.gradient}`}
              >
                {config.icon}
              </span>
              <div className="min-w-0 flex-1">
                <b className="block truncate text-sm">AKEEM AI</b>
                <p className="truncate text-[10px] text-slate-400">
                  Context: {contextModule(activeModule)}
                </p>
              </div>
              <button
                onClick={() => { if (!sending) setOpen(false); }}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                x
              </button>
            </header>

            <div className="space-y-2 border-b border-slate-100 bg-slate-50 p-3">
              <div className="flex gap-2">
                <select
                  disabled={sending || loadingHistory}
                  value={assistant}
                  onChange={(event) =>
                    setAssistant(event.target.value as AssistantId)
                  }
                  className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold"
                >
                  {assistantOptions.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <ModeSwitch value={mode} onChange={setMode} disabled={sending} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  disabled={sending || loadingHistory}
                  value={projectId ?? ""}
                  onChange={(event) =>
                    { const next = event.target.value ? Number(event.target.value) : undefined; setProjectId(next); persistProjectSelection(next); }
                  }
                  aria-label="Project context"
                  className="h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-[10px]"
                >
                  <option value="">Organization-wide</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <select
                  disabled={sending || loadingHistory}
                  value={conversationId ?? ""}
                  onChange={(event) =>
                    void openConversation(Number(event.target.value))
                  }
                  aria-label="Conversation history"
                  className="h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-[10px]"
                >
                  <option value="">New conversation</option>
                  {conversationOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingHistory ? (
                <p className="mt-10 text-center text-xs text-slate-400">
                  Loading conversation...
                </p>
              ) : !messages.length ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl text-[11px] font-bold ${config.soft} ${config.text}`}
                  >
                    {config.icon}
                  </span>
                  <b className="mt-3 text-sm text-slate-800">
                    Ask from anywhere
                  </b>
                  <p className="mt-1 max-w-xs text-xs leading-5 text-slate-400">
                    {config.description} The current screen context is included
                    automatically.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <DrawerMessage
                      key={message.id ?? index}
                      message={message}
                      assistant={assistant}
                      onNavigate={navigate}
                    />
                  ))}
                </div>
              )}
              {sending && liveProgress && <AgentResultCards delegations={liveProgress.delegations} onNavigate={navigate}/>}
              {sending && (
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                  Agent team is working...
                </div>
              )}
              <div ref={endRef} />
            </div>

            <form onSubmit={submit} className="border-t border-slate-100 p-3">
              {error && (
                <div className="mb-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-600">
                  <span className="flex-1">{error}</span>
                  {retryText && (
                    <button
                      type="button"
                      onClick={() => void sendText(retryText, false, true)}
                      className="rounded border border-red-200 bg-white px-2 py-1 font-bold"
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}
              {disabled && (
                <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                  AI provider is not configured. Contact an administrator.
                </p>
              )}
              <div className="flex items-end gap-2 rounded-xl border border-slate-200 p-2 focus-within:border-blue-400">
                <textarea
                  rows={2}
                  value={input}
                  disabled={sending || disabled}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={keyDown}
                  placeholder={`Message ${config.label}...`}
                  className="max-h-28 min-w-0 flex-1 resize-none px-2 py-1 text-xs leading-5 outline-none"
                />
                <button
                  disabled={sending || disabled || !input.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white disabled:bg-slate-300"
                  aria-label="Send"
                >
                  →
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

function DrawerMessage({
  message,
  assistant,
  onNavigate,
}: {
  message: AssistantMessage;
  assistant: AssistantId;
  onNavigate: (id: string) => void;
}) {
  const user = message.role === "user";
  const config =
    assistantConfigs.find((item) => item.id === assistant) ??
    assistantConfigs[0];
  return (
    <div className={`flex gap-2 ${user ? "flex-row-reverse" : ""}`}>
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[8px] font-bold text-white ${user ? "bg-slate-800" : `bg-gradient-to-br ${config.gradient}`}`}
      >
        {user ? "YOU" : config.icon}
      </span>
      <div
        className={`max-w-[86%] ${user ? "rounded-2xl rounded-tr-sm bg-blue-600 px-3 py-2 text-white" : "rounded-2xl rounded-tl-sm border border-slate-100 bg-slate-50 px-3 py-2 text-slate-700"}`}
      >
        <p className="whitespace-pre-wrap text-[11px] leading-5">
          {message.content}
        </p>
        {!user && (
          <AgentResultCards
            delegations={message.delegations}
            actions={message.actions}
            onNavigate={onNavigate}
          />
        )}{" "}
        {message.model && (
          <p className="mt-1 text-[8px] opacity-50">{message.model}</p>
        )}
      </div>
    </div>
  );
}

function defaultAssistant(module: string): AssistantId {
  if (module === "crm" || module === "sales") return "sales";
  if (module === "finance" || module === "finance-ai") return "finance";
  if (module === "marketing") return "marketing";
  if (module === "legal") return "legal";
  if (module === "operations-ai" || module === "tasks" || module === "projects")
    return "operations";
  if (module === "success-ai") return "customer-success";
  if (module === "executive" || module === "reports") return "executive";
  return "ceo";
}

function contextModule(module: string) {
  const map: Record<string, string> = {
    "finance-ai": "finance",
    sales: "crm",
    "operations-ai": "projects",
    tasks: "projects",
    "success-ai": "customer-success",
    command: "dashboard",
    ceo: "dashboard",
  };
  return map[module] ?? module;
}

function drawerHistoryKey(assistant: AssistantId, projectId?: number) {
  return `ai:drawer:last:${assistant}:${projectId ?? "global"}`;
}

function announce(...groups: Array<ActionResult[] | undefined>) {
  const actions = groups
    .flatMap((group) => group ?? [])
    .filter((action) => action.status === "executed");
  if (actions.length)
    window.dispatchEvent(
      new CustomEvent("business:data-changed", { detail: { actions } }),
    );
}
