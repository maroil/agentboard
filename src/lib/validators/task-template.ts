const TEMPLATE_KEY_RE = /^[a-z0-9-]{3,50}$/;

export function parseTemplateKey(value: unknown) {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return { error: "templateKey must be a string" };
  }

  const key = value.trim();
  if (!TEMPLATE_KEY_RE.test(key)) {
    return { error: "templateKey format is invalid" };
  }

  return { key };
}
