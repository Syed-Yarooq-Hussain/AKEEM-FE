import { getSelectedProjectId, selectProject as persistProjectSelection } from '../services/project-selection';
import { FormEvent, useEffect, useState } from "react";
import AgentResultCards from "../components/AgentResultCards";
import Icon from "../components/Icon";
import {
  AssistantDirectoryItem,
  AssistantId,
  getAssistantDirectory,
} from "../services/ai";
import {
  AiTask,
  cancelAITask,
  createAITask,
  getAITask,
  getAITasks,
  retryAITask,
  runAITask,
  updateAITask,
} from "../services/p0";
import { getProjects, Project } from "../services/projects";

type Props = { onNavigate: (id: string) => void };
type TaskAction = "run" | "retry" | "cancel";
const statuses = ["", "queued", "running", "completed", "failed", "cancelled"];

export default function AiTasksPage({ onNavigate }: Props) {
  const [projects, setProjects] = useState<Project[]>([]),
    [agents, setAgents] = useState<AssistantDirectoryItem[]>([]),
    [items, setItems] = useState<AiTask[]>([]);
  const [projectId, setProjectId] = useState<number>(),
    [status, setStatus] = useState(""),
    [assistant, setAssistant] = useState("");
  const [selected, setSelected] = useState<AiTask>(),
    [loading, setLoading] = useState(true),
    [working, setWorking] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [creating, setCreating] = useState(false);

  useEffect(()=>{const sync=()=>setProjectId(getSelectedProjectId());window.addEventListener('project:selected',sync);return()=>window.removeEventListener('project:selected',sync)},[]);
  useEffect(() => {
    Promise.all([getProjects(), getAssistantDirectory()])
      .then(([projectList, directory]) => {
        setProjects(projectList);
        setAgents(directory.items ?? []);
        const saved =
          Number(localStorage.getItem("selectedProjectId")) || undefined;
        const next = projectList.some((item) => item.id === saved)
          ? saved
          : projectList[0]?.id;
        setProjectId(next);
        persistProjectSelection(next);
      })
      .catch((reason) => setError(text(reason, "Unable to load task setup.")));
  }, []);
  useEffect(() => {
    void load();
  }, [projectId, status, assistant]);

  async function load(focusId?: number) {
    setLoading(true);
    setError("");
    try {
      const data = await getAITasks({
        ...(projectId ? { projectId } : {}),
        ...(status ? { status } : {}),
        ...(assistant ? { assistant: assistant as AssistantId } : {}),
      });
      setItems(data.items ?? []);
      if (focusId) {
        const fresh = await getAITask(focusId);
        setSelected(fresh);
      } else if (selected) {
        const fresh = (data.items ?? []).find(
          (item) => item.id === selected.id,
        );
        if (fresh) setSelected(fresh);
      }
    } catch (reason) {
      setError(text(reason, "Unable to load AI tasks."));
    } finally {
      setLoading(false);
    }
  }
  async function act(action: TaskAction, task: AiTask) {
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const updated =
        action === "run"
          ? await runAITask(task.id)
          : action === "retry"
            ? await retryAITask(task.id)
            : await cancelAITask(task.id);
      setSelected(updated);
      setNotice(action === "cancel" ? "Task cancelled." : "Task run finished.");
      await load(updated.id);
    } catch (reason) {
      setError(text(reason, "Task action failed."));
    } finally {
      setWorking(false);
    }
  }
  async function transfer(task: AiTask, next: AssistantId) {
    if (next === task.assistant) return;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const updated = await updateAITask(task.id, { assistant: next });
      setSelected(updated);
      setNotice(
        `Task transferred to ${labelFor(next, agents)}. ${["failed", "cancelled"].includes(updated.status) ? "Use Retry when ready." : "The new agent will handle the next run."}`,
      );
      await load(updated.id);
    } catch (reason) {
      setError(text(reason, "Unable to transfer task."));
    } finally {
      setWorking(false);
    }
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId) {
      setError("Select a project before creating an AI task.");
      return;
    }
    const form = new FormData(event.currentTarget),
      dueDate = String(form.get("dueDate") || "").trim();
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const task = await createAITask({
        projectId,
        title: String(form.get("title")),
        description: String(form.get("description")),
        assistant: String(form.get("assistant")),
        priority: String(form.get("priority")),
        executionMode: String(form.get("executionMode")),
        runNow: String(form.get("runNow")) === "true",
        ...(dueDate ? { dueDate } : {}),
        input: { source: "frontend-task-workspace" },
      });
      setCreating(false);
      setSelected(task);
      setNotice(
        task.status === "completed"
          ? "Task completed and its result is ready."
          : "Task created in the queue.",
      );
      await load(task.id);
    } catch (reason) {
      setError(text(reason, "Unable to create AI task."));
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-blue-600">
            Agent work queue
          </p>
          <h1 className="mt-1 text-2xl font-bold">AI Tasks</h1>
          <p className="mt-1 text-sm text-slate-500">
            Assign project work to an agent, follow progress, transfer
            ownership, and open the final result.
          </p>
        </div>
        <button
          disabled={!projectId}
          onClick={() => setCreating(true)}
          className="flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Icon name="plus" className="h-4 w-4" />
          New AI task
        </button>
      </div>
      <section className="mt-5 grid gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-[11px] leading-5 text-blue-800 sm:grid-cols-3">
        <p>
          <b>1. Pick a project</b>
          <br />
          The selected project supplies the business context.
        </p>
        <p>
          <b>2. Assign an agent</b>
          <br />
          Choose Finance, Sales, Legal, Operations, or another specialist.
        </p>
        <p>
          <b>3. Review or transfer</b>
          <br />
          Open a task to see its answer or move queued/retry work to another
          agent.
        </p>
      </section>
      <div className="mt-4 grid gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-3">
        <select
          value={projectId ?? ""}
          onChange={(event) => {
            const next = event.target.value
              ? Number(event.target.value)
              : undefined;
            setProjectId(next);
            persistProjectSelection(next);
          }}
          className="h-10 rounded-lg border border-slate-200 px-3 text-xs"
        >
          <option value="">Select project (required)</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <select
          value={assistant}
          onChange={(event) => setAssistant(event.target.value)}
          className="h-10 rounded-lg border border-slate-200 px-3 text-xs"
        >
          <option value="">All agents</option>
          {agentOptions(agents).map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.label}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-10 rounded-lg border border-slate-200 px-3 text-xs"
        >
          {statuses.map((value) => (
            <option key={value} value={value}>
              {value ? title(value) : "All statuses"}
            </option>
          ))}
        </select>
      </div>
      {!projectId && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Create or select a project first. AI tasks cannot run without project
          context.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-600"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700"
        >
          {notice}
        </p>
      )}
      {loading ? (
        <div className="mt-5 h-48 animate-pulse rounded-xl bg-slate-200" />
      ) : items.length ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              project={projects.find((item) => item.id === task.projectId)}
              agents={agents}
              onOpen={() => setSelected(task)}
              onAct={act}
              disabled={working}
            />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Icon name="bot" className="mx-auto h-7 w-7 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-600">
            No AI tasks in this view
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Create one and assign it to the specialist best suited for the job.
          </p>
        </div>
      )}
      {creating && (
        <CreateTaskDialog
          projects={projects}
          projectId={projectId}
          agents={agents}
          saving={working}
          onClose={() => setCreating(false)}
          onSubmit={create}
        />
      )}
      {selected && (
        <TaskDetail
          task={selected}
          project={projects.find((item) => item.id === selected.projectId)}
          agents={agents}
          working={working}
          onClose={() => setSelected(undefined)}
          onAct={act}
          onTransfer={transfer}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}

function TaskCard({
  task,
  project,
  agents,
  onOpen,
  onAct,
  disabled,
}: {
  task: AiTask;
  project?: Project;
  agents: AssistantDirectoryItem[];
  onOpen: () => void;
  onAct: (action: TaskAction, task: AiTask) => Promise<void>;
  disabled: boolean;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
          <Icon name="bot" className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold text-slate-800">
            {task.title}
          </h2>
          <p className="mt-0.5 truncate text-[10px] text-slate-400">
            {project?.name || `Project #${task.projectId}`} ·{" "}
            {labelFor(task.assistant, agents)}
          </p>
        </div>
        <Status value={task.status} />
      </div>
      <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-slate-500">
        {task.description || "No additional instructions."}
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${task.status === "failed" ? "bg-red-500" : task.status === "completed" ? "bg-emerald-500" : "bg-blue-500"}`}
          style={{ width: `${Math.max(4, task.progress ?? 0)}%` }}
        />
      </div>
      <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3">
        <button onClick={onOpen} className="font-bold text-blue-600">
          Open details
        </button>
        <span className="flex-1" />
        {task.status === "queued" && (
          <button
            disabled={disabled}
            onClick={() => void onAct("run", task)}
            className="font-semibold text-emerald-600 disabled:text-slate-300"
          >
            Run
          </button>
        )}
        {["failed", "cancelled"].includes(task.status) && (
          <button
            disabled={disabled}
            onClick={() => void onAct("retry", task)}
            className="font-semibold text-blue-600 disabled:text-slate-300"
          >
            Retry
          </button>
        )}
        {["queued", "running"].includes(task.status) && (
          <button
            disabled={disabled}
            onClick={() => void onAct("cancel", task)}
            className="font-semibold text-red-500 disabled:text-slate-300"
          >
            Cancel
          </button>
        )}
      </div>
    </article>
  );
}

function TaskDetail({
  task,
  project,
  agents,
  working,
  onClose,
  onAct,
  onTransfer,
  onNavigate,
}: {
  task: AiTask;
  project?: Project;
  agents: AssistantDirectoryItem[];
  working: boolean;
  onClose: () => void;
  onAct: (action: TaskAction, task: AiTask) => Promise<void>;
  onTransfer: (task: AiTask, next: AssistantId) => Promise<void>;
  onNavigate: (id: string) => void;
}) {
  const transferable = !["running", "completed"].includes(task.status);
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/40"
      role="dialog"
      aria-modal="true"
      aria-label="AI task details"
    >
      <button
        className="absolute inset-0 cursor-default"
        aria-label="Close task details"
        onClick={onClose}
      />
      <section className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        <header className="flex items-start gap-3 border-b border-slate-200 p-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Status value={task.status} />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Task #{task.id}
              </span>
            </div>
            <h2 className="mt-2 text-lg font-bold text-slate-900">
              {task.title}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {project?.name || `Project #${task.projectId}`} ·{" "}
              {labelFor(task.assistant, agents)} ·{" "}
              {title(task.priority || "medium")} priority
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
            aria-label="Close"
          >
            x
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">
          <section className="rounded-xl bg-slate-50 p-4">
            <h3 className="text-xs font-bold text-slate-700">Instructions</h3>
            <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">
              {task.description || task.title}
            </p>
          </section>
          {task.error && (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-600">
              {task.error}
            </p>
          )}
          <section className="mt-4 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700">
                Agent assignment
              </h3>
              {!transferable && (
                <span className="text-[10px] text-slate-400">
                  Completed/running work cannot be transferred
                </span>
              )}
            </div>
            <div className="mt-2 flex gap-2">
              <select
                key={`${task.id}-${task.assistant}`}
                disabled={!transferable || working}
                defaultValue={task.assistant}
                onChange={(event) =>
                  void onTransfer(task, event.target.value as AssistantId)
                }
                className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-xs"
              >
                {agentOptions(agents).map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-2 text-[10px] text-slate-400">
              Transfer changes the agent responsible for the next queued or
              retry run.
            </p>
          </section>
          <section className="mt-4">
            <h3 className="text-xs font-bold text-slate-700">Result</h3>
            {task.output?.answer ? (
              <div className="mt-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <p className="whitespace-pre-wrap text-xs leading-5 text-slate-700">
                  {task.output.answer}
                </p>
                <AgentResultCards
                  delegations={task.output.delegations}
                  actions={task.output.actions}
                  onNavigate={onNavigate}
                />
              </div>
            ) : (
              <div className="mt-2 rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                {task.status === "completed"
                  ? "The task completed without a written answer."
                  : "The result will appear here after the task runs."}
              </div>
            )}
          </section>
          <div className="mt-4 grid grid-cols-2 gap-3 text-[10px] text-slate-500 sm:grid-cols-4">
            <Meta label="Progress" value={`${task.progress ?? 0}%`} />
            <Meta label="Attempts" value={String(task.attemptCount ?? 0)} />
            <Meta label="Started" value={date(task.startedAt)} />
            <Meta label="Completed" value={date(task.completedAt)} />
          </div>
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-200 p-4">
          {task.status === "queued" && (
            <button
              disabled={working}
              onClick={() => void onAct("run", task)}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:bg-slate-300"
            >
              Run task
            </button>
          )}
          {["failed", "cancelled"].includes(task.status) && (
            <button
              disabled={working}
              onClick={() => void onAct("retry", task)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:bg-slate-300"
            >
              Retry task
            </button>
          )}
          {["queued", "running"].includes(task.status) && (
            <button
              disabled={working}
              onClick={() => void onAct("cancel", task)}
              className="rounded-lg border border-red-200 px-4 py-2 text-xs font-bold text-red-600 disabled:text-slate-300"
            >
              Cancel
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}

function CreateTaskDialog({
  projects,
  projectId,
  agents,
  saving,
  onClose,
  onSubmit,
}: {
  projects: Project[];
  projectId?: number;
  agents: AssistantDirectoryItem[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={onSubmit}
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Assign a new AI task</h2>
            <p className="mt-1 text-xs text-slate-400">
              Describe the outcome, not just the topic.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            x
          </button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field
            name="title"
            label="Task title"
            required
            placeholder="Prepare monthly finance review"
            wide
          />
          <label>
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Project
            </span>
            <select
              name="projectId"
              value={projectId ?? ""}
              disabled
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm"
            >
              <option value="">Select project first</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Assigned agent
            </span>
            <select
              name="assistant"
              defaultValue="operations"
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            >
              {agentOptions(agents).map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Priority
            </span>
            <select
              name="priority"
              defaultValue="medium"
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            >
              <option>low</option>
              <option>medium</option>
              <option>high</option>
              <option>urgent</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Due date
            </span>
            <input
              name="dueDate"
              type="date"
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Execution safety
            </span>
            <select
              name="executionMode"
              defaultValue="suggest"
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            >
              <option value="suggest">Suggest only</option>
              <option value="auto">Allow safe actions</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Start
            </span>
            <select
              name="runNow"
              defaultValue="false"
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            >
              <option value="false">Save to queue</option>
              <option value="true">Run immediately</option>
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Detailed instructions
            </span>
            <textarea
              name="description"
              required
              rows={5}
              placeholder="Analyze the selected project's real data, list the top risks, and return five actions with owners and deadlines. Do not create records."
              className="w-full rounded-lg border border-slate-200 p-3 text-sm leading-5 outline-none focus:border-blue-400"
            />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            disabled={saving || !projectId}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:bg-slate-300"
          >
            {saving ? "Saving..." : "Create task"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  wide,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "sm:col-span-2" : ""}>
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </span>
      <input
        {...props}
        className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-400"
      />
    </label>
  );
}
function Status({ value }: { value: AiTask["status"] }) {
  const color = {
    queued: "bg-amber-50 text-amber-700",
    running: "bg-blue-50 text-blue-700",
    completed: "bg-emerald-50 text-emerald-700",
    failed: "bg-red-50 text-red-700",
    cancelled: "bg-slate-100 text-slate-600",
  }[value];
  return (
    <span
      className={`rounded-full px-2 py-1 text-[9px] font-bold capitalize ${color}`}
    >
      {value}
    </span>
  );
}
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <span className="block text-slate-400">{label}</span>
      <b className="mt-0.5 block text-slate-600">{value}</b>
    </div>
  );
}
function agentOptions(items: AssistantDirectoryItem[]) {
  return items.length
    ? items.map((item) => ({ id: item.key, label: item.label }))
    : [
        { id: "ceo" as AssistantId, label: "CEO Assistant" },
        { id: "executive" as AssistantId, label: "Executive Assistant" },
        { id: "sales" as AssistantId, label: "Sales AI" },
        { id: "finance" as AssistantId, label: "Finance AI" },
        { id: "marketing" as AssistantId, label: "Marketing AI" },
        { id: "legal" as AssistantId, label: "Legal AI" },
        { id: "operations" as AssistantId, label: "Operations AI" },
        { id: "customer-success" as AssistantId, label: "Customer Success AI" },
      ];
}
function labelFor(id: AssistantId, items: AssistantDirectoryItem[]) {
  return agentOptions(items).find((item) => item.id === id)?.label || title(id);
}
function title(value: string) {
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function date(value?: string) {
  if (!value) return "Not yet";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Unknown" : parsed.toLocaleString();
}
function text(reason: unknown, fallback: string) {
  return reason instanceof Error ? reason.message : fallback;
}
