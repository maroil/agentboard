import { TaskStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeTaskReadiness, isTaskReadyForExecution } from "@/lib/tasks/readiness";

type Params = {
  params: Promise<{ id: string }>;
};

const GUARDED_STATUSES: TaskStatus[] = [TaskStatus.NEXT, TaskStatus.DOING];

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!Object.values(TaskStatus).includes(body?.status)) {
      return NextResponse.json({ error: "valid status is required" }, { status: 400 });
    }

    if (GUARDED_STATUSES.includes(body.status)) {
      const checks = await prisma.taskReadinessCheck.findMany({
        where: { taskId: id },
        select: {
          required: true,
          status: true,
        },
      });

      const readiness = computeTaskReadiness(checks);
      if (!isTaskReadyForExecution(readiness)) {
        return NextResponse.json(
          {
            error: "Task is not ready",
            code: "TASK_NOT_READY",
            readiness: {
              state: readiness.state,
              requiredTotal: readiness.requiredTotal,
              requiredPassed: readiness.requiredPassed,
            },
          },
          { status: 409 },
        );
      }
    }

    const updated = await prisma.task.update({
      where: { id },
      data: { status: body.status },
      include: {
        readinessChecks: {
          select: { required: true, status: true },
        },
      },
    });

    const { readinessChecks, ...task } = updated;

    return NextResponse.json({
      ...task,
      readiness: computeTaskReadiness(readinessChecks),
    });
  } catch {
    return NextResponse.json({ error: "Failed to update task status" }, { status: 500 });
  }
}
