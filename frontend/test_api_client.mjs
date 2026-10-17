import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeBaseUrl,
  buildApiUrl,
  resolveAudioUrl,
  getApiErrorMessage,
  BASE_URL,
  api,
  uploadResume,
  startInterview,
  submitAnswerText,
  submitAnswerVoice,
} from "./src/services/api.js";

test("normalizeBaseUrl handles various inputs correctly", () => {
  assert.equal(
    normalizeBaseUrl(null),
    "https://veya-ai-backend.onrender.com",
    "null should return default backend URL"
  );
  assert.equal(
    normalizeBaseUrl(""),
    "https://veya-ai-backend.onrender.com",
    "empty string should return default backend URL"
  );
  assert.equal(
    normalizeBaseUrl("   "),
    "https://veya-ai-backend.onrender.com",
    "whitespace should return default backend URL"
  );
  assert.equal(
    normalizeBaseUrl("https://veya-ai-backend.onrender.com/"),
    "https://veya-ai-backend.onrender.com",
    "trailing slash should be stripped"
  );
  assert.equal(
    normalizeBaseUrl("https://veya-ai-backend.onrender.com///"),
    "https://veya-ai-backend.onrender.com",
    "multiple trailing slashes should be stripped"
  );
  assert.equal(
    normalizeBaseUrl("http://localhost:8000/"),
    "http://localhost:8000",
    "localhost with trailing slash should be stripped"
  );
});

test("buildApiUrl prevents duplicate slashes and duplicate /api prefixes", () => {
  // Relative path with leading slash
  const url1 = buildApiUrl("/resume/upload");
  assert.ok(url1.startsWith(BASE_URL), "Must start with BASE_URL");
  assert.ok(!url1.includes("//resume"), "Must not contain double slashes");
  assert.equal(url1, `${BASE_URL}/resume/upload`);

  // Relative path without leading slash
  const url2 = buildApiUrl("interview/start");
  assert.equal(url2, `${BASE_URL}/interview/start`);

  // Absolute URL should be returned untouched
  const absUrl = "https://cdn.example.com/audio/sample.mp3";
  assert.equal(buildApiUrl(absUrl), absUrl);

  // Empty or falsy path returns BASE_URL
  assert.equal(buildApiUrl(""), BASE_URL);
  assert.equal(buildApiUrl(null), BASE_URL);
});

test("resolveAudioUrl converts relative paths to absolute backend URLs", () => {
  assert.equal(resolveAudioUrl(null), null);
  assert.equal(resolveAudioUrl(""), null);

  const audioPath = "/audio/12345.mp3";
  const resolved = resolveAudioUrl(audioPath);
  assert.equal(resolved, `${BASE_URL}/audio/12345.mp3`);

  const external = "https://s3.amazonaws.com/bucket/voice.mp3";
  assert.equal(resolveAudioUrl(external), external);
});

test("getApiErrorMessage formats FastAPI and network errors accurately", () => {
  // 1. FastAPI detail string
  const errDetail = {
    response: {
      status: 400,
      data: { detail: "session_id must not be empty." },
    },
  };
  assert.equal(
    getApiErrorMessage(errDetail),
    "session_id must not be empty."
  );

  // 2. FastAPI validation array
  const errValidation = {
    response: {
      status: 422,
      data: {
        detail: [
          { msg: "Field required", loc: ["body", "file"] },
        ],
      },
    },
  };
  assert.equal(
    getApiErrorMessage(errValidation),
    "Field required"
  );

  // 3. Status 413
  const err413 = { response: { status: 413, data: {} } };
  assert.match(getApiErrorMessage(err413), /too large/i);

  // 4. Status 415
  const err415 = { response: { status: 415, data: {} } };
  assert.match(getApiErrorMessage(err415), /unsupported file format/i);

  // 5. Status 429
  const err429 = { response: { status: 429, data: {} } };
  assert.match(getApiErrorMessage(err429), /rate limit/i);

  // 6. Status 503 Render cold start
  const err503 = { response: { status: 503, data: {} } };
  assert.match(getApiErrorMessage(err503), /waking up|Render/i);

  // 7. Network error
  const errNetwork = { code: "ERR_NETWORK", message: "Network Error" };
  assert.match(getApiErrorMessage(errNetwork), /Unable to reach the backend server/i);

  // 8. Timeout error
  const errTimeout = { code: "ECONNABORTED", message: "timeout of 30000ms exceeded" };
  assert.match(getApiErrorMessage(errTimeout), /timed out/i);
});

test("uploadResume sends session_id query param and file in FormData without manual Content-Type", async () => {
  const origPost = api.post;
  let capturedUrl = "";
  let capturedData = null;
  let capturedConfig = null;

  try {
    api.post = async (url, data, config) => {
      capturedUrl = url;
      capturedData = data;
      capturedConfig = config;
      return { data: { success: true, message: "Parsed" } };
    };

    const mockFile = new Blob(["dummy resume content"], { type: "application/pdf" });
    const sessionId = "test-session-12345";
    const res = await uploadResume(mockFile, sessionId);

    assert.equal(res.session_id, sessionId);
    assert.equal(capturedUrl, "/resume/upload");
    assert.deepEqual(capturedConfig?.params, { session_id: sessionId });

    // Ensure headers did NOT set manual Content-Type
    assert.equal(capturedConfig?.headers?.["Content-Type"], undefined);

    // Ensure FormData has 'file'
    assert.ok(capturedData instanceof FormData);
    assert.ok(capturedData.has("file"));
  } finally {
    api.post = origPost;
  }
});

test("startInterview, submitAnswerText, and submitAnswerVoice format payloads correctly", async () => {
  const origPost = api.post;
  const calls = [];

  try {
    api.post = async (url, data, config) => {
      calls.push({ url, data, config });
      return { data: { success: true } };
    };

    // 1. startInterview
    await startInterview("sid-1", 5, "medium", "Software Engineer");
    assert.equal(calls[0].url, "/interview/start");
    assert.deepEqual(calls[0].data, {
      session_id: "sid-1",
      question_limit: 5,
      question_count: 5,
      difficulty: "medium",
      job_role: "Software Engineer",
    });

    // 2. submitAnswerText
    await submitAnswerText("sid-1", "My answer");
    assert.equal(calls[1].url, "/interview/answer");
    assert.deepEqual(calls[1].data, {
      session_id: "sid-1",
      answer: "My answer",
    });

    // 3. submitAnswerVoice
    const mockAudio = new Blob(["audio data"], { type: "audio/webm" });
    await submitAnswerVoice("sid-1", mockAudio);
    assert.equal(calls[2].url, "/interview/voice/answer");
    assert.deepEqual(calls[2].config?.params, { session_id: "sid-1" });
    assert.ok(calls[2].data instanceof FormData);
    assert.ok(calls[2].data.has("audio"));
    assert.equal(calls[2].config?.headers?.["Content-Type"], undefined);
  } finally {
    api.post = origPost;
  }
});

test("uploadResume handles HTTP 200 success with backend schema and normalizes fields", async () => {
  const origPost = api.post;

  try {
    api.post = async () => {
      return {
        status: 200,
        data: {
          success: true,
          session_id: "test-sess-999",
          next_step: "question_count",
          message: "Resume analyzed successfully. How many questions would you like?",
          candidate_name: "Alex Smith",
          skills_detected: ["Python", "Docker", "Machine Learning"],
        },
      };
    };

    const mockFile = new Blob(["%PDF-1.4 test"], { type: "application/pdf" });
    const result = await uploadResume(mockFile, "test-sess-999");

    assert.equal(result.success, true);
    assert.equal(result.session_id, "test-sess-999");
    assert.equal(result.candidate_name, "Alex Smith");
    assert.deepEqual(result.skills_detected, ["Python", "Docker", "Machine Learning"]);
    assert.equal(result.next_step, "question_count");
    assert.match(result.message, /Resume analyzed successfully/i);
  } finally {
    api.post = origPost;
  }
});

test("uploadResume rejects malformed responses without treating them as network errors", async () => {
  const origPost = api.post;

  try {
    // 1. Backend returns null data
    api.post = async () => ({ status: 200, data: null });
    const mockFile = new Blob(["dummy"], { type: "application/pdf" });
    await assert.rejects(
      async () => uploadResume(mockFile, "test-sid"),
      /Invalid response received from resume processing server/
    );

    // 2. Backend returns non-object data (e.g. string/HTML error with 200)
    api.post = async () => ({ status: 200, data: "<html>Error</html>" });
    await assert.rejects(
      async () => uploadResume(mockFile, "test-sid"),
      /Invalid response received from resume processing server/
    );

    // 3. Backend returns success: false
    api.post = async () => ({
      status: 200,
      data: { success: false, message: "Could not extract readable text." },
    });
    await assert.rejects(
      async () => uploadResume(mockFile, "test-sid"),
      /Could not extract readable text/
    );
  } finally {
    api.post = origPost;
  }
});

test("getApiErrorMessage handles various error structures and distinguishes network errors from HTTP/runtime errors", () => {
  // Raw string error
  assert.equal(getApiErrorMessage("Direct error message"), "Direct error message");

  // Cancelled request error
  assert.equal(getApiErrorMessage({ code: "ERR_CANCELED" }), "Request was cancelled.");
  assert.equal(getApiErrorMessage({ name: "CanceledError" }), "Request was cancelled.");

  // JavaScript Error instance
  const customErr = new Error("Custom JS failure");
  assert.equal(getApiErrorMessage(customErr), "Custom JS failure");

  // HTTP 500 with custom detail
  const err500Detail = {
    response: {
      status: 500,
      data: { detail: "Database connection failed during analysis" },
    },
  };
  assert.equal(getApiErrorMessage(err500Detail), "Database connection failed during analysis");

  // HTTP 500 without custom detail
  const err500NoDetail = {
    response: {
      status: 500,
      data: {},
    },
  };
  assert.equal(getApiErrorMessage(err500NoDetail), "Backend server error (500). Please try again in a few moments.");

  // HTTP response with data.error field
  const errCustomField = {
    response: {
      status: 400,
      data: { error: "Resume format PKZIP unsupported" },
    },
  };
  assert.equal(getApiErrorMessage(errCustomField), "Resume format PKZIP unsupported");

  // HTTP response with plain string data
  const errStringBody = {
    response: {
      status: 502,
      data: "502 Bad Gateway: Proxy Error",
    },
  };
  assert.equal(getApiErrorMessage(errStringBody), "502 Bad Gateway: Proxy Error");

  // Genuine network error includes dynamic BASE_URL
  const netErr = { code: "ERR_NETWORK", message: "Network Error" };
  const netMsg = getApiErrorMessage(netErr);
  assert.match(netMsg, /Unable to reach the backend server/);
  assert.ok(netMsg.includes(BASE_URL), "Must include BASE_URL in network error");
});

test("uploadResume logs safe diagnostic info on failure and rethrows", async () => {
  const origPost = api.post;
  const loggedErrors = [];
  const origConsoleError = console.error;

  try {
    console.error = (...args) => {
      loggedErrors.push(args.join(" "));
    };

    // Simulate an Axios timeout failure
    api.post = async () => {
      const err = new Error("timeout of 60000ms exceeded");
      err.code = "ECONNABORTED";
      throw err;
    };

    const mockFile = new Blob(["test resume content"], { type: "application/pdf" });
    await assert.rejects(
      async () => uploadResume(mockFile, "test-sess-diag"),
      (err) => err.code === "ECONNABORTED"
    );

    assert.equal(loggedErrors.length, 1);
    const log = loggedErrors[0];
    assert.match(log, /\[API\] Resume upload failed:/);
    assert.match(log, /startTime=\d{4}-\d{2}-\d{2}T/);
    assert.match(log, /elapsedMs=\d+ms/);
    assert.match(log, /status=no_response/);
    assert.match(log, /errorCode=ECONNABORTED/);
    assert.match(log, /responseAvailable=false/);
    // Crucial: ensure no resume contents or private data logged
    assert.ok(!log.includes("test resume content"));
  } finally {
    api.post = origPost;
    console.error = origConsoleError;
  }
});

