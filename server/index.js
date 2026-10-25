import "dotenv/config";
import express from "express";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fal } from "@fal-ai/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const FAL_KEY = process.env.FAL_KEY?.trim();

// Model endpoints (overridable through .env)
const MODELS = {
  image: process.env.NANO_BANANA_MODEL || "fal-ai/nano-banana-pro",
  imageEdit: process.env.NANO_BANANA_EDIT_MODEL || "fal-ai/nano-banana-pro/edit",
  video: process.env.SEEDANCE_MODEL || "bytedance/seedance-2.5/reference-to-video",
  vision: process.env.VISION_ENDPOINT || "openrouter/router/vision",
  transcribe: process.env.WHISPER_MODEL || "fal-ai/whisper",
  audioConvert: process.env.AUDIO_CONVERT_MODEL || "fal-ai/ffmpeg-api/merge-audios",
  tts: process.env.TTS_MODEL || "fal-ai/elevenlabs/tts/multilingual-v2",
  ttsExpressive: process.env.TTS_EXPRESSIVE_MODEL || "fal-ai/elevenlabs/tts/eleven-v3",
  isolate: process.env.ISOLATE_MODEL || "fal-ai/elevenlabs/audio-isolation",
  upscale: process.env.UPSCALE_MODEL || "fal-ai/topaz/upscale/video",
  mergeAudio: process.env.MERGE_AUDIO_MODEL || "fal-ai/ffmpeg-api/merge-audio-video",
  videoRead: process.env.VIDEO_READ_ENDPOINT || "openrouter/router/video",
  extractFrame: process.env.EXTRACT_FRAME_MODEL || "fal-ai/ffmpeg-api/extract-frame",
};

if (FAL_KEY) {
  fal.config({ credentials: FAL_KEY });
} else {
  console.warn("\n[warn] FAL_KEY is not set. Copy .env.example to .env and add your fal.ai key.\n");
}

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
});

function requireKey(res) {
  if (!FAL_KEY) {
    res.status(400).json({ error: "FAL_KEY is missing. Add it to your .env file and restart the server." });
    return false;
  }
  return true;
}

function errorMessage(err) {
  // fal ValidationError / ApiError carry a body with details
  const body = err?.body;
  if (body?.detail) {
    if (Array.isArray(body.detail)) {
      return body.detail.map((d) => `${(d.loc || []).join(".")}: ${d.msg}`).join("; ");
    }
    return String(body.detail);
  }
  if (body?.message) return String(body.message);
  return err?.message || "Unknown error";
}

// --- health / config -------------------------------------------------------
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, hasKey: Boolean(FAL_KEY), models: MODELS });
});

// --- upload a file to fal storage -----------------------------------------
app.post("/api/upload", upload.single("file"), async (req, res) => {
  if (!requireKey(res)) return;
  if (!req.file) return res.status(400).json({ error: "No file received." });
  try {
    const { buffer, originalname, mimetype } = req.file;
    const file = new File([buffer], originalname, { type: mimetype || "application/octet-stream" });
    const url = await fal.storage.upload(file);
    res.json({ url, name: originalname, size: buffer.length, type: mimetype });
  } catch (err) {
    console.error("[upload]", err);
    res.status(500).json({ error: errorMessage(err) });
  }
});

// --- submit a generation job to the fal queue -----------------------------
app.post("/api/jobs", async (req, res) => {
  if (!requireKey(res)) return;
  const { kind, input } = req.body || {};
  const endpoint = MODELS[kind];
  if (!endpoint) return res.status(400).json({ error: `Unknown job kind "${kind}".` });
  if (!input || typeof input !== "object") return res.status(400).json({ error: "Missing input." });
  try {
    const { request_id } = await fal.queue.submit(endpoint, { input });
    console.log(`[job] ${kind} -> ${endpoint} (${request_id})`);
    res.json({ requestId: request_id, kind, endpoint });
  } catch (err) {
    console.error("[submit]", err);
    res.status(err?.status || 500).json({ error: errorMessage(err) });
  }
});

// --- poll a job -----------------------------------------------------------
app.get("/api/jobs/:kind/:id", async (req, res) => {
  if (!requireKey(res)) return;
  const { kind, id } = req.params;
  const endpoint = MODELS[kind];
  if (!endpoint) return res.status(400).json({ error: `Unknown job kind "${kind}".` });
  try {
    const status = await fal.queue.status(endpoint, { requestId: id, logs: true });
    const payload = {
      status: status.status,
      queuePosition: status.queue_position ?? null,
      logs: (status.logs || []).map((l) => l.message),
    };
    if (status.status === "COMPLETED") {
      const { data } = await fal.queue.result(endpoint, { requestId: id });
      payload.result = data;
    }
    res.json(payload);
  } catch (err) {
    console.error("[status]", err);
    res.status(err?.status || 500).json({ error: errorMessage(err) });
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Server error" });
});

app.listen(PORT, () => {
  console.log(`Architect Podcast Studio running at http://localhost:${PORT}`);
  console.log(`Models: ${Object.entries(MODELS).map(([k, v]) => `${k}=${v}`).join(" | ")}`);
});
