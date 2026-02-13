import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ id: string }>;
};

function asOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body?.status || typeof body.status !== "string") {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    const updated = await prisma.agent.update({
      where: { id },
      data: {
        status: body.status,
        blocker: asOptionalString(body.blocker),
        nextStep: asOptionalString(body.nextStep),
        lastUpdate: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update agent" }, { status: 500 });
  }
}
