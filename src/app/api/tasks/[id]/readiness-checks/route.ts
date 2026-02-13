import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;

    const checks = await prisma.taskReadinessCheck.findMany({
      where: { taskId: id },
      orderBy: [{ createdAt: "asc" }],
    });

    return NextResponse.json(checks);
  } catch {
    return NextResponse.json({ error: "Failed to fetch readiness checks" }, { status: 500 });
  }
}
