import { TaskStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!Object.values(TaskStatus).includes(body?.status)) {
      return NextResponse.json({ error: "valid status is required" }, { status: 400 });
    }

    const updated = await prisma.task.update({
      where: { id },
      data: { status: body.status },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update task status" }, { status: 500 });
  }
}
