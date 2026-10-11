import assert from "node:assert/strict";
import test from "node:test";
import { getSourceProvenanceNotice, PUBLIC_ARCHIVE_NOTICE } from "../lib/source-provenance.js";

test("public API notice separates listing from source and rights verification", () => {
  assert.equal(PUBLIC_ARCHIVE_NOTICE, "Published means this metadata index is public. It does not verify original sources, credits, or reuse rights.");
});

test("source-needed entries clearly disclose the missing source, credit, and rights review", () => {
  assert.deepEqual(getSourceProvenanceNotice("source_needed"), {
    label: "SOURCE NEEDED",
    description: "Original materials, credits, and reuse rights are not verified. This is an editorial index only.",
    tone: "needed",
  });
});

test("missing source status is treated as unverified", () => {
  assert.equal(getSourceProvenanceNotice(null).tone, "unknown");
  assert.match(getSourceProvenanceNotice("").description, /Treat this entry as unverified/);
});

test("other status labels never imply permission to reproduce original material", () => {
  const notice = getSourceProvenanceNotice("source_verified");
  assert.equal(notice.label, "SOURCE STATUS: SOURCE VERIFIED");
  assert.match(notice.description, /not proof of permission/);
});
