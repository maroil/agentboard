import { ReadinessStatus } from "@prisma/client";

const NOTE_MAX = 500;

export function parseReadinessPatch(body: unknown) {
  if (!body || typeof body !== "object") {
    return { error: "invalid payload" };
  }

  const payload = body as { status?: unknown; note?: unknown };

  if (!Object.values(ReadinessStatus).includes(payload.status as ReadinessStatus)) {
    return { error: "status must be PENDING, PASSED, or FAILED" };
  }

  let note: string | null | undefined = undefined;
  if (payload.note !== undefined) {
    if (payload.note === null || payload.note === "") {
      note = null;
    } else if (typeof payload.note === "string") {
      const trimmed = payload.note.trim();
      if (trimmed.length > NOTE_MAX) {
        return { error: `note must be <= ${NOTE_MAX} chars` };
      }
      note = trimmed || null;
    } else {
      return { error: "note must be a string or null" };
    }
  }

  return {
    status: payload.status as ReadinessStatus,
    note,
  };
}
