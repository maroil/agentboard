import { TaskPriority, TaskStatus, TaskType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSeedData } from "@/lib/seed";
import { computeTaskReadiness } from "@/lib/tasks/readiness";
import { asOptionalString } from "@/lib/validators/common";
import { parseTemplateKey } from "@/lib/validators/task-template";

export async function GET() {
  try {
    await ensureSeedData();

    const tasks = await prisma.task.findMany({
      orderBy: [{ updatedAt: "desc" }],
      include: {
        readinessChecks: {
          select: { required: true, status: true },
        },
      },
    });

    return NextResponse.json(
      tasks.map(({ readinessChecks, ...task }) => ({
        ...task,
        readiness: computeTaskReadiness(readinessChecks),
      })),
    );
  } catch {
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await prisma.task.deleteMany({});
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to clear tasks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body?.title || typeof body.title !== "string") {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const deadline = body.deadline ? new Date(body.deadline) : null;
    if (deadline && Number.isNaN(deadline.getTime())) {
      return NextResponse.json({ error: "invalid deadline" }, { status: 400 });
    }

    const parsedTemplateKey = parseTemplateKey(body.templateKey);
    if (parsedTemplateKey && "error" in parsedTemplateKey) {
      return NextResponse.json({ error: parsedTemplateKey.error }, { status: 400 });
    }

    let template:
      | {
          id: string;
          defaultType: TaskType;
          defaultPriority: TaskPriority;
          defaultStatus: TaskStatus;
          defaultOwner: string | null;
          defaultContext: string | null;
          defaultExpectedOutput: string | null;
          readinessChecks: Array<{
            code: string;
            label: string;
            required: boolean;
          }>;
        }
      | null = null;

    if (parsedTemplateKey?.key) {
      template = await prisma.taskTemplate.findFirst({
        where: {
          key: parsedTemplateKey.key,
          isActive: true,
        },
        select: {
          id: true,
          defaultType: true,
          defaultPriority: true,
          defaultStatus: true,
          defaultOwner: true,
          defaultContext: true,
          defaultExpectedOutput: true,
          readinessChecks: {
            orderBy: { order: "asc" },
            select: {
              code: true,
              label: true,
              required: true,
            },
          },
        },
      });

      if (!template) {
        return NextResponse.json({ error: "template does not exist or is inactive" }, { status: 400 });
      }
    }

    const task = await prisma.task.create({
      data: {
        title: body.title.trim(),
        templateId: template?.id ?? null,
        type: Object.values(TaskType).includes(body.type)
          ? body.type
          : (template?.defaultType ?? TaskType.CHORE),
        priority: Object.values(TaskPriority).includes(body.priority)
          ? body.priority
          : (template?.defaultPriority ?? TaskPriority.MEDIUM),
        status: Object.values(TaskStatus).includes(body.status)
          ? body.status
          : (template?.defaultStatus ?? TaskStatus.INBOX),
        owner: asOptionalString(body.owner) ?? template?.defaultOwner ?? null,
        context: asOptionalString(body.context) ?? template?.defaultContext ?? null,
        expectedOutput:
          asOptionalString(body.expectedOutput) ?? template?.defaultExpectedOutput ?? null,
        deadline,
        readinessChecks: template
          ? {
              create: template.readinessChecks.map((check) => ({
                code: check.code,
                label: check.label,
                required: check.required,
              })),
            }
          : undefined,
      },
      include: {
        readinessChecks: {
          select: { required: true, status: true },
        },
      },
    });

    const { readinessChecks, ...taskPayload } = task;

    return NextResponse.json(
      {
        ...taskPayload,
        readiness: computeTaskReadiness(readinessChecks),
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
