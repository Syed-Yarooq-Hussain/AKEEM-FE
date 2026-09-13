import { getSelectedProjectId, selectProject as persistProjectSelection } from '../services/project-selection';
import { FormEvent, useEffect, useRef, useState } from "react";
import Icon from "../components/Icon";
import {
  deleteFile,
  downloadReport,
  downloadFile,
  generateReport,
  uploadFile,
} from "../services/mutations";
import { getProjects, Project } from "../services/projects";
import {
  FileRecord,
  getFile,
  reprocessFile,
  listFiles,
  listReports,
  ReportRecord,
} from "../services/resources";

type Props = { mode: "files" | "reports" };
const assistants = [
  "ceo",
  "executive",
  "sales",
  "finance",
  "marketing",
  "legal",
  "operations",
  "customer-success",
];

export default function FilesReportsPage({ mode }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number>();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [assistant, setAssistant] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(()=>{const sync=()=>setProjectId(getSelectedProjectId());window.addEventListener('project:selected',sync);return()=>window.removeEventListener('project:selected',sync)},[]);
  useEffect(() => {
    getProjects()
      .then((items) => {
        setProjects(items);
        const saved =
          Number(localStorage.getItem("selectedProjectId")) || undefined;
        if (items.some((project) => project.id === saved)) setProjectId(saved);
      })
      .catch(() => undefined);
  }, []);
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      if (mode === "files") setFiles(await listFiles(projectId));
      else setReports(await listReports(projectId, assistant || undefined));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : `Unable to load ${mode}.`,
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [mode, projectId, assistant]);

  useEffect(()=>{
    if(mode!=='files')return;
    const pending=files.filter(file=>file.processingStatus==='pending'||file.processingStatus==='processing');
    if(!pending.length)return;
    let active=true;const timer=window.setTimeout(async()=>{
      const results=await Promise.allSettled(pending.map(file=>getFile(file.id)));
      if(!active)return;
      const updated=results.flatMap(result=>result.status==='fulfilled'?[result.value]:[]);
      if(updated.length)setFiles(current=>current.map(file=>updated.find(next=>next.id===file.id)??file));
      else setError('Unable to check document processing. Use Refresh to try again.');
    },2000);
    return()=>{active=false;window.clearTimeout(timer)};
  },[files,mode,projectId]);
  async function fileAction(id:number,retry=false){try{setError('');if(retry){await reprocessFile(id);await load()}else await downloadFile(id)}catch(reason){setError(reason instanceof Error?reason.message:'File action failed.')}}
  async function chooseFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!projectId) {
      setError("Select a project before uploading a document.");
      event.target.value = "";
      return;
    }
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (
      !extension ||
      ![
        "pdf",
        "docx",
        "xlsx",
        "csv",
        "txt",
        "md",
        "json",
        "png",
        "jpg",
        "jpeg",
        "webp",
        "gif",
        "bmp",
        "tif",
        "tiff",
        "markdown",
      ].includes(extension)
    ) {
      setError("Use PDF, DOCX, XLSX, CSV, text, JSON, or supported image files.");
      event.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File must be 10 MB or smaller.");
      event.target.value = "";
      return;
    }
    setSaving(true);
    setError("");
    try {
      await uploadFile(file, projectId);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Upload failed.");
    } finally {
      setSaving(false);
      event.target.value = "";
    }
  }
  async function remove(file: FileRecord) {
    if (
      !window.confirm(
        `Delete ${file.originalName || file.name || "this file"}?`,
      )
    )
      return;
    try {
      await deleteFile(file.id);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to delete file.",
      );
    }
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget),
      selectedProjectId = Number(form.get("projectId")) || undefined;
    try {
      await generateReport({
        projectId: selectedProjectId,
        title: String(form.get("title")),
        assistant: String(form.get("assistant")),
        format: String(form.get("format") || "markdown"),
        metadata: { source: "frontend" },
      });
      setShowCreate(false);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to generate report.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-blue-600">
            Knowledge
          </p>
          <h1 className="mt-1 text-2xl font-bold capitalize">{mode}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {mode === "files"
              ? "Store and organize documents under a project."
              : "Generate and download persisted AI reports."}
          </p>
        </div>
        <div className="flex gap-2">
          {mode === "files" ? (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.xlsx,.csv,.txt,.md,.markdown,.json,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tif,.tiff"
                className="hidden"
                onChange={(event) => void chooseFile(event)}
              />
              <button
                disabled={saving || !projectId}
                onClick={() => fileRef.current?.click()}
                title={!projectId ? "Select a project first" : undefined}
                className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Icon name="plus" className="h-4 w-4" />
                {saving
                  ? "Uploading..."
                  : projectId
                    ? "Upload file"
                    : "Select project first"}
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white"
            >
              <Icon name="plus" className="h-4 w-4" />
              Generate report
            </button>
          )}
        </div>
      </div>
      {mode === "files" && (
        <section className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-xs font-bold text-amber-900">
            How uploaded data works right now
          </h2>
          <ol className="mt-2 grid gap-2 text-[11px] leading-5 text-amber-800 sm:grid-cols-3">
            <li>
              <b>1. Select a project</b>
              <br />
              Choose it below before uploading so the document is stored with
              the correct project.
            </li>
            <li>
              <b>2. Upload the document</b>
              <br />
              PDF, Office, CSV, text, JSON, or image files up to 10 MB are
              accepted.
            </li>
            <li>
              <b>3. Wait for processing</b>
              <br />
              When a file is ready, assistants can use its contents in this
              project. If processing fails, use Retry processing. Financial
              records still belong in Finance for structured reporting.
            </li>
          </ol>
        </section>
      )}
      <div className="mt-5 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row">
        <select
          value={projectId ?? ""}
          onChange={(event) =>
            { const next = event.target.value ? Number(event.target.value) : undefined; setProjectId(next); persistProjectSelection(next); }
          }
          className="h-9 min-w-52 rounded-lg border border-slate-200 px-3 text-xs"
        >
          <option value="">All projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        {mode === "reports" && (
          <select
            value={assistant}
            onChange={(event) => setAssistant(event.target.value)}
            className="h-9 rounded-lg border border-slate-200 px-3 text-xs"
          >
            <option value="">All assistants</option>
            {assistants.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        )}
        <button
          onClick={() => void load()}
          className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold sm:ml-auto"
        >
          Refresh
        </button>
      </div>
      {error && (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-600">
          {error}
        </p>
      )}
      {loading ? (
        <div className="mt-5 h-44 animate-pulse rounded-xl bg-slate-200" />
      ) : mode === "files" ? (
        <FileList items={files} onDelete={remove} onDownload={id=>void fileAction(id)} onRetry={id=>void fileAction(id,true)} />
      ) : (
        <ReportList
          items={reports}
          onDownload={async (id) => {
            try {
              await downloadReport(id);
            } catch (reason) {
              setError(
                reason instanceof Error ? reason.message : "Download failed.",
              );
            }
          }}
        />
      )}
      {showCreate && (
        <ReportDialog
          projects={projects}
          projectId={projectId}
          saving={saving}
          onClose={() => setShowCreate(false)}
          onSubmit={create}
        />
      )}
    </div>
  );
}

function FileList({
  items,
  onDelete,
  onDownload,
  onRetry,
}: {
  items: FileRecord[];
  onDelete: (file: FileRecord) => void;
  onDownload: (id:number)=>void;
  onRetry: (id:number)=>void;
}) {
  return items.length ? (
    <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="divide-y divide-slate-100">
        {items.map((file) => (
          <div key={file.id} className="flex items-center gap-3 px-4 py-3">
            <span className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Icon name="check" className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <b className="block truncate text-xs">
                {file.originalName ||
                  file.name ||
                  file.filename ||
                  `File #${file.id}`}
              </b>
              <p className="mt-0.5 text-[10px] text-slate-400">
                {[
                  file.processingStatus,
                  file.mimeType,
                  (file.sizeBytes ?? file.size) != null
                    ? size((file.sizeBytes ?? file.size)!)
                    : "",
                  file.createdAt
                    ? new Date(file.createdAt).toLocaleString()
                    : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            {file.processingError&&<span className="text-xs text-red-600">{file.processingError}</span>}
            {file.processingStatus==='failed'&&<button onClick={()=>onRetry(file.id)} className="text-[10px] font-bold text-amber-700">Retry processing</button>}
            <button onClick={()=>onDownload(file.id)} className="text-[10px] font-bold text-blue-600">Download</button>
            <button
              onClick={() => onDelete(file)}
              className="text-[10px] font-bold text-red-500"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  ) : (
    <Empty text="No files found." />
  );
}
function ReportList({
  items,
  onDownload,
}: {
  items: ReportRecord[];
  onDownload: (id: number) => void;
}) {
  return items.length ? (
    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((report) => (
        <article
          key={report.id}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <span className="rounded-lg bg-violet-50 px-2 py-1 text-[9px] font-bold uppercase text-violet-700">
            {report.format || "report"}
          </span>
          <h2 className="mt-3 truncate text-sm font-bold">
            {report.title || `Report #${report.id}`}
          </h2>
          <p className="mt-1 text-xs capitalize text-slate-400">
            {report.assistant?.replace("-", " ") || "AI"} assistant
          </p>
          <p className="mt-4 text-[10px] text-slate-400">
            {report.createdAt
              ? new Date(report.createdAt).toLocaleString()
              : "Date unavailable"}
          </p>
          <button
            onClick={() => onDownload(report.id)}
            className="mt-4 w-full rounded-lg bg-blue-50 py-2 text-[10px] font-bold text-blue-700 hover:bg-blue-100"
          >
            Download
          </button>
        </article>
      ))}
    </div>
  ) : (
    <Empty text="No reports found." />
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}
function ReportDialog({
  projects,
  projectId,
  saving,
  onClose,
  onSubmit,
}: {
  projects: Project[];
  projectId?: number;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-lg rounded-t-2xl bg-white p-5 sm:rounded-2xl"
      >
        <div className="flex justify-between">
          <h2 className="text-lg font-bold">Generate report</h2>
          <button type="button" onClick={onClose}>
            x
          </button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs text-slate-600">Title</span>
            <input
              required
              name="title"
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs text-slate-600">Project</span>
            <select
              name="projectId"
              defaultValue={projectId ?? ""}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            >
              <option value="">Organization-wide</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs text-slate-600">Assistant</span>
            <select
              required
              name="assistant"
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            >
              {assistants.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs text-slate-600">Format</span>
            <select
              name="format"
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            >
              <option value="markdown">Markdown</option>
              <option value="pdf">PDF</option>
              <option value="html">HTML</option>
            </select>
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
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:bg-blue-300"
          >
            {saving ? "Generating..." : "Generate"}
          </button>
        </div>
      </form>
    </div>
  );
}
function size(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
