import test from "node:test";
import assert from "node:assert/strict";
import { validateDraft, validateRevision } from "../lib/request-validation.js";
test("accepts a normal draft",()=>assert.equal(validateDraft({slug:"new-story",title:"New story",body:"Original"}),true));
test("rejects invalid draft shapes",()=>{for(const x of [null,[],{}, {slug:"X",title:"Test",body:"Body"}, {slug:"test",title:" ",body:"Body"}, {slug:"test",title:"Title",body:""}])assert.equal(validateDraft(x),false)});
test("rejects excessively long content",()=>assert.equal(validateDraft({slug:"okay",title:"Title",body:"x".repeat(250001)}),false));
test("accepts valid append-only revision",()=>assert.equal(validateRevision({slug:"new-story",body:"Second revision",notes:"Corrected text"}),true));
test("rejects malformed revisions",()=>{for(const x of [{slug:"INVALID",body:"Text"},{slug:"test",body:""},{slug:"test",body:"Text",notes:8}])assert.equal(validateRevision(x),false)});

test("rejects unapproved publication and provenance fields", () => {
 const validDraft = { slug: "new-story", title: "New story", body: "Original" };
 for (const [field, value] of Object.entries({
  status: "published",
  originalSourceStatus: "source_verified",
  original_source_status: "source_verified",
  rightsVerified: true,
 })) assert.equal(validateDraft({ ...validDraft, [field]: value }), false, field);

 const validRevision = { slug: "new-story", body: "Second revision" };
 assert.equal(validateRevision({ ...validRevision, originalSourceStatus: "source_verified" }), false);
 assert.equal(validateRevision({ ...validRevision, status: "published" }), false);
});
