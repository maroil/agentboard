import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSeedData } from "@/lib/seed";

function asOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function GET() {
  try {
    await ensureSeedData();

    const agents = await prisma.agent.findMany({
      orderBy: [{ lastUpdate: "desc" }],
    });

    return NextResponse.json(agents);
  } catch {
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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
        blocker: asOptionalString(body.blocker),
        nextStep: asOptionalString(body.nextStep),
        lastUpdate: new Date(),
      },
    });

    return NextResponse.json(agent, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
  }
}
