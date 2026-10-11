import assert from "node:assert/strict";
import test from "node:test";
import { getSourceProvenanceNotice } from "../lib/source-provenance.js";

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
