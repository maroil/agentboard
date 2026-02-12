import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSeedData } from "@/lib/seed";

export async function GET() {
  await ensureSeedData();

  const agents = await prisma.agent.findMany({
    orderBy: [{ lastUpdate: "desc" }],
  });

  return NextResponse.json(agents);
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body?.name || !body?.mission || !body?.status) {
    return NextResponse.json(
      { error: "name, mission, and status are required" },
      { status: 400 },
    );
  }

  const agent = await prisma.agent.create({
    data: {
      name: body.name,
      mission: body.mission,
      status: body.status,
      blocker: body.blocker || null,
      nextStep: body.nextStep || null,
      lastUpdate: new Date(),
    },
  });

  return NextResponse.json(agent, { status: 201 });
}
