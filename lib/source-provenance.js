export function getSourceProvenanceNotice(status) {
  const normalized = typeof status === "string" ? status.trim().toLowerCase() : "";

  if (normalized === "source_needed") {
    return {
      label: "SOURCE NEEDED",
      description: "Original materials, credits, and reuse rights are not verified. This is an editorial index only.",
      tone: "needed",
    };
  }

  if (!normalized) {
    return {
      label: "SOURCE STATUS UNRECORDED",
      description: "Treat this entry as unverified until its source, credits, and usage rights are reviewed.",
      tone: "unknown",
    };
  }

  return {
    label: `SOURCE STATUS: ${normalized.replaceAll("_", " ").toUpperCase()}`,
    description: "A status label alone is not proof of permission. Review the source and rights evidence before reproducing original material.",
    tone: "review",
  };
}
