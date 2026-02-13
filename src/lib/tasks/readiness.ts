import { ReadinessStatus } from "@prisma/client";

type CheckLike = {
  required: boolean;
  status: ReadinessStatus;
};

export type TaskReadinessSummary = {
  state: "READY" | "NOT_READY" | "NOT_APPLICABLE";
  requiredTotal: number;
  requiredPassed: number;
  total: number;
};

export function computeTaskReadiness(checks: CheckLike[]): TaskReadinessSummary {
  if (checks.length === 0) {
    return {
      state: "NOT_APPLICABLE",
      requiredTotal: 0,
      requiredPassed: 0,
      total: 0,
    };
  }

  const required = checks.filter((check) => check.required);
  const requiredPassed = required.filter((check) => check.status === ReadinessStatus.PASSED).length;
  const state = requiredPassed === required.length ? "READY" : "NOT_READY";

  return {
    state,
    requiredTotal: required.length,
    requiredPassed,
    total: checks.length,
  };
}

export function isTaskReadyForExecution(summary: TaskReadinessSummary) {
  return summary.state === "READY" || summary.state === "NOT_APPLICABLE";
}

export function shapeTemplate(template: {
  id: string;
  key: string;
  name: string;
  description: string | null;
  defaultType: string;
  defaultPriority: string;
  defaultStatus: string;
  defaultOwner: string | null;
  defaultContext: string | null;
  defaultExpectedOutput: string | null;
  readinessChecks: Array<{
    id: string;
    code: string;
    label: string;
    helpText: string | null;
    required: boolean;
    order: number;
  }>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: template.id,
    key: template.key,
    name: template.name,
    description: template.description,
    defaults: {
      type: template.defaultType,
      priority: template.defaultPriority,
      status: template.defaultStatus,
      owner: template.defaultOwner,
      context: template.defaultContext,
      expectedOutput: template.defaultExpectedOutput,
    },
    readinessChecks: template.readinessChecks,
    isActive: template.isActive,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}
