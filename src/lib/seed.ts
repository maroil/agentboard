import { TaskPriority, TaskStatus, TaskType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

async function seedTemplates() {
  const templates = [
    {
      key: "feature-default",
      name: "Feature Delivery",
      description: "Default template for shipping product features.",
      defaultType: TaskType.FEATURE,
      defaultPriority: TaskPriority.MEDIUM,
      defaultStatus: TaskStatus.INBOX,
      defaultOwner: null,
      defaultContext: null,
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
      defaultOwner: null,
      defaultContext: null,
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
      defaultOwner: null,
      defaultContext: null,
      defaultExpectedOutput: "Decision memo with recommendations",
      checks: [
        { code: "question-clear", label: "Research question is clear", required: true, order: 1 },
        { code: "sources-listed", label: "Sources listed", required: false, order: 2 },
      ],
    },
  ];

  for (const template of templates) {
    const created = await prisma.taskTemplate.upsert({
      where: { key: template.key },
      update: {
        name: template.name,
        description: template.description,
        defaultType: template.defaultType,
        defaultPriority: template.defaultPriority,
        defaultStatus: template.defaultStatus,
        defaultOwner: template.defaultOwner,
        defaultContext: template.defaultContext,
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
        defaultOwner: template.defaultOwner,
        defaultContext: template.defaultContext,
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

export async function ensureSeedData() {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  await seedTemplates();

  const [existingTasks, existingAgents] = await Promise.all([
    prisma.task.count(),
    prisma.agent.count(),
  ]);

  const operations = [];

  if (existingTasks === 0) {
    operations.push(
      prisma.task.createMany({
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
      }),
    );
  }

  if (existingAgents === 0) {
    operations.push(
      prisma.agent.createMany({
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
      }),
    );
  }

  if (operations.length > 0) {
    await prisma.$transaction(operations);
  }
}
