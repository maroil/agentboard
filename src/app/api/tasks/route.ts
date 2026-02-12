import { TaskPriority, TaskStatus, TaskType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSeedData } from "@/lib/seed";

export async function GET() {
  await ensureSeedData();

  const tasks = await prisma.task.findMany({
    orderBy: [{ updatedAt: "desc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body?.title || typeof body.title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: {
      title: body.title,
      type: Object.values(TaskType).includes(body.type)
        ? body.type
        : TaskType.CHORE,
      priority: Object.values(TaskPriority).includes(body.priority)
        ? body.priority
        : TaskPriority.MEDIUM,
      status: Object.values(TaskStatus).includes(body.status)
        ? body.status
        : TaskStatus.INBOX,
      owner: body.owner || null,
      context: body.context || null,
      expectedOutput: body.expectedOutput || null,
      deadline: body.deadline ? new Date(body.deadline) : null,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
