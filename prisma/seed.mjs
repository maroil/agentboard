import { PrismaClient, TaskPriority, TaskStatus, TaskType } from "@prisma/client";

const prisma = new PrismaClient();

const templateSeeds = [
  {
    key: "feature-default",
    name: "Feature Delivery",
    description: "Default template for shipping product features.",
    defaultType: TaskType.FEATURE,
    defaultPriority: TaskPriority.MEDIUM,
    defaultStatus: TaskStatus.INBOX,
    defaultExpectedOutput: "PR merged and acceptance criteria validated",
    checks: [
      { code: "scope-defined", label: "Scope defined", required: true, order: 1 },
      { code: "acceptance-criteria", label: "Acceptance criteria documented", required: true, order: 2 },
      { code: "rollback-plan", label: "Rollback plan prepared", required: false, order: 3 },
    ],
  },
  {
    key: "bugfix-default",
    name: "Bugfix",
    description: "Template for reproducible bug fixes.",
    defaultType: TaskType.BUG,
    defaultPriority: TaskPriority.HIGH,
    defaultStatus: TaskStatus.INBOX,
    defaultExpectedOutput: "Fix merged with regression test",
    checks: [
      { code: "repro-steps", label: "Reproduction steps confirmed", required: true, order: 1 },
      { code: "root-cause", label: "Root cause identified", required: true, order: 2 },
    ],
  },
  {
    key: "research-default",
    name: "Research",
    description: "Template for time-boxed exploration tasks.",
    defaultType: TaskType.RESEARCH,
    defaultPriority: TaskPriority.MEDIUM,
    defaultStatus: TaskStatus.INBOX,
    defaultExpectedOutput: "Decision memo with recommendations",
    checks: [
      { code: "question-clear", label: "Research question is clear", required: true, order: 1 },
      { code: "sources-listed", label: "Sources listed", required: false, order: 2 },
    ],
  },
];

async function seedTemplates() {
  for (const template of templateSeeds) {
    const created = await prisma.taskTemplate.upsert({
      where: { key: template.key },
      update: {
        name: template.name,
        description: template.description,
        defaultType: template.defaultType,
        defaultPriority: template.defaultPriority,
        defaultStatus: template.defaultStatus,
        defaultExpectedOutput: template.defaultExpectedOutput,
        isActive: true,
      },
      create: {
        key: template.key,
        name: template.name,
        description: template.description,
        defaultType: template.defaultType,
        defaultPriority: template.defaultPriority,
        defaultStatus: template.defaultStatus,
        defaultExpectedOutput: template.defaultExpectedOutput,
        isActive: true,
      },
    });

    await prisma.taskTemplateReadinessCheck.deleteMany({ where: { templateId: created.id } });
    await prisma.taskTemplateReadinessCheck.createMany({
      data: template.checks.map((check) => ({ ...check, templateId: created.id })),
    });
  }
}

async function main() {
  await seedTemplates();

  const count = await prisma.task.count();
  if (count > 0) {
    console.log("Seed skipped for tasks: tasks already exist.");
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
