"use client";

import { useEffect, useMemo, useState } from "react";

type TaskStatus = "INBOX" | "NEXT" | "DOING" | "BLOCKED" | "DONE";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type TaskType = "FEATURE" | "BUG" | "CHORE" | "RESEARCH";

type Task = {
  id: string;
  title: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  owner: string | null;
  deadline: string | null;
  context: string | null;
  expectedOutput: string | null;
  readiness?: {
    state: "READY" | "NOT_READY" | "NOT_APPLICABLE";
    requiredTotal: number;
    requiredPassed: number;
    total: number;
  };
  createdAt: string;
  updatedAt: string;
};

type Agent = {
  id: string;
  name: string;
  mission: string;
  status: string;
  blocker: string | null;
  nextStep: string | null;
  lastUpdate: string;
};

type TaskTemplate = {
  id: string;
  key: string;
  name: string;
};

const statusColumns: { status: TaskStatus; label: string; hint: string }[] = [
  { status: "INBOX", label: "Inbox", hint: "Captured, not triaged" },
  { status: "NEXT", label: "Next", hint: "Ready for execution" },
  { status: "DOING", label: "Doing", hint: "Currently in progress" },
  { status: "BLOCKED", label: "Blocked", hint: "Needs a dependency" },
  { status: "DONE", label: "Done", hint: "Shipped and verified" },
];

const taskPriorities: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const taskTypes: TaskType[] = ["FEATURE", "BUG", "CHORE", "RESEARCH"];
const agentStatuses = ["Active", "Idle", "Blocked", "Done"];

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function readinessLabel(task: Task) {
  if (!task.readiness) return null;
  if (task.readiness.state === "NOT_APPLICABLE") return "Ready: n/a";
  return `Ready: ${task.readiness.requiredPassed}/${task.readiness.requiredTotal}`;
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draftTask, setDraftTask] = useState({
    title: "",
    templateKey: "",
    type: "FEATURE" as TaskType,
    priority: "MEDIUM" as TaskPriority,
    status: "INBOX" as TaskStatus,
    owner: "",
    deadline: "",
    context: "",
    expectedOutput: "",
  });

  async function loadData() {
    try {
      setError(null);
      const [taskRes, agentRes, templateRes] = await Promise.all([
        fetch("/api/tasks", { cache: "no-store" }),
        fetch("/api/agents", { cache: "no-store" }),
        fetch("/api/task-templates", { cache: "no-store" }),
      ]);

      if (!taskRes.ok || !agentRes.ok || !templateRes.ok) {
        throw new Error("Failed to load board data");
      }

      const [taskData, agentData, templateData] = await Promise.all([
        taskRes.json() as Promise<Task[]>,
        agentRes.json() as Promise<Agent[]>,
        templateRes.json() as Promise<TaskTemplate[]>,
      ]);

      setTasks(taskData);
      setAgents(agentData);
      setTemplates(templateData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const grouped = useMemo(() => {
    return statusColumns.reduce(
      (acc, column) => {
        acc[column.status] = tasks.filter((task) => task.status === column.status);
        return acc;
      },
      {} as Record<TaskStatus, Task[]>,
    );
  }, [tasks]);

  const metrics = useMemo(() => {
    const doing = tasks.filter((task) => task.status === "DOING").length;
    const blocked = tasks.filter((task) => task.status === "BLOCKED").length;
    const done = tasks.filter((task) => task.status === "DONE").length;
    const activeAgents = agents.filter((agent) => agent.status === "Active").length;
    return { total: tasks.length, doing, blocked, done, activeAgents };
  }, [tasks, agents]);

  async function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftTask.title.trim()) return;

    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...draftTask,
        templateKey: draftTask.templateKey || null,
        owner: draftTask.owner || null,
        deadline: draftTask.deadline || null,
        context: draftTask.context || null,
        expectedOutput: draftTask.expectedOutput || null,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error || "Task creation failed. Please retry.");
      return;
    }

    setDraftTask({
      title: "",
      templateKey: "",
      type: "FEATURE",
      priority: "MEDIUM",
      status: "INBOX",
      owner: "",
      deadline: "",
      context: "",
      expectedOutput: "",
    });

    await loadData();
  }

  async function updateTaskStatus(id: string, status: TaskStatus) {
    const response = await fetch(`/api/tasks/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string; code?: string } | null;
      if (payload?.code === "TASK_NOT_READY") {
        setError("Task is not ready: complete required readiness checks first.");
      } else {
        setError(payload?.error || "Task update failed.");
      }
      return;
    }

    await loadData();
  }

  async function deleteTask(id: string) {
    const response = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Task deletion failed.");
      return;
    }
    await loadData();
  }

  async function updateAgent(
    id: string,
    payload: { status: string; blocker?: string | null; nextStep?: string | null },
  ) {
    const response = await fetch(`/api/agents/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setError("Agent update failed.");
      return;
    }

    await loadData();
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] px-4 py-6 text-[var(--fg)] sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
        <header className="panel p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="eyebrow">Operations Command</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">AgentBoard</h1>
              <p className="mt-2 text-sm text-[var(--muted)] sm:text-base">
                Ship work confidently with a fast task board, live agent visibility, and reliable APIs.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Metric label="Tasks" value={metrics.total} />
              <Metric label="Doing" value={metrics.doing} />
              <Metric label="Blocked" value={metrics.blocked} />
              <Metric label="Done" value={metrics.done} />
              <Metric label="Active Agents" value={metrics.activeAgents} />
            </div>
          </div>
        </header>

        {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

        <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <article className="panel p-5">
            <h2 className="text-lg font-semibold">Create task</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Capture scope with owner, due date, and expected output.</p>
            <form className="mt-4 space-y-3" onSubmit={createTask}>
              <label className="field">
                <span>Title</span>
                <input
                  required
                  value={draftTask.title}
                  onChange={(event) => setDraftTask((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Implement agent timeline view"
                />
              </label>

              <label className="field">
                <span>Template (optional)</span>
                <select
                  value={draftTask.templateKey}
                  onChange={(event) => setDraftTask((prev) => ({ ...prev, templateKey: event.target.value }))}
                >
                  <option value="">No template</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.key}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="field">
                  <span>Type</span>
                  <select
                    value={draftTask.type}
                    onChange={(event) => setDraftTask((prev) => ({ ...prev, type: event.target.value as TaskType }))}
                  >
                    {taskTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Priority</span>
                  <select
                    value={draftTask.priority}
                    onChange={(event) =>
                      setDraftTask((prev) => ({ ...prev, priority: event.target.value as TaskPriority }))
                    }
                  >
                    {taskPriorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Status</span>
                  <select
                    value={draftTask.status}
                    onChange={(event) =>
                      setDraftTask((prev) => ({ ...prev, status: event.target.value as TaskStatus }))
                    }
                  >
                    {statusColumns.map((status) => (
                      <option key={status.status} value={status.status}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="field">
                <span>Owner</span>
                <input
                  value={draftTask.owner}
                  onChange={(event) => setDraftTask((prev) => ({ ...prev, owner: event.target.value }))}
                  placeholder="Backend Agent"
                />
              </label>

              <label className="field">
                <span>Deadline</span>
                <input
                  type="date"
                  value={draftTask.deadline}
                  onChange={(event) => setDraftTask((prev) => ({ ...prev, deadline: event.target.value }))}
                />
              </label>

              <label className="field">
                <span>Context</span>
                <textarea
                  value={draftTask.context}
                  onChange={(event) => setDraftTask((prev) => ({ ...prev, context: event.target.value }))}
                  placeholder="Notes, links, assumptions"
                  rows={3}
                />
              </label>

              <label className="field">
                <span>Expected output</span>
                <textarea
                  value={draftTask.expectedOutput}
                  onChange={(event) =>
                    setDraftTask((prev) => ({ ...prev, expectedOutput: event.target.value }))
                  }
                  placeholder="PR merged + deployment verified"
                  rows={2}
                />
              </label>

              <button className="btn-primary" type="submit">
                Add task
              </button>
            </form>
          </article>

          <article className="panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Kanban board</h2>
              {isLoading ? <p className="text-xs text-[var(--muted)]">Loading…</p> : null}
            </div>
            <div className="grid grid-cols-1 gap-4 2xl:grid-cols-5 lg:grid-cols-2">
              {statusColumns.map((column) => (
                <section key={column.status} className="kanban-col">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{column.label}</h3>
                      <p className="text-xs text-[var(--muted)]">{column.hint}</p>
                    </div>
                    <span className="pill">{grouped[column.status]?.length ?? 0}</span>
                  </div>

                  <div className="space-y-2">
                    {(grouped[column.status] || []).map((task) => (
                      <article key={task.id} className="task-card">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold leading-snug">{task.title}</p>
                          <button
                            type="button"
                            aria-label={`Delete ${task.title}`}
                            onClick={() => deleteTask(task.id)}
                            className="text-xs text-rose-600 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                        <p className="text-xs text-[var(--muted)]">
                          {task.type} • {task.priority}
                          {task.owner ? ` • ${task.owner}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-[var(--muted)]">Due: {formatDate(task.deadline)}</p>
                        {task.readiness ? (
                          <p className="mt-1 text-xs text-[var(--muted)]">{readinessLabel(task)}</p>
                        ) : null}
                        {task.expectedOutput ? (
                          <p className="mt-2 rounded-md bg-[var(--bg)] p-2 text-xs text-[var(--muted)]">
                            <strong className="text-[var(--fg)]">Output:</strong> {task.expectedOutput}
                          </p>
                        ) : null}
                        <select
                          value={task.status}
                          onChange={(event) => updateTaskStatus(task.id, event.target.value as TaskStatus)}
                          className="mt-2 w-full"
                        >
                          {statusColumns.map((statusOpt) => (
                            <option key={statusOpt.status} value={statusOpt.status}>
                              {statusOpt.label}
                            </option>
                          ))}
                        </select>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </article>
        </section>

        <section className="panel p-5">
          <h2 className="text-lg font-semibold">Agents</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Track mission status, blockers, and immediate next steps.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent) => (
              <article key={agent.id} className="task-card">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{agent.name}</h3>
                    <p className="text-sm text-[var(--muted)]">{agent.mission}</p>
                  </div>
                  <select
                    value={agent.status}
                    onChange={(event) =>
                      updateAgent(agent.id, {
                        status: event.target.value,
                        blocker: agent.blocker,
                        nextStep: agent.nextStep,
                      })
                    }
                  >
                    {agentStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="field mt-3">
                  <span>Blocker</span>
                  <input
                    value={agent.blocker ?? ""}
                    onChange={(event) =>
                      setAgents((prev) =>
                        prev.map((entry) =>
                          entry.id === agent.id ? { ...entry, blocker: event.target.value } : entry,
                        ),
                      )
                    }
                    onBlur={(event) =>
                      updateAgent(agent.id, {
                        status: agent.status,
                        blocker: event.target.value || null,
                        nextStep: agent.nextStep,
                      })
                    }
                    placeholder="Dependency, decision, review"
                  />
                </label>

                <label className="field mt-3">
                  <span>Next step</span>
                  <textarea
                    rows={2}
                    value={agent.nextStep ?? ""}
                    onChange={(event) =>
                      setAgents((prev) =>
                        prev.map((entry) =>
                          entry.id === agent.id ? { ...entry, nextStep: event.target.value } : entry,
                        ),
                      )
                    }
                    onBlur={(event) =>
                      updateAgent(agent.id, {
                        status: agent.status,
                        blocker: agent.blocker,
                        nextStep: event.target.value || null,
                      })
                    }
                  />
                </label>

                <p className="mt-2 text-xs text-[var(--muted)]">Updated: {formatDate(agent.lastUpdate)}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-soft)] p-3 text-center">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-[var(--muted)]">{label}</p>
    </div>
  );
}
