import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseReadinessPatch } from "@/lib/validators/readiness";

type Params = {
  params: Promise<{ id: string; checkId: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id, checkId } = await params;
    const body = await request.json();

    const parsed = parseReadinessPatch(body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const check = await prisma.taskReadinessCheck.findFirst({
      where: {
        id: checkId,
        taskId: id,
      },
    });

    if (!check) {
      return NextResponse.json({ error: "check not found for task" }, { status: 404 });
    }

    const updated = await prisma.taskReadinessCheck.update({
      where: { id: checkId },
      data: {
        status: parsed.status,
        note: parsed.note === undefined ? check.note : parsed.note,
        checkedAt: parsed.status === "PENDING" ? null : new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update readiness check" }, { status: 500 });
  }
}
