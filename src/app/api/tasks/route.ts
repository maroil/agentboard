import { TaskPriority, TaskStatus, TaskType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSeedData } from "@/lib/seed";

function asOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function GET() {
  try {
    await ensureSeedData();

    const tasks = await prisma.task.findMany({
      orderBy: [{ updatedAt: "desc" }],
    });

    return NextResponse.json(tasks);
  } catch {
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
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

    const task = await prisma.task.create({
      data: {
        title: body.title.trim(),
        type: Object.values(TaskType).includes(body.type) ? body.type : TaskType.CHORE,
        priority: Object.values(TaskPriority).includes(body.priority)
          ? body.priority
          : TaskPriority.MEDIUM,
        status: Object.values(TaskStatus).includes(body.status) ? body.status : TaskStatus.INBOX,
        owner: asOptionalString(body.owner),
        context: asOptionalString(body.context),
        expectedOutput: asOptionalString(body.expectedOutput),
        deadline,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
