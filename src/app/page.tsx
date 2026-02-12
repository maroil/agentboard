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

const columns: { status: TaskStatus; label: string }[] = [
  { status: "INBOX", label: "Inbox" },
  { status: "NEXT", label: "Next" },
  { status: "DOING", label: "Doing" },
  { status: "BLOCKED", label: "Blocked" },
  { status: "DONE", label: "Done" },
];

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isSavingTask, setIsSavingTask] = useState(false);

  async function loadData() {
    const [taskRes, agentRes] = await Promise.all([
      fetch("/api/tasks", { cache: "no-store" }),
      fetch("/api/agents", { cache: "no-store" }),
    ]);

    const [tasksData, agentsData] = await Promise.all([
      taskRes.json(),
      agentRes.json(),
    ]);

    setTasks(tasksData);
    setAgents(agentsData);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const grouped = useMemo(() => {
    return columns.reduce(
      (acc, column) => {
        acc[column.status] = tasks.filter((task) => task.status === column.status);
        return acc;
      },
      {} as Record<TaskStatus, Task[]>,
    );
  }, [tasks]);

  async function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newTaskTitle.trim()) return;

    setIsSavingTask(true);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTaskTitle,
        status: "INBOX",
      }),
    });

    setNewTaskTitle("");
    setIsSavingTask(false);
    await loadData();
  }

  async function updateTaskStatus(id: string, status: TaskStatus) {
    await fetch(`/api/tasks/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    await loadData();
  }

  async function updateAgentStatus(id: string, status: string) {
    const current = agents.find((agent) => agent.id === id);

    await fetch(`/api/agents/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        blocker: current?.blocker,
        nextStep: current?.nextStep,
      }),
    });

    await loadData();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">AgentBoard</h1>
          <p className="text-sm text-slate-600">
            Sprint MVP: task flow + agent execution visibility.
          </p>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Quick Task Creation
          </h2>
          <form onSubmit={createTask} className="flex flex-col gap-3 sm:flex-row">
            <input
              value={newTaskTitle}
              onChange={(event) => setNewTaskTitle(event.target.value)}
              placeholder="Add a new task title..."
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none ring-indigo-500 transition focus:ring-2"
            />
            <button
              type="submit"
              disabled={isSavingTask}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {isSavingTask ? "Saving..." : "Add task"}
            </button>
          </form>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Kanban Board
          </h2>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
            {columns.map((column) => (
              <div
                key={column.status}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">{column.label}</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {grouped[column.status]?.length ?? 0}
                  </span>
                </div>

                <div className="space-y-2">
                  {(grouped[column.status] || []).map((task) => (
                    <article
                      key={task.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                    >
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {task.type} • {task.priority}
                        {task.owner ? ` • ${task.owner}` : ""}
                      </p>
                      <select
                        value={task.status}
                        onChange={(event) =>
                          updateTaskStatus(task.id, event.target.value as TaskStatus)
                        }
                        className="mt-2 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                      >
                        {columns.map((statusOpt) => (
                          <option key={statusOpt.status} value={statusOpt.status}>
                            {statusOpt.label}
                          </option>
                        ))}
                      </select>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Agents Panel
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {agents.map((agent) => (
              <article
                key={agent.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{agent.name}</p>
                    <p className="text-sm text-slate-600">{agent.mission}</p>
                  </div>
                  <select
                    value={agent.status}
                    onChange={(event) => updateAgentStatus(agent.id, event.target.value)}
                    className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                  >
                    <option value="Active">Active</option>
                    <option value="Idle">Idle</option>
                    <option value="Blocked">Blocked</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
                {agent.blocker ? (
                  <p className="mt-2 text-xs text-rose-600">Blocker: {agent.blocker}</p>
                ) : null}
                {agent.nextStep ? (
                  <p className="mt-1 text-xs text-slate-600">Next: {agent.nextStep}</p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
