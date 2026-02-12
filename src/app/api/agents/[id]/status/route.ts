import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  if (!body?.status || typeof body.status !== "string") {
    return NextResponse.json({ error: "status is required" }, { status: 400 });
  }

  const updated = await prisma.agent.update({
    where: { id },
    data: {
      status: body.status,
      blocker: body.blocker ?? null,
      nextStep: body.nextStep ?? null,
      lastUpdate: new Date(),
    },
  });

  return NextResponse.json(updated);
}
