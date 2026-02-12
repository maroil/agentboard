import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, TaskPriority, TaskStatus, TaskType } from "@prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./prisma/dev.db",
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const count = await prisma.task.count();

  if (count > 0) {
    console.log("Seed skipped: tasks already exist.");
    return;
  }

  await prisma.task.createMany({
    data: [
      {
        title: "Define MVP dashboard scope",
        type: TaskType.RESEARCH,
        priority: TaskPriority.HIGH,
        status: TaskStatus.INBOX,
        owner: "Product",
        context: "Collect must-have vs nice-to-have views",
        expectedOutput: "One-page MVP feature checklist",
      },
      {
        title: "Wire API contracts for task state updates",
        type: TaskType.FEATURE,
        priority: TaskPriority.URGENT,
        status: TaskStatus.DOING,
        owner: "Backend",
        context: "Align status enums across frontend/backend",
        expectedOutput: "Stable PATCH endpoints",
      },
      {
        title: "Fix board empty state copy",
        type: TaskType.BUG,
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.NEXT,
        owner: "Frontend",
        context: "Clarify CTA for first task",
        expectedOutput: "User-friendly first-run guidance",
      },
    ],
  });

  await prisma.agent.createMany({
    data: [
      {
        name: "Planner Agent",
        mission: "Break incoming requests into actionable tasks",
        status: "Active",
        nextStep: "Refine priorities for Sprint Backlog",
      },
      {
        name: "Builder Agent",
        mission: "Implement approved sprint tasks",
        status: "Blocked",
        blocker: "Awaiting API schema confirmation",
        nextStep: "Resume UI hooks after schema finalization",
      },
    ],
  });

  console.log("Database seeded.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
