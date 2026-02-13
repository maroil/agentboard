import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSeedData } from "@/lib/seed";
import { shapeTemplate } from "@/lib/tasks/readiness";

export async function GET() {
  try {
    await ensureSeedData();

    const templates = await prisma.taskTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ name: "asc" }],
      include: {
        readinessChecks: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            code: true,
            label: true,
            helpText: true,
            required: true,
            order: true,
          },
        },
      },
    });

    return NextResponse.json(templates.map(shapeTemplate));
  } catch {
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}
