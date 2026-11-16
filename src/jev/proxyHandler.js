import {
  JEV_MODEL,
  JEV_UPSTREAM_URL,
  missingJevKeyMessage,
  readJevApiKey,
} from "./messages.js";

const MAX_BODY_BYTES = 1_000_000;

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function handleJevProxy(request, {
  env = globalThis.process?.env || {},
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!request || request.method !== "POST") {
    return jsonResponse(405, {
      error: "method_not_allowed",
      message: "POST a System One request to /api/jev.",
    });
  }

  const key = readJevApiKey(env);
  if (!key) {
    return jsonResponse(503, {
      error: "missing_key",
      message: missingJevKeyMessage(),
    });
  }

  let bodyText = "";
  try {
    bodyText = await request.text();
  } catch (error) {
    return jsonResponse(400, {
      error: "bad_request",
      message: "The grading request could not be read.",
      detail: error?.message || "",
    });
  }
  if (bodyText.length > MAX_BODY_BYTES) {
    return jsonResponse(413, {
      error: "too_large",
      message: "The transcript is too long to grade.",
    });
  }

  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return jsonResponse(400, {
      error: "bad_request",
      message: "The grading request was not JSON.",
    });
  }
  if (
    !body ||
    typeof body !== "object" ||
    typeof body.state !== "string" ||
    !body.questions ||
    typeof body.questions !== "object" ||
    Array.isArray(body.questions)
  ) {
    return jsonResponse(400, {
      error: "bad_request",
      message: "The grading request must include state and questions.",
    });
  }

  let upstream;
  try {
    upstream = await fetchImpl(JEV_UPSTREAM_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        state: body.state,
        model: JEV_MODEL,
        questions: body.questions,
      }),
    });
  } catch (error) {
    return jsonResponse(502, {
      error: "upstream",
      message: "Couldn't reach Jev.",
      detail: error?.message || "",
    });
  }

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") || "application/json",
    },
  });
}
