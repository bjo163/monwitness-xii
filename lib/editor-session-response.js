const noStoreHeaders = { "Cache-Control": "no-store" };

export function createEditorSessionResponse(result) {
  if (!result.ok) {
    return Response.json({ error: result.message }, {
      status: result.status,
      headers: noStoreHeaders,
    });
  }

  const user = result.session?.user;
  if (!user) {
    return Response.json({ authenticated: false }, {
      status: 401,
      headers: noStoreHeaders,
    });
  }

  return Response.json({
    authenticated: true,
    role: user.role === "admin" ? "admin" : "user",
    emailVerified: user.emailVerified === true,
    canEdit: result.isEditorAdmin === true,
  }, { headers: noStoreHeaders });
}
