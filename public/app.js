/* Architect Podcast Studio: front-end logic (plain JavaScript, no build step). */
(() => {
  "use strict";

  // ===========================================================================
  // Configuration
  // ===========================================================================

  // fal.ai endpoints used when the browser talks to fal.ai directly.
  const DEFAULT_MODELS = {
    image: "fal-ai/nano-banana-pro",
    imageEdit: "fal-ai/nano-banana-pro/edit",
    video: "bytedance/seedance-2.5/reference-to-video",
    vision: "openrouter/router/vision",
    transcribe: "fal-ai/whisper",
    audioConvert: "fal-ai/ffmpeg-api/merge-audios",
  };

  // Vision models that read the character sheet and the set, tried in order.
  const VISION_MODELS = ["google/gemini-2.5-flash", "openai/gpt-4o-mini"];

  // Image used as a camera-distance guide for generated sets (served next to this page).
  const REFERENCE_PATH = "reference/podcast-set-framing.jpg";

  const LOOKS = {
    indowestern: {
      label: "Indo-western",
      hint: "Nehru jacket, kurta",
      outfit: "charcoal-grey Nehru jacket over an off-white handloom linen kurta, slim charcoal trousers, tan leather loafers, minimal steel wristwatch",
    },
    linen: {
      label: "Studio linen",
      hint: "Crisp linen shirt",
      outfit: "crisp white linen shirt with sleeves rolled to the forearm, tailored stone-beige trousers, brown leather loafers, slim leather-strap wristwatch",
    },
    khadi: {
      label: "Handloom",
      hint: "Indigo khadi",
      outfit: "deep indigo handwoven khadi kurta, natural off-white cotton trousers, tan leather Kolhapuri sandals, simple silver wristwatch",
    },
    photo: { label: "As in photo", hint: "Keep my clothes", outfit: null },
  };

  const SPEAKERS = {
    man: { label: "Man", hint: "he / his", noun: "man", he: "he", his: "his", He: "He", His: "His" },
    woman: { label: "Woman", hint: "she / her", noun: "woman", he: "she", his: "her", He: "She", His: "Her" },
    person: { label: "Person", hint: "they / their", noun: "person", he: "they", his: "their", He: "They", His: "Their" },
  };

  // Light wording for the video prompt's look paragraph.
  const LIGHT_LOOKS = {
    warm: "warm cinematic lighting with amber and chocolate-brown tones, soft shadows",
    day: "soft natural daylight with gentle, even shadows",
    moody: "low-key cinematic lighting from warm practical lamps, deep soft shadows",
  };

  const SET_STYLES = {
    velvet: {
      label: "Teal velvet",
      hint: "Curtains, velvet chair",
      chair: "velvet",
      scene: "a minimal podcast studio: floor-to-ceiling teal-blue velvet curtains with soft, even vertical folds filling the entire background, and nothing else in the room",
      setting: "a minimal podcast studio with floor-to-ceiling teal-blue velvet curtains",
    },
    studio: {
      label: "Design studio",
      hint: "Books, models, drafting table",
      chair: "cane",
      scene: "an architect's design studio: floor-to-ceiling teak bookshelves with architecture monographs and small white massing models, a large drafting table with rolled drawings and a brass task lamp further back, warm lime-plaster walls, and a polished Kota stone floor with a handwoven cotton dhurrie rug",
      setting: "an architect's design studio with teak bookshelves, white massing models and a drafting table on a Kota stone floor",
    },
    lounge: {
      label: "Podcast lounge",
      hint: "Curtains, lamp, plant",
      chair: "boucle",
      scene: "a cosy podcast studio: floor-to-ceiling velvet curtains in a deep warm brown, warm amber uplighting along the base of the curtains, a glowing fabric floor lamp, a tall palm plant in a dark ceramic pot, a low wooden side cabinet, and a wooden floor with a beige jute rug",
      setting: "a cosy podcast studio with brown velvet curtains, a glowing floor lamp, a palm plant and a jute rug",
    },
    courtyard: {
      label: "Courtyard",
      hint: "Brick jaali, plants",
      chair: "cane",
      scene: "a shaded verandah opening onto the courtyard of a contemporary Indian home: an exposed-brick jaali screen wall, terracotta planters with lush tropical plants, slender concrete columns, a small side table with a clay cup and a sketchbook, and a polished red-oxide floor",
      setting: "a shaded courtyard verandah with an exposed-brick jaali wall, terracotta planters and a red-oxide floor",
    },
    concrete: {
      label: "Concrete & light",
      hint: "Brutalist, skylight",
      chair: "leather",
      scene: "a modernist exposed-concrete interior inspired by Indian brutalist architecture: board-formed concrete walls, a deep circular opening, a skylight, a low plinth with a white architectural model, and a warm wooden floor",
      setting: "a brutalist exposed-concrete interior with a circular opening, a skylight and a white architectural model on a plinth",
    },
  };

  const CHAIRS = {
    auto: { label: "Suits the style", hint: "Automatic" },
    velvet: { label: "Teal velvet", hint: "Deep, rounded arms", text: "deep teal velvet lounge armchair with rounded arms" },
    cane: { label: "Teak & cane", hint: "Mid-century", text: "teak-and-cane lounge armchair" },
    boucle: { label: "Bouclé", hint: "Cream, rounded", text: "cream bouclé swivel armchair" },
    leather: { label: "Leather", hint: "Cognac lounge", text: "cognac leather lounge armchair" },
  };

  const LIGHTS = {
    soft: { label: "Soft studio", hint: "Even, clean", text: "soft, even, diffused studio light from the front, slightly cool and clean, gentle shadows", short: "soft, even studio light from the front" },
    warm: { label: "Warm evening", hint: "Lamps, amber glow", text: "warm amber evening light from lamps and soft uplighting, cosy and cinematic", short: "warm amber evening lamplight" },
    day: { label: "Soft daylight", hint: "Bright, calm", text: "soft natural daylight from a large window, bright and calm", short: "soft natural daylight from a window" },
    moody: { label: "Moody", hint: "Low-key", text: "low-key cinematic light from warm practical lamps with deep, soft shadows", short: "low-key cinematic lamplight with soft shadows" },
  };

  const FRAMINGS = {
    close: {
      label: "Talking-head",
      hint: "Close, like a clip",
      text:
        "Framing like a talking-head podcast clip: medium close shot from about one and a half metres away, camera at seated chest height, straight on, with the chair turned slightly toward the left. " +
        "The chair's backrest and both armrests fill the lower two-thirds of the frame and are cropped by the bottom edge at seat level. " +
        "The curtains fill everything above the chair, with empty space where a seated person's head and shoulders would be. " +
        "A black broadcast dynamic microphone on a black boom arm enters from the left edge of the frame and points toward the empty seat at mouth height, about 40 percent down from the top of the frame. " +
        "Do not show the whole room, the floor or the ceiling.",
      noRoomRef: true,
    },
    wide: {
      label: "Whole room",
      hint: "Recommended",
      text: "Wide shot of the whole set from about five metres away, camera at seated eye level, straight on. The chair stands in the lower middle of the frame and fills only about a third of the frame width. The whole chair, the microphone stand, the floor and the rug are fully visible, with generous space around the chair and plenty of room above it. Do not crop or zoom in on the chair.",
    },
    medium: {
      label: "A bit closer",
      hint: "Chair and surroundings",
      text: "Medium-wide shot from about three metres away, camera at seated eye level, straight on. The chair stands in the lower middle of the frame and fills about half of the frame width. The whole chair, the microphone stand and some of the room around it are visible. Do not crop the chair.",
    },
  };

  const FORMATS = {
    vertical: { label: "Vertical 9:16", hint: "Reels, Shorts", aspect: "9:16" },
    landscape: { label: "Landscape 16:9", hint: "YouTube", aspect: "16:9" },
  };

  const QUALITIES = {
    "480p": { label: "Draft", hint: "480p" },
    "720p": { label: "Standard", hint: "720p" },
    "1080p": { label: "High", hint: "1080p" },
  };

  const ASPECTS = {
    "21:9": "Cinema 21:9",
    "16:9": "Landscape 16:9",
    "4:3": "Landscape 4:3",
    "1:1": "Square 1:1",
    "3:4": "Portrait 3:4",
    "9:16": "Vertical 9:16",
  };

  const LANGUAGES = {
    en: "English", hi: "Hindi", mr: "Marathi", gu: "Gujarati", bn: "Bengali", ta: "Tamil", te: "Telugu",
    kn: "Kannada", ml: "Malayalam", pa: "Punjabi", ur: "Urdu", sa: "Sanskrit", ne: "Nepali", as: "Assamese", sd: "Sindhi",
  };

  const CHARACTER_VISION_PROMPT = [
    "This image is a character reference for an AI video.",
    "Usually the LEFT half is a close-up portrait of one person and the RIGHT half shows that person's full outfit on a ghost mannequin.",
    "Describe only what is visible. Do not guess names, age, profession or emotions.",
    "Reply with one JSON object and nothing else, using exactly these keys:",
    '{"layout": "sheet" if it has the portrait-plus-outfit layout, otherwise "photo",',
    ' "face": "one short phrase: hair style and colour, facial hair or clean-shaven, glasses if any, skin tone",',
    ' "outfit": "every visible garment, footwear and accessory from top to bottom, with colour and material, comma-separated"}',
    'Example: {"layout": "sheet", "face": "short wavy black hair, neatly trimmed beard, rimless glasses, medium-brown skin", ' +
      '"outfit": "charcoal Nehru jacket over an off-white linen kurta, slim charcoal trousers, tan leather loafers, steel wristwatch"}',
  ].join("\n");

  const SCENE_VISION_PROMPT = [
    "This image is the empty set for a podcast video.",
    "Describe only what is visible.",
    "Reply with one JSON object and nothing else, using exactly these keys:",
    '{"setting": "one sentence of at most 25 words naming the kind of space and its key furniture, materials and props",',
    ' "seat": "the main seat a speaker would sit in, with colour or material and its position in the frame, or null if there is none",',
    ' "microphone": true if a podcast microphone is visible, otherwise false,',
    ' "lighting": "at most 12 words on the light, its colour and direction"}',
    'Example: {"setting": "an architect\'s design studio with teak bookshelves, white massing models and a drafting table on a Kota stone floor", ' +
      '"seat": "teak-and-cane lounge armchair in the centre", "microphone": true, "lighting": "soft late-afternoon daylight from the left with jaali shadows"}',
  ].join("\n");

  const MIN_AUDIO = 2;
  const MAX_AUDIO = 30;
  const MIN_CLIP = 4;
  const WAV_RATE = 44100;
  const STATE_KEY = "architect-podcast-studio:v2";
  const KEY_STORAGE = "ai-avatar-studio:fal-key";
  const FAL_REST = "https://rest.fal.ai";
  const FAL_QUEUE = "https://queue.fal.run";
  const MAX_UPLOAD_BYTES = 90 * 1024 * 1024;

  // kie.ai: an alternative provider for the images and the Seedance 2.5 video.
  const KIE_KEY_STORAGE = "architect-podcast-studio:kie-key";
  const KIE_API = "https://api.kie.ai";
  const KIE_UPLOAD = "https://kieai.redpandaai.co";
  const KIE_MODELS = { image: "nano-banana-pro", imageEdit: "nano-banana-pro", video: "bytedance/seedance-2-5" };
  // Jobs that run on the provider the user picked. The rest (reading images, transcription,
  // audio conversion) are optional helpers that only run with fal.ai credentials.
  const PROVIDER_KINDS = new Set(["image", "imageEdit", "video"]);
  const PROVIDERS = { kie: "kie.ai", fal: "fal.ai" };

  // ===========================================================================
  // State
  // ===========================================================================

  const DEFAULTS = {
    characterMode: "upload", // "upload" | "create"
    speaker: "man",
    look: "indowestern",
    characterNotes: "",
    customCharacterPrompt: null,
    selfieUrl: null,
    characterUrl: null,
    characterSource: null, // "generated" | "uploaded"
    characterLook: null,
    characterInfo: null, // { for, face, outfit, layout } or { for, failed }

    setMode: "upload", // "upload" | "create"
    setStyle: "velvet",
    chair: "auto",
    light: "soft",
    framing: "close",
    format: "vertical",
    useReference: true,
    setNotes: "",
    customSetPrompt: null,
    backgroundUrl: null,
    backgroundSource: null,
    backgroundAspect: null,
    backgroundRead: null, // description of a generated set, used if reading the image fails
    sceneInfo: null, // { for, setting, seat, microphone, lighting } or { for, failed }

    audio: null, // { url, name, duration, format }
    transcript: null, // { for, text, chunks, language } or { for, failed }

    assetId: "",

    provider: "kie", // "kie" | "fal"
    quality: "720p",
    customPrompt: null,
    videoJob: null,
    result: null,
  };

  const saved = loadState();
  const state = Object.assign({}, DEFAULTS, saved);
  const enums = [["speaker", SPEAKERS], ["look", LOOKS], ["setStyle", SET_STYLES], ["chair", CHAIRS], ["light", LIGHTS], ["framing", FRAMINGS], ["format", FORMATS], ["quality", QUALITIES]];
  for (const [k, opts] of enums) if (!opts[state[k]]) state[k] = DEFAULTS[k];
  if (!["upload", "create"].includes(state.characterMode)) state.characterMode = "upload";
  if (!["upload", "create"].includes(state.setMode)) state.setMode = "upload";
  if (!PROVIDERS[state.provider]) state.provider = "kie";
  if (!saved.setDefaultsV) {
    Object.assign(state, { setStyle: "velvet", chair: "auto", light: "soft", framing: "close", customSetPrompt: null, setDefaultsV: 2 });
  }
  // Earlier versions sent the MP4 itself to the video model, which can fail. Ask for the recording again.
  let audioMigrated = false;
  if (state.audio && !state.audio.format) {
    state.audio = null;
    state.transcript = null;
    audioMigrated = true;
  }
  if (saved.characterSource === "generated" && !("characterMode" in saved)) state.characterMode = "create";
  if (saved.backgroundSource === "generated" && !("setMode" in saved)) state.setMode = "create";

  const busy = { character: null, background: null, audio: null, video: null }; // { text, since, stage }
  const pending = { character: null, scene: null, transcript: null };
  const backend = { mode: "direct", models: DEFAULT_MODELS };
  let pendingKeyAction = null;
  let referenceUrl = null;

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STATE_KEY) || "{}") || {}; } catch { return {}; }
  }
  function save() {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  const $ = (id) => document.getElementById(id);
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const fmtSec = (s) => (Number.isFinite(s) ? `${s.toFixed(1)} s` : "unknown length");
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const stripArticle = (s) => s.replace(/^(a|an|the)\s+/i, "");
  const anyBusy = () => Object.values(busy).some(Boolean);
  const userError = (msg) => Object.assign(new Error(msg), { userFacing: true });

  function clean(text, max = 260) {
    if (typeof text !== "string") return null;
    let t = text.replace(/\s+/g, " ").trim().replace(/^["'“”]+|["'“”]+$/g, "").replace(/[.;,\s]+$/, "");
    if (!t || /^(null|none|n\/a|unknown|not visible)$/i.test(t)) return null;
    if (t.length > max) t = t.slice(0, max).replace(/[,;\s]+[^,;\s]*$/, "");
    return t;
  }

  function notes(text) {
    const t = clean(text || "", 300);
    return t ? `Also: ${t}.` : "";
  }

  function setStatus(id, msg, kind = "") {
    const el = $(id);
    if (!el) return;
    el.textContent = msg || "";
    el.className = `status ${kind}`.trim();
  }

  function setBusy(key, text, stage) {
    busy[key] = text ? { text, since: busy[key]?.since || Date.now(), stage: stage || busy[key]?.stage || null } : null;
  }

  function elapsed(since) {
    const s = Math.max(0, Math.round((Date.now() - since) / 1000));
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
  }

  function describe(s) {
    if (!s) return "";
    if (s.status === "IN_QUEUE") return s.queuePosition != null ? `waiting in line (position ${s.queuePosition + 1})` : "waiting in line";
    if (s.status === "IN_PROGRESS") return "working";
    if (s.status === "COMPLETED") return "finishing";
    return "starting";
  }

  // ===========================================================================
  // Transport: local server (key on the server) or direct to fal.ai (key in browser)
  // ===========================================================================

  async function api(path, opts = {}) {
    let res;
    try { res = await fetch(path, opts); } catch {
      throw Object.assign(new Error("Could not reach the server. Is it still running?"), { network: true });
    }
    let body = null;
    try { body = await res.json(); } catch { /* not JSON */ }
    if (!res.ok) throw Object.assign(new Error(body?.error || `Server error ${res.status}`), { status: res.status });
    return body;
  }

  const readKey = (k) => { try { return (localStorage.getItem(k) || "").trim(); } catch { return ""; } };
  const getKey = () => readKey(KEY_STORAGE); // fal.ai
  const getKieKey = () => readKey(KIE_KEY_STORAGE);
  const writeKey = (k, v) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch { /* ignore */ } };
  // fal.ai is available through the local server or a key in this browser.
  const falReady = () => backend.mode === "server" || Boolean(getKey());
  const kieReady = () => Boolean(getKieKey());
  // The provider the user picked for images and video.
  const hasCredentials = () => (state.provider === "kie" ? kieReady() : falReady());
  const assetRef = () => {
    const id = (state.assetId || "").trim().replace(/^asset:\/\//i, "");
    return state.provider === "kie" && id ? `asset://${id}` : null;
  };

  function falError(body) {
    const d = body?.detail;
    if (Array.isArray(d)) return d.map((x) => [(x.loc || []).filter((p) => p !== "body").join("."), x.msg].filter(Boolean).join(": ")).join("; ");
    if (d) return typeof d === "string" ? d : JSON.stringify(d);
    return body?.message || body?.error || null;
  }

  async function falFetch(url, opts = {}) {
    const key = getKey();
    if (!key) throw Object.assign(new Error("Add your fal.ai API key to continue."), { missingKey: true });
    let res;
    try {
      res = await fetch(url, { ...opts, headers: { Authorization: `Key ${key}`, Accept: "application/json", ...(opts.headers || {}) } });
    } catch {
      throw Object.assign(new Error("Could not reach fal.ai. Check your internet connection and try again."), { network: true });
    }
    const text = await res.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
    if (!res.ok) {
      const detail = falError(body);
      let msg = detail || `fal.ai error ${res.status}`;
      if (res.status === 401) msg = "fal.ai did not accept the API key. Click the key button at the top right to check it.";
      else if (res.status === 403) msg = `fal.ai refused the request${detail ? `: ${detail}` : ". Check the API key and your fal.ai balance."}`;
      throw Object.assign(new Error(msg), { status: res.status });
    }
    return body;
  }

  async function kieFetch(url, opts = {}) {
    const key = getKieKey();
    if (!key) throw Object.assign(new Error("Add your kie.ai API key to continue."), { missingKey: true });
    let res;
    try {
      res = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${key}`, Accept: "application/json", ...(opts.headers || {}) } });
    } catch {
      throw Object.assign(new Error("Could not reach kie.ai. Check your internet connection and try again."), { network: true });
    }
    const text = await res.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
    const code = Number(body?.code ?? res.status);
    if (!res.ok || code !== 200) {
      const status = res.ok ? code : res.status;
      let msg = body?.msg || body?.message || `kie.ai error ${status}`;
      if (status === 401) msg = "kie.ai did not accept the API key. Click the key button at the top right to check it.";
      else if (status === 402) msg = "Your kie.ai account does not have enough credits for this.";
      else if (status === 429) msg = "kie.ai is rate-limiting requests. Wait a moment and try again.";
      throw Object.assign(new Error(msg), { status });
    }
    return body.data;
  }

  async function kieUpload(file) {
    if (file.size > MAX_UPLOAD_BYTES) throw userError("This file is too large. The limit is 90 MB.");
    const fd = new FormData();
    fd.append("file", file, file.name || `upload-${Date.now()}`);
    fd.append("uploadPath", "architect-podcast-studio");
    const data = await kieFetch(`${KIE_UPLOAD}/api/file-stream-upload`, { method: "POST", body: fd });
    const url = data?.downloadUrl || data?.fileUrl;
    if (!url) throw new Error("kie.ai did not return a file link. Please try again.");
    return { url };
  }

  /** Converts the app's request (fal.ai field names) into a kie.ai createTask input. */
  function kieInput(kind, input) {
    if (kind === "video") {
      const out = {
        prompt: input.prompt,
        reference_image_urls: input.image_urls,
        reference_audio_urls: input.audio_urls,
        aspect_ratio: input.aspect_ratio,
        resolution: input.resolution,
        duration: input.duration === "auto" ? -1 : Number(input.duration),
      };
      return out;
    }
    const out = { prompt: input.prompt, aspect_ratio: input.aspect_ratio, resolution: input.resolution, output_format: "png" };
    if (kind === "imageEdit") out.image_input = input.image_urls;
    return out;
  }

  async function kieSubmit(kind, input) {
    const data = await kieFetch(`${KIE_API}/api/v1/jobs/createTask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: KIE_MODELS[kind], input: kieInput(kind, input) }),
    });
    if (!data?.taskId) throw new Error("kie.ai did not return a task. Please try again.");
    return { mode: "kie", kind, requestId: data.taskId };
  }

  async function kieStatus(job) {
    const d = await kieFetch(`${KIE_API}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(job.requestId)}`);
    const st = String(d?.state || "").toLowerCase();
    if (st === "fail" || st === "failed") {
      const msg = [d.failMsg, d.failCode ? `(code ${d.failCode})` : ""].filter(Boolean).join(" ") || "kie.ai could not finish this task.";
      throw Object.assign(new Error(msg), { status: 400 });
    }
    if (st !== "success") return { status: st === "generating" ? "IN_PROGRESS" : "IN_QUEUE", queuePosition: null };
    let urls = [];
    try { urls = JSON.parse(d.resultJson || "{}").resultUrls || []; } catch { /* malformed */ }
    if (!urls.length) throw Object.assign(new Error("kie.ai finished the task without a file."), { status: 400 });
    const result = job.kind === "video" ? { video: { url: urls[0] } } : { images: urls.map((url) => ({ url })) };
    return { status: "COMPLETED", queuePosition: null, result };
  }

  const useKie = (kind) => state.provider === "kie" && PROVIDER_KINDS.has(kind);

  async function uploadFile(file) {
    if (state.provider === "kie") return kieUpload(file);
    if (backend.mode === "server") {
      const fd = new FormData();
      fd.append("file", file, file.name || "upload");
      return api("/api/upload", { method: "POST", body: fd });
    }
    if (file.size > MAX_UPLOAD_BYTES) throw userError("This file is too large. The limit is 90 MB.");
    const contentType = file.type || "application/octet-stream";
    const init = await falFetch(`${FAL_REST}/storage/upload/initiate?storage_type=fal-cdn-v3`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content_type: contentType, file_name: file.name || `upload-${Date.now()}` }),
    });
    let put;
    try {
      put = await fetch(init.upload_url, { method: "PUT", body: file, headers: { "Content-Type": contentType } });
    } catch {
      throw new Error("The upload was interrupted. Please try again.");
    }
    if (!put.ok) throw new Error(`The upload failed (${put.status}). Please try again.`);
    return { url: init.file_url };
  }

  async function submitJob(kind, input) {
    if (useKie(kind)) return kieSubmit(kind, input);
    if (backend.mode === "server") {
      const r = await api("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, input }),
      });
      return { mode: "server", kind, requestId: r.requestId };
    }
    const endpoint = backend.models[kind];
    const r = await falFetch(`${FAL_QUEUE}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const [owner, alias] = endpoint.split("/");
    const base = `${FAL_QUEUE}/${owner}/${alias}/requests/${r.request_id}`;
    return { mode: "direct", kind, requestId: r.request_id, statusUrl: r.status_url || `${base}/status`, responseUrl: r.response_url || base };
  }

  async function jobStatus(job) {
    if (job.mode === "kie") return kieStatus(job);
    if (job.mode === "server") return api(`/api/jobs/${job.kind}/${encodeURIComponent(job.requestId)}`);
    const sep = job.statusUrl.includes("?") ? "&" : "?";
    const s = await falFetch(`${job.statusUrl}${sep}logs=1`);
    const out = { status: s.status, queuePosition: s.queue_position ?? null };
    if (s.status === "COMPLETED") out.result = await falFetch(job.responseUrl);
    return out;
  }

  async function pollJob(job, interval, onUpdate) {
    let failures = 0;
    for (;;) {
      await sleep(interval);
      let s;
      try {
        s = await jobStatus(job);
        failures = 0;
      } catch (err) {
        // Retry short network hiccups; give up on real errors from fal.ai.
        if ((err.status && err.status < 500) || err.missingKey || ++failures > 5) throw err;
        continue;
      }
      onUpdate?.(s);
      if (s.status === "COMPLETED") {
        if (!s.result) throw new Error("The job finished without a result. Please try again.");
        return s.result;
      }
    }
  }

  async function runJob(kind, input, onUpdate, interval = 1500) {
    const job = await submitJob(kind, input);
    onUpdate?.({ status: "IN_QUEUE", queuePosition: null });
    return pollJob(job, interval, onUpdate);
  }

  // ===========================================================================
  // Prompts
  // ===========================================================================

  function characterPrompt() {
    const look = LOOKS[state.look] || LOOKS.indowestern;
    const outfit = look.outfit
      ? `the full outfit as a ghost mannequin, front view, head to toe: ${look.outfit}`
      : "the full outfit as a ghost mannequin, front view, head to toe: the same clothes the person wears in the photo, completed naturally into a smart full outfit with matching trousers and footwear";
    return [
      "Use the uploaded photo for the face. Create one wide 16:9 character sheet on a plain white background.",
      "LEFT side: close-up studio portrait of this exact person, with the same face, hair, facial hair, glasses (if any) and skin tone. Do not change age, face shape or features. Calm, confident and approachable expression.",
      `RIGHT side: ${outfit}.`,
      notes(state.characterNotes),
      "Photorealistic, soft even studio light, no text, no logos.",
    ].filter(Boolean).join(" ");
  }

  function chairName() {
    const id = state.chair === "auto" ? SET_STYLES[state.setStyle].chair : state.chair;
    return CHAIRS[id].text;
  }

  const referenceApplies = () => state.useReference && !FRAMINGS[state.framing].noRoomRef;

  function setPrompt() {
    const style = SET_STYLES[state.setStyle];
    const fmt = FORMATS[state.format];
    const close = Boolean(FRAMINGS[state.framing].noRoomRef);
    return [
      referenceApplies()
        ? "Use the attached image only as a guide for camera distance, camera height, framing and composition: match how much of the room is visible and how small the chair is in the frame. Do not copy its furniture, decor or colours unless they are described below."
        : "",
      `${fmt.aspect === "9:16" ? "Vertical 9:16" : "Wide 16:9"} photograph of an empty podcast set in ${style.scene}.`,
      close
        ? `In the centre of the frame is an empty ${chairName()}.`
        : `In the centre stands an empty ${chairName()}, angled slightly toward the camera, with a black podcast microphone on a boom-arm stand beside it, pointing at the seat.`,
      FRAMINGS[state.framing].text,
      `Lighting: ${LIGHTS[state.light].text}.`,
      notes(state.setNotes),
      "No people, no person, no hands. Photorealistic photograph, natural colours, sharp focus, no text, no captions, no watermark, no logos.",
    ].filter(Boolean).join(" ");
  }

  function characterDetails() {
    const info = state.characterInfo;
    if (info && info.for === state.characterUrl && !info.failed) return { ...info, source: "analysis" };
    const look = state.characterSource === "generated" ? LOOKS[state.characterLook] : null;
    if (look?.outfit) return { face: null, outfit: look.outfit, layout: "sheet", source: "preset" };
    return { face: null, outfit: null, layout: "sheet", source: "generic" };
  }

  function sceneDetails() {
    const info = state.sceneInfo;
    if (info && info.for === state.backgroundUrl && !info.failed) return { ...info, source: "analysis" };
    if (state.backgroundSource === "generated" && state.backgroundRead) return { ...state.backgroundRead, source: "preset" };
    return { setting: null, seat: null, microphone: false, lighting: null, source: "generic" };
  }

  function transcriptReady() {
    const t = state.transcript;
    return Boolean(t && state.audio && t.for === state.audio.url && !t.failed);
  }

  function audioSeconds() {
    if (Number.isFinite(state.audio?.duration)) return state.audio.duration;
    if (!transcriptReady()) return null;
    const ends = state.transcript.chunks.map((c) => Number(c?.timestamp?.[1])).filter(Number.isFinite);
    return ends.length ? Math.max(...ends) : null;
  }

  function clipDuration() {
    const s = audioSeconds();
    return s ? clamp(Math.ceil(s - 0.05), MIN_CLIP, MAX_AUDIO) : null;
  }

  /** Splits the clip into camera shots, preferring natural pauses in the speech. */
  function planCuts(D, chunks) {
    const ends = (Array.isArray(chunks) ? chunks : [])
      .map((c) => Number(Array.isArray(c?.timestamp) ? c.timestamp[1] : NaN))
      .filter((t) => Number.isFinite(t) && t > 1 && t < D - 1);
    let snapped = false;
    const pick = (target, lo, hi) => {
      let best = null;
      for (const t of ends) {
        if (t >= lo && t <= hi && (best === null || Math.abs(t - target) < Math.abs(best - target))) best = t;
      }
      if (best === null) return Math.ceil(target - 1e-6);
      snapped = true;
      return Math.round(best);
    };
    if (D < 6) {
      const a = clamp(pick(D / 2, D * 0.35, D * 0.65), 2, D - 2);
      return { points: [0, a, D], snapped };
    }
    const w = D / 6;
    let a = pick(D / 3, D / 3 - w, D / 3 + w);
    let b = pick((2 * D) / 3, (2 * D) / 3 - w, (2 * D) / 3 + w);
    a = clamp(a, 2, D - 4);
    b = clamp(b, a + 2, D - 2);
    return { points: [0, a, b, D], snapped };
  }

  function currentCuts() {
    const D = clipDuration() || MAX_AUDIO;
    return planCuts(D, transcriptReady() ? state.transcript.chunks : null);
  }

  /** Writes the Seedance prompt in the house template, filled from the inputs and fitted to the recording. */
  function composeVideoPrompt() {
    const ch = assetRef() ? { ...characterDetails(), layout: "photo" } : characterDetails();
    const sc = sceneDetails();
    const sp = SPEAKERS[state.speaker] || SPEAKERS.man;
    const who = `the ${sp.noun}`;
    const Who = `The ${sp.noun}`;
    const { points } = currentCuts();
    const lang = transcriptReady() ? LANGUAGES[state.transcript.language] : null;
    const facial = sp.noun === "man" && !/clean[- ]?shaven/i.test(ch.face || "") ? "beard" : "facial hair";
    const trim = (t) => (t || "").replace(/[.\s]+$/, "");

    // 1. Who: face and outfit from the character sheet (or a verified portrait).
    let p1;
    if (ch.layout === "photo") {
      p1 = `@Image1 defines ${who}'s face, hair, ${facial}, skin tone and full outfit${ch.outfit ? `: ${trim(ch.outfit)}` : ""}.` +
        ` The output must contain only this one ${sp.noun}. Do not use the background of @Image1.`;
    } else {
      p1 = `@Image1 defines ${who}'s face, hair, ${facial}, skin tone and full outfit. Use the face from the left side of the image and the outfit from the right side` +
        `${ch.outfit ? `: ${trim(ch.outfit)}` : ""}. The output must contain only this one ${sp.noun}. Do not use the white background of @Image1.`;
    }

    // 2. Where: the set.
    const sceneText = trim(sc.scene || [sc.setting, sc.seat, sc.microphone ? "a black podcast microphone on a boom-arm stand" : null, sc.lighting].filter(Boolean).join(", "));
    const p2 = `@Image2 defines the scene${sceneText ? `: ${sceneText}` : ""}. Keep the scene layout, furniture and lighting exactly as in @Image2.`;

    // 3. The voice.
    const p3 = `@Audio1 defines only the audio: ${who}'s voice and complete dialogue${lang ? ` in ${lang}` : ""}. ` +
      `Use @Audio1 exactly as provided, as the only audio track in the video. ${Who} lip-syncs precisely to @Audio1 throughout. ` +
      `Do not generate any new dialogue, voice, music, sound effects or ambience.`;

    // 4. Performance.
    const seat = sc.seat ? `the ${trim(sc.seat).replace(/^(a|an|the)\s+/i, "").replace(/\s+in the (centre|center).*$/i, "")} from @Image2` : "the chair from @Image2";
    const p4 = `${Who} sits relaxed in ${seat} and speaks directly to the camera in a casual, confident podcast style` +
      `${sc.microphone !== false ? `, with the boom-arm microphone positioned near ${sp.his} mouth` : ""}. ` +
      `${sp.His} mouth movements, pauses and facial expressions follow the rhythm of the audio from @Audio1: a slight smirk at the start, ` +
      `small natural hand gestures while talking, relaxed shoulders, natural blinking, and steady eye contact with the camera.`;

    // 5. Look.
    const lightLook = (sc.light && LIGHT_LOOKS[sc.light]) || (sc.lighting ? `${trim(sc.lighting)}, soft shadows` : LIGHT_LOOKS.warm);
    const p5 = `The visuals feature ${lightLook}, natural skin texture, realistic fabric texture on the outfit, and a photorealistic authentic UGC creator look.`;

    // 6. Cuts, fitted to the recording.
    let shots;
    if (points.length === 3) {
      const [, a, D] = points;
      shots = [
        `Use two hard cuts:`,
        `[0–${a}s] Medium-wide shot, eye-level, straight-on: ${who} seated in the chair, with the set softly behind.`,
        `[${a}–${D}s] Hard jump cut to an extreme close-up of ${sp.his} face from just above the eyebrows to the chin, direct eye-level, intense eye contact, ending on a small confident smile.`,
      ];
    } else {
      const [, a, b, D] = points;
      shots = [
        `Use three hard cuts:`,
        `[0–${a}s] Wide full shot, eye-level, straight-on: full body visible seated in the chair, with the floor, the furniture and the whole set in frame.`,
        `[${a}–${b}s] Hard cut to a medium close-up from mid-torso up, slightly angled from the side, eye-level to slightly low angle${sc.microphone !== false ? ", with the microphone and boom arm prominent in the foreground" : ""}.`,
        `[${b}–${D}s] Hard jump cut to an extreme close-up of ${sp.his} face from just above the eyebrows to the chin, direct eye-level, intense eye contact, ending on a small confident smile.`,
      ];
    }

    const p7 = `${Who}'s face, outfit, lighting and scene stay identical across all ${points.length - 1 === 2 ? "two" : "three"} cuts.`;
    const p8 = "Audio includes only the original audio from @Audio1. No background music, no sound effects, no added ambience, no subtitles, no on-screen text.";
    return [p1, p2, p3, p4, p5, shots.join("\n"), p7, p8].join("\n\n");
  }

  // Prompt boxes: each is written automatically until the user chooses to edit it.
  const PROMPT_BOXES = {
    character: { custom: "customCharacterPrompt", compose: characterPrompt, ta: "prompt-character", mode: "pmode-character", edit: "btn-customise-character", auto: "btn-auto-character" },
    set: { custom: "customSetPrompt", compose: setPrompt, ta: "prompt-set", mode: "pmode-set", edit: "btn-customise-set", auto: "btn-auto-set" },
    video: { custom: "customPrompt", compose: composeVideoPrompt, ta: "prompt-video", mode: "pmode-video", edit: "btn-customise-video", auto: "btn-auto-video" },
  };
  const promptFor = (box) => (state[PROMPT_BOXES[box].custom] ?? PROMPT_BOXES[box].compose()).trim();

  // ===========================================================================
  // Reading the inputs (vision + transcription)
  // ===========================================================================

  function parseJsonLoose(text) {
    if (typeof text !== "string") return null;
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try { return JSON.parse(m[0]); } catch { return null; }
  }

  async function runVision(prompt, imageUrl) {
    let lastErr = null;
    for (const model of VISION_MODELS) {
      try {
        const r = await runJob("vision", { model, prompt, image_urls: [imageUrl], temperature: 0.2, max_tokens: 500 }, null, 1200);
        const parsed = parseJsonLoose(r?.output);
        if (parsed) return parsed;
        lastErr = new Error("The image description could not be read.");
      } catch (err) {
        if (err.missingKey) throw err;
        lastErr = err;
      }
    }
    throw lastErr || new Error("The image could not be analysed.");
  }

  function track(slot, fn) {
    let p = null;
    p = (async () => {
      try { await fn(); } finally {
        if (pending[slot] === p) pending[slot] = null;
        save();
        render();
      }
    })();
    pending[slot] = p;
    render();
    return p;
  }

  function analyseCharacter() {
    const url = state.characterUrl;
    if (!url || !falReady()) return null;
    return track("character", async () => {
      try {
        const j = await runVision(CHARACTER_VISION_PROMPT, url);
        if (state.characterUrl !== url) return;
        const info = {
          for: url,
          layout: String(j.layout || "").toLowerCase() === "photo" ? "photo" : "sheet",
          face: clean(j.face, 180),
          outfit: clean(j.outfit, 320),
        };
        state.characterInfo = info.face || info.outfit ? info : { for: url, failed: true };
      } catch (err) {
        console.warn("Character analysis failed:", err);
        if (state.characterUrl === url) state.characterInfo = { for: url, failed: true };
      }
    });
  }

  function analyseScene() {
    const url = state.backgroundUrl;
    if (!url || !falReady()) return null;
    return track("scene", async () => {
      try {
        const j = await runVision(SCENE_VISION_PROMPT, url);
        if (state.backgroundUrl !== url) return;
        const info = {
          for: url,
          setting: clean(j.setting, 220),
          seat: clean(j.seat, 120),
          microphone: j.microphone === true || /^(true|yes)$/i.test(String(j.microphone)),
          lighting: clean(j.lighting, 110),
        };
        state.sceneInfo = info.setting || info.seat ? info : { for: url, failed: true };
      } catch (err) {
        console.warn("Set analysis failed:", err);
        if (state.backgroundUrl === url) state.sceneInfo = { for: url, failed: true };
      }
    });
  }

  function transcribeAudio() {
    const url = state.audio?.url;
    if (!url || !falReady()) return null;
    return track("transcript", async () => {
      try {
        const r = await runJob("transcribe", { audio_url: url, task: "transcribe", chunk_level: "segment" }, null, 1200);
        if (state.audio?.url !== url) return;
        const chunks = (Array.isArray(r?.chunks) ? r.chunks : []).slice(0, 200).map((c) => ({
          timestamp: Array.isArray(c?.timestamp) ? c.timestamp.slice(0, 2) : null,
          text: String(c?.text || "").trim(),
        }));
        state.transcript = {
          for: url,
          text: String(r?.text || "").trim(),
          chunks,
          language: Array.isArray(r?.inferred_languages) ? r.inferred_languages[0] || null : null,
        };
      } catch (err) {
        console.warn("Transcription failed:", err);
        if (state.audio?.url === url) state.transcript = { for: url, failed: true };
      }
    });
  }

  /** Reads any input that has not been read yet (after a reload or once a key is added). */
  function refreshAnalyses(force = false) {
    if (!falReady()) return;
    if (state.characterUrl && !pending.character && (force || state.characterInfo?.for !== state.characterUrl)) analyseCharacter();
    if (state.backgroundUrl && !pending.scene && (force || state.sceneInfo?.for !== state.backgroundUrl)) analyseScene();
    if (state.audio?.url && !pending.transcript && (force || state.transcript?.for !== state.audio.url)) transcribeAudio();
  }

  // ===========================================================================
  // Media helpers
  // ===========================================================================

  /** Reads the duration straight from the MP4 header (works for any codec). */
  async function mp4Duration(file) {
    const read = async (start, len) => new DataView(await file.slice(start, start + len).arrayBuffer());
    const type = (dv, o) => String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3));
    let pos = 0;
    for (let guard = 0; pos + 8 <= file.size && guard < 10000; guard++) {
      const h = await read(pos, 16);
      if (h.byteLength < 8) return null;
      let size = h.getUint32(0);
      const t = type(h, 4);
      let header = 8;
      if (size === 1) {
        if (h.byteLength < 16) return null;
        size = Number(h.getBigUint64(8));
        header = 16;
      } else if (size === 0) {
        size = file.size - pos;
      }
      if (size < header) return null;
      if (t === "moov") {
        const moov = await read(pos + header, Math.min(size - header, 2 * 1024 * 1024));
        for (let p = 0; p + 8 <= moov.byteLength; ) {
          const cs = moov.getUint32(p);
          if (type(moov, p + 4) === "mvhd") {
            const v = moov.getUint8(p + 8);
            let timescale, duration;
            if (v === 1) {
              if (p + 40 > moov.byteLength) return null;
              timescale = moov.getUint32(p + 28);
              duration = Number(moov.getBigUint64(p + 32));
            } else {
              if (p + 28 > moov.byteLength) return null;
              timescale = moov.getUint32(p + 20);
              duration = moov.getUint32(p + 24);
            }
            const d = timescale ? duration / timescale : null;
            return d && Number.isFinite(d) && d > 0 ? d : null;
          }
          if (cs < 8) break;
          p += cs;
        }
        return null;
      }
      pos += size;
    }
    return null;
  }

  /** Decodes the audio track of a file in the browser (resampled, any channel count). */
  async function decodeAudio(file) {
    const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!Ctx) throw new Error("This browser cannot decode audio.");
    const data = await file.arrayBuffer();
    const ctx = new Ctx(1, WAV_RATE, WAV_RATE);
    return new Promise((resolve, reject) => {
      const p = ctx.decodeAudioData(data, resolve, reject);
      if (p && typeof p.then === "function") p.then(resolve, reject);
    });
  }

  /** Encodes an AudioBuffer as a mono 16-bit PCM WAV file. */
  function encodeWav(buffer, maxSeconds) {
    const rate = buffer.sampleRate;
    const len = Math.min(buffer.length, Math.round(rate * maxSeconds));
    const channels = buffer.numberOfChannels;
    const mono = new Float32Array(len);
    for (let c = 0; c < channels; c++) {
      const d = buffer.getChannelData(c);
      for (let i = 0; i < len; i++) mono[i] += d[i] / channels;
    }
    const out = new DataView(new ArrayBuffer(44 + len * 2));
    const str = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
    str(0, "RIFF");
    out.setUint32(4, 36 + len * 2, true);
    str(8, "WAVE");
    str(12, "fmt ");
    out.setUint32(16, 16, true);
    out.setUint16(20, 1, true);
    out.setUint16(22, 1, true);
    out.setUint32(24, rate, true);
    out.setUint32(28, rate * 2, true);
    out.setUint16(32, 2, true);
    out.setUint16(34, 16, true);
    str(36, "data");
    out.setUint32(40, len * 2, true);
    for (let i = 0; i < len; i++) {
      const s = Math.max(-1, Math.min(1, mono[i]));
      out.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return new Blob([out], { type: "audio/wav" });
  }

  function imageSize(file) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { resolve({ w: img.naturalWidth, h: img.naturalHeight }); URL.revokeObjectURL(url); };
      img.onerror = () => { resolve(null); URL.revokeObjectURL(url); };
      img.src = url;
    });
  }

  function nearestAspect(w, h) {
    if (!w || !h) return null;
    const r = Math.log(w / h);
    let best = null;
    let bestDist = Infinity;
    for (const a of Object.keys(ASPECTS)) {
      const [x, y] = a.split(":").map(Number);
      const d = Math.abs(Math.log(x / y) - r);
      if (d < bestDist) { best = a; bestDist = d; }
    }
    return best;
  }

  const isPortrait = (aspect) => aspect === "9:16" || aspect === "3:4";

  async function getReferenceUrl() {
    if (referenceUrl) return referenceUrl;
    const res = await fetch(REFERENCE_PATH);
    if (!res.ok) throw new Error("The framing reference image could not be loaded.");
    const file = new File([await res.blob()], "podcast-set-framing.jpg", { type: "image/jpeg" });
    referenceUrl = (await uploadFile(file)).url;
    return referenceUrl;
  }

  // ===========================================================================
  // Actions (nothing here runs on its own: every generation starts from a button)
  // ===========================================================================

  function ensureKey(action) {
    if (hasCredentials()) return true;
    pendingKeyAction = action;
    openKeyPanel(`Add your ${PROVIDERS[state.provider]} key to continue. The step you started will carry on right after.`);
    return false;
  }

  async function onSelfie(file) {
    if (!file.type.startsWith("image/")) return setStatus("status-character", "Please choose an image file (JPG, PNG or WebP).", "error");
    if (busy.character) return setStatus("status-character", "Please wait for the current step to finish.", "error");
    if (!ensureKey(() => onSelfie(file))) return;
    setStatus("status-character", "");
    setBusy("character", "Uploading the selfie…");
    render();
    try {
      const { url } = await uploadFile(file);
      state.selfieUrl = url;
      save();
      setStatus("status-character", "Selfie added. Choose a look, then press Create character sheet.", "ok");
    } catch (err) {
      setStatus("status-character", err.message, "error");
    } finally {
      setBusy("character", null);
      render();
    }
  }

  async function generateCharacter() {
    if (busy.character) return;
    if (!state.selfieUrl) return setStatus("status-character", "Add a selfie first.", "error");
    if (!ensureKey(generateCharacter)) return;
    const look = state.look;
    const prompt = promptFor("character");
    setStatus("status-character", "");
    setBusy("character", "Creating the character sheet…");
    render();
    try {
      const r = await runJob(
        "imageEdit",
        { prompt, image_urls: [state.selfieUrl], aspect_ratio: "16:9", resolution: "2K", output_format: "png", num_images: 1 },
        (s) => { setBusy("character", `Creating the character sheet, ${describe(s)}…`); renderBusy(); },
      );
      const url = r?.images?.[0]?.url;
      if (!url) throw new Error("No image came back. Please try again.");
      Object.assign(state, { characterUrl: url, characterSource: "generated", characterLook: look, characterInfo: null });
      save();
      setStatus("status-character", "Character sheet ready.", "ok");
      analyseCharacter();
    } catch (err) {
      setStatus("status-character", err.message, "error");
    } finally {
      setBusy("character", null);
      render();
    }
  }

  async function onOwnCharacter(file) {
    if (!file.type.startsWith("image/")) return setStatus("status-character", "Please choose an image file.", "error");
    if (busy.character) return setStatus("status-character", "Please wait for the current step to finish.", "error");
    if (!ensureKey(() => onOwnCharacter(file))) return;
    setStatus("status-character", "");
    setBusy("character", "Uploading the character sheet…");
    render();
    try {
      const { url } = await uploadFile(file);
      Object.assign(state, { characterUrl: url, characterSource: "uploaded", characterLook: null, characterInfo: null });
      save();
      setStatus("status-character", "Character sheet added.", "ok");
      analyseCharacter();
    } catch (err) {
      setStatus("status-character", err.message, "error");
    } finally {
      setBusy("character", null);
      render();
    }
  }

  async function generateBackground() {
    if (busy.background) return;
    if (!ensureKey(generateBackground)) return;
    const fmt = FORMATS[state.format];
    const useRef = referenceApplies();
    const prompt = promptFor("set");
    const style = SET_STYLES[state.setStyle];
    const read = {
      setting: style.setting,
      scene: `${style.scene.replace(":", " with")}, ${chairName()} in the centre and a black podcast microphone on a boom-arm stand`,
      seat: `${chairName()} in the centre`,
      microphone: true,
      lighting: LIGHTS[state.light].short,
      light: state.light,
    };
    setStatus("status-set", "");
    setBusy("background", useRef ? "Preparing the framing reference…" : "Creating the studio set…");
    render();
    try {
      const input = { prompt, aspect_ratio: fmt.aspect, resolution: "2K", output_format: "png", num_images: 1 };
      if (useRef) input.image_urls = [await getReferenceUrl()];
      setBusy("background", "Creating the studio set…");
      renderBusy();
      const r = await runJob(useRef ? "imageEdit" : "image", input, (s) => {
        setBusy("background", `Creating the studio set, ${describe(s)}…`);
        renderBusy();
      });
      const url = r?.images?.[0]?.url;
      if (!url) throw new Error("No image came back. Please try again.");
      Object.assign(state, {
        backgroundUrl: url, backgroundSource: "generated", backgroundAspect: fmt.aspect, backgroundRead: read, sceneInfo: null,
      });
      save();
      setStatus("status-set", "Studio set ready.", "ok");
      analyseScene();
    } catch (err) {
      setStatus("status-set", err.message, "error");
    } finally {
      setBusy("background", null);
      render();
    }
  }

  async function onOwnBackground(file) {
    if (!file.type.startsWith("image/")) return setStatus("status-set", "Please choose an image file.", "error");
    if (busy.background) return setStatus("status-set", "Please wait for the current step to finish.", "error");
    if (!ensureKey(() => onOwnBackground(file))) return;
    setStatus("status-set", "");
    setBusy("background", "Uploading the set…");
    render();
    try {
      const size = await imageSize(file);
      const { url } = await uploadFile(file);
      Object.assign(state, {
        backgroundUrl: url, backgroundSource: "uploaded", backgroundRead: null, sceneInfo: null,
        backgroundAspect: (size && nearestAspect(size.w, size.h)) || FORMATS[state.format].aspect,
      });
      save();
      setStatus("status-set", "Studio set added.", "ok");
      analyseScene();
    } catch (err) {
      setStatus("status-set", err.message, "error");
    } finally {
      setBusy("background", null);
      render();
    }
  }

  /**
   * Prepares the voice: the audio is taken out of the MP4 and sent to the video model as a clean
   * WAV voice track, so audio-only MP4s and any video codec work.
   */
  async function onAudio(file) {
    const isMp4 = /\.mp4$/i.test(file.name || "") || file.type === "video/mp4" || file.type === "audio/mp4";
    if (!isMp4) return setStatus("status-voice", "Please use an MP4 file.", "error");
    if (busy.audio) return setStatus("status-voice", "Please wait for the current upload to finish.", "error");
    if (!ensureKey(() => onAudio(file))) return;
    setStatus("status-voice", "");
    setBusy("audio", "Checking the recording…");
    render();
    const checkLength = (secs) => {
      if (secs && secs > MAX_AUDIO + 0.2) throw userError(`This recording is ${fmtSec(secs)} long. Please trim it to ${MAX_AUDIO} seconds or less.`);
      if (secs && secs < MIN_AUDIO) throw userError(`This recording is only ${fmtSec(secs)} long. Please use at least ${MIN_AUDIO} seconds.`);
    };
    try {
      let secs = null;
      try { secs = await mp4Duration(file); } catch { /* not readable from the header */ }
      checkLength(secs);

      setBusy("audio", "Taking the voice out of the MP4…");
      renderBusy();
      let wav = null;
      try {
        const buffer = await decodeAudio(file);
        secs = buffer.duration;
        checkLength(secs);
        wav = encodeWav(buffer, MAX_AUDIO + 0.2);
      } catch (err) {
        if (err.userFacing) throw err;
        console.warn("In-browser audio decoding failed, converting on fal.ai instead:", err);
      }

      const base = (file.name || "recording").replace(/\.[^.]+$/, "");
      let url;
      let format;
      if (wav) {
        setBusy("audio", "Uploading the voice track…");
        renderBusy();
        url = (await uploadFile(new File([wav], `${base}-voice.wav`, { type: "audio/wav" }))).url;
        format = "wav";
      } else {
        if (!falReady()) {
          throw userError("This browser could not read the audio in this MP4. Try Chrome or Safari, or add a fal.ai key in the key panel so the recording can be converted online.");
        }
        setBusy("audio", "Converting the recording…");
        renderBusy();
        const src = (await uploadFile(file)).url;
        const r = await runJob("audioConvert", { audio_urls: [src], output_format: "mp3_44100_128" });
        url = r?.audio?.url;
        if (!url) throw new Error("The voice could not be taken out of this MP4. Please export the recording again and retry.");
        format = "mp3";
      }

      state.audio = { url, name: file.name || "recording.mp4", duration: secs || null, format };
      state.transcript = null;
      save();
      setStatus("status-voice", "Voice track ready. Clip length and camera cuts now follow it.", "ok");
      transcribeAudio();
    } catch (err) {
      setStatus("status-voice", err.message, "error");
    } finally {
      setBusy("audio", null);
      render();
    }
  }

  // Seedance refuses reference images that show a real, identifiable person.
  const REAL_PERSON = /likeness|real (people|person|human)|privacy|PrivacyInformation/i;

  function friendlyVideoError(err) {
    const m = err?.message || String(err);
    if (REAL_PERSON.test(m)) {
      const route = state.provider === "kie"
        ? "If the architect has a verified portrait asset ID, enter it in step 1 and try again."
        : "fal.ai does not offer that programme. kie.ai accepts verified portrait asset IDs, so switch to kie.ai in the key panel if you have one.";
      return "Seedance 2.5 refused the images because the character sheet shows a real person's face. " +
        "Seedance only accepts real people through ByteDance's verified-portrait programme, so trying again with the same sheet will fail the same way. " +
        `${route} Details: ${m}`;
    }
    if (/audio_urls|video_urls/i.test(m)) return `The video model could not read the voice track. Please add the recording again in step 3. Details: ${m}`;
    if (/image_urls/i.test(m)) return `The video model could not read one of the images. Try adding it again as a JPG or PNG. Details: ${m}`;
    return m;
  }

  const characterInput = () => assetRef() || state.characterUrl;

  async function createEpisode() {
    if (!(characterInput() && state.backgroundUrl && state.audio?.url) || busy.video) return;
    if (!ensureKey(createEpisode)) return;
    setStatus("status-video", "");
    setBusy("video", "Finishing the prompt…", "prompt");
    render();
    try {
      refreshAnalyses();
      await Promise.allSettled(Object.values(pending).filter(Boolean));
      const D = clipDuration();
      const aspect = state.backgroundAspect || FORMATS[state.format].aspect;
      const input = {
        prompt: promptFor("video"),
        image_urls: [characterInput(), state.backgroundUrl],
        audio_urls: [state.audio.url],
        aspect_ratio: aspect,
        resolution: state.quality,
        duration: D ? String(D) : "auto",
      };
      setBusy("video", "Sending to the video model…", "queue");
      renderProgress();
      const job = await submitJob("video", input);
      state.videoJob = { ...job, startedAt: Date.now(), meta: { aspect, resolution: state.quality, duration: D, provider: state.provider } };
      save();
    } catch (err) {
      setStatus("status-video", friendlyVideoError(err), "error");
      setBusy("video", null);
      render();
      return;
    }
    followVideo();
  }

  async function followVideo() {
    const job = state.videoJob;
    if (!job) return;
    if (job.mode !== "kie" && job.mode !== backend.mode) {
      state.videoJob = null;
      save();
      return render();
    }
    busy.video = { text: "Waiting in line…", since: job.startedAt || Date.now(), stage: "queue" };
    render();
    try {
      const result = await pollJob(job, 4000, (s) => {
        if (s.status === "IN_QUEUE") setBusy("video", `Waiting in line${s.queuePosition != null ? ` (position ${s.queuePosition + 1})` : ""}…`, "queue");
        else if (s.status === "IN_PROGRESS") setBusy("video", "Generating the video…", "render");
        else setBusy("video", "Finishing…", "render");
        renderProgress();
      });
      const url = result?.video?.url;
      if (!url) throw new Error("No video came back. Please try again.");
      state.result = { url, ...job.meta, createdAt: Date.now() };
      state.videoJob = null;
      save();
      setStatus("status-video", "Your clip is ready.", "ok");
      setBusy("video", null);
      render();
      $("step-result").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      state.videoJob = null;
      save();
      setStatus("status-video", friendlyVideoError(err), "error");
      setBusy("video", null);
      render();
    }
  }

  async function downloadResult() {
    const url = state.result?.url;
    if (!url) return;
    const btn = $("btn-download");
    btn.disabled = true;
    btn.textContent = "Preparing…";
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const blobUrl = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `podcast-clip-${new Date().toISOString().slice(0, 10)}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 20000);
    } catch {
      window.open(url, "_blank", "noopener");
    } finally {
      btn.disabled = false;
      btn.textContent = "Download MP4";
    }
  }

  // ===========================================================================
  // Rendering
  // ===========================================================================

  function buildChips(containerId, options, key) {
    const box = $(containerId);
    box.innerHTML = "";
    for (const [id, opt] of Object.entries(options)) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.setAttribute("role", "radio");
      b.dataset.value = id;
      b.innerHTML = "<b></b><small></small>";
      b.querySelector("b").textContent = opt.label;
      b.querySelector("small").textContent = opt.hint;
      b.addEventListener("click", () => {
        if (state[key] === id) return;
        state[key] = id;
        save();
        render();
      });
      box.appendChild(b);
    }
    box.addEventListener("keydown", (e) => {
      if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)) return;
      const chips = [...box.querySelectorAll(".chip")];
      const i = chips.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      const next = chips[(i + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : chips.length - 1)) % chips.length];
      next.focus();
      next.click();
    });
  }

  function updateChips(containerId, value, disabled = false) {
    for (const b of $(containerId).querySelectorAll(".chip")) {
      const on = b.dataset.value === value;
      b.setAttribute("aria-checked", String(on));
      b.tabIndex = on ? 0 : -1;
      b.disabled = disabled;
    }
  }

  function setImg(img, url) {
    if (!url) {
      img.hidden = true;
      img.removeAttribute("src");
      return;
    }
    if (img.getAttribute("src") !== url) img.src = url;
    img.hidden = false;
  }

  function renderTabs(group, panels) {
    for (const tab of document.querySelectorAll(`.segmented button[data-group="${group}"]`)) {
      const on = tab.dataset.mode === state[group];
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
    }
    for (const [mode, id] of Object.entries(panels)) $(id).hidden = state[group] !== mode;
  }

  function renderPromptBox(name) {
    const cfg = PROMPT_BOXES[name];
    const auto = state[cfg.custom] == null;
    const ta = $(cfg.ta);
    const text = auto ? cfg.compose() : state[cfg.custom];
    if (document.activeElement !== ta && ta.value !== text) ta.value = text;
    ta.readOnly = auto;
    const pill = $(cfg.mode);
    pill.textContent = auto ? "Written automatically" : "Edited by you";
    pill.className = `pill ${auto ? "pill-auto" : "pill-custom"}`;
    $(cfg.edit).hidden = !auto;
    $(cfg.auto).hidden = auto;
  }

  function renderBusy() {
    const map = { character: "busy-character", background: "busy-set", audio: "busy-voice" };
    for (const [key, id] of Object.entries(map)) {
      const el = $(id);
      const b = busy[key];
      el.hidden = !b;
      if (b) {
        const secs = (Date.now() - b.since) / 1000;
        el.querySelector(".busy-text").textContent = secs >= 3 ? `${b.text} ${elapsed(b.since)}` : b.text;
      }
    }
  }

  function renderProgress() {
    const b = busy.video;
    $("progress-video").hidden = !b;
    if (!b) return;
    $("progress-title").textContent = b.text;
    $("progress-time").textContent = elapsed(b.since);
    const order = ["prompt", "queue", "render", "done"];
    const at = order.indexOf(b.stage || "prompt");
    for (const li of $("progress-video").querySelectorAll("li")) {
      const i = order.indexOf(li.dataset.stage);
      li.classList.toggle("is-done", i < at);
      li.classList.toggle("is-active", i === at);
    }
  }

  function renderKeyPill() {
    const pill = $("key-status");
    const name = PROVIDERS[state.provider];
    pill.classList.remove("is-ok", "is-missing", "is-server");
    if (hasCredentials()) {
      pill.textContent = `${name} connected`;
      pill.classList.add("is-ok");
      pill.title = state.provider === "fal" && backend.mode === "server" ? "The fal.ai key is stored on the server." : `Change the provider or the API keys`;
    } else {
      pill.textContent = `Add ${name} key`;
      pill.classList.add("is-missing");
      pill.title = `Add your ${name} API key`;
    }
    for (const b of document.querySelectorAll("#provider-tabs button")) {
      const on = b.dataset.provider === state.provider;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
    }
    $("fal-key-server").hidden = backend.mode !== "server";
    $("input-fal-key").hidden = backend.mode === "server";
    $("fal-key-label").textContent = state.provider === "fal" ? "fal.ai API key" : "fal.ai API key (optional)";
    $("fal-key-hint").hidden = state.provider === "fal";
  }

  function setIngredient(id, { thumb, text, stateClass }) {
    const li = $(id);
    const img = li.querySelector("img");
    if (img) setImg(img, thumb || null);
    li.querySelector("small").textContent = text;
    li.querySelector(".ing-state").className = `ing-state ${stateClass}`;
  }

  function renderStep(step, cls, text) {
    const li = document.querySelector(`.stepper li[data-step="${step}"]`);
    li.classList.remove("is-done", "is-busy", "is-next");
    if (cls) li.classList.add(cls);
    li.querySelector("small").textContent = text;
  }

  function render() {
    renderKeyPill();
    for (const el of document.querySelectorAll(".cost")) el.textContent = `Uses ${PROVIDERS[state.provider]} credits`;
    $("asset-row").hidden = state.provider !== "kie";

    // ---- Step 1: architect ----
    renderTabs("characterMode", { upload: "panel-char-upload", create: "panel-char-create" });
    const createChar = state.characterMode === "create";
    updateChips("chips-look", state.look, Boolean(busy.character));
    updateChips("chips-speaker", state.speaker, Boolean(busy.video));
    setImg($("img-selfie"), state.selfieUrl);
    $("selfie-empty").hidden = Boolean(state.selfieUrl);
    $("selfie-slot").classList.toggle("has-image", Boolean(state.selfieUrl));
    setImg($("img-character"), state.characterUrl);
    $("drop-character").hidden = Boolean(state.characterUrl) || createChar;
    $("ph-character").hidden = Boolean(state.characterUrl) || !createChar;
    const btnChar = $("btn-character");
    btnChar.disabled = Boolean(busy.character) || !state.selfieUrl;
    btnChar.textContent = state.characterSource === "generated" && state.characterUrl ? "Create again" : "Create character sheet";
    $("btn-own-character").disabled = Boolean(busy.character);
    $("btn-own-character").textContent = state.characterUrl && state.characterSource === "uploaded" ? "Replace character sheet" : "Choose character sheet";
    renderPromptBox("character");

    // ---- Step 2: studio set ----
    renderTabs("setMode", { upload: "panel-set-upload", create: "panel-set-create" });
    const createSet = state.setMode === "create";
    const setBusyNow = Boolean(busy.background);
    updateChips("chips-style", state.setStyle, setBusyNow);
    updateChips("chips-chair", state.chair, setBusyNow);
    updateChips("chips-light", state.light, setBusyNow);
    updateChips("chips-framing", state.framing, setBusyNow);
    updateChips("chips-format", state.format, setBusyNow);
    $("opt-reference").checked = state.useReference;
    $("reference-row").hidden = Boolean(FRAMINGS[state.framing].noRoomRef);
    $("opt-reference").disabled = setBusyNow;
    setImg($("img-set"), state.backgroundUrl);
    $("drop-set").hidden = Boolean(state.backgroundUrl) || createSet;
    $("ph-set").hidden = Boolean(state.backgroundUrl) || !createSet;
    const closeFraming = Boolean(FRAMINGS[state.framing].noRoomRef);
    $("ph-set").classList.toggle("placeholder-ref", !closeFraming);
    $("ph-set").querySelector("img").hidden = closeFraming;
    $("ph-set").querySelector("p").innerHTML = closeFraming
      ? "<b>Talking-head framing</b>Your set appears here after you press Create."
      : "<b>Framing reference</b>Your set appears here after you press Create.";
    const setAspect = state.backgroundUrl ? state.backgroundAspect : createSet ? FORMATS[state.format].aspect : "9:16";
    $("media-set").classList.toggle("media-tall", isPortrait(setAspect));
    $("media-set").classList.toggle("media-wide", !isPortrait(setAspect));
    const btnSet = $("btn-set");
    btnSet.disabled = setBusyNow;
    btnSet.textContent = state.backgroundSource === "generated" && state.backgroundUrl ? "Create again" : "Create studio set";
    $("btn-own-set").disabled = setBusyNow;
    $("btn-own-set").textContent = state.backgroundUrl && state.backgroundSource === "uploaded" ? "Replace set image" : "Choose set image";
    renderPromptBox("set");

    // ---- Step 3: voice ----
    const a = state.audio;
    $("drop-voice").hidden = Boolean(a);
    $("voice-panel").hidden = !a;
    $("btn-choose-voice").disabled = Boolean(busy.audio);
    $("btn-choose-voice").textContent = a ? "Replace recording" : "Choose MP4";
    if (a) {
      $("voice-name").textContent = a.name;
      const secs = audioSeconds();
      const lang = transcriptReady() ? LANGUAGES[state.transcript.language] : null;
      $("voice-meta").textContent = [secs ? fmtSec(secs) : null, lang, "voice track ready"].filter(Boolean).join(" · ");
      const audioEl = $("voice-audio");
      if (audioEl.getAttribute("src") !== a.url) audioEl.src = a.url;
      let line = "";
      if (pending.transcript) line = "Listening to the recording to place the camera cuts…";
      else if (transcriptReady() && state.transcript.text) {
        const t = state.transcript.text;
        line = `“${t.length > 180 ? `${t.slice(0, 180).replace(/\s+\S*$/, "")}…` : t}”`;
      } else if (state.transcript?.failed) line = "The recording could not be transcribed. Cuts are spaced evenly instead.";
      $("voice-transcript").textContent = line;
      $("voice-transcript").hidden = !line;
    }

    renderBusy();

    // ---- Step 4: episode ----
    updateChips("chips-quality", state.quality, Boolean(busy.video));
    const ch = characterDetails();
    const sc = sceneDetails();
    const D = clipDuration();
    const cuts = currentCuts();

    setIngredient("ing-character", assetRef() && !state.characterUrl
      ? { thumb: null, text: `Verified portrait ${assetRef()}`, stateClass: "is-done" }
      : !state.characterUrl
      ? { thumb: null, text: "Waiting for the character sheet", stateClass: busy.character ? "is-busy" : "is-wait" }
      : pending.character
        ? { thumb: state.characterUrl, text: "Reading the face and outfit…", stateClass: "is-busy" }
        : ch.source === "analysis"
          ? { thumb: state.characterUrl, text: ch.outfit ? `Outfit read from the sheet: ${ch.outfit}` : "Face and outfit read from the sheet", stateClass: "is-done" }
          : ch.source === "preset"
            ? { thumb: state.characterUrl, text: `Outfit from the ${LOOKS[state.characterLook].label} look`, stateClass: "is-done" }
            : { thumb: state.characterUrl, text: "Described in general terms. The sheet could not be read.", stateClass: "is-warn" });

    setIngredient("ing-set", !state.backgroundUrl
      ? { thumb: null, text: "Waiting for the studio set", stateClass: busy.background ? "is-busy" : "is-wait" }
      : pending.scene
        ? { thumb: state.backgroundUrl, text: "Reading the seat, props and light…", stateClass: "is-busy" }
        : sc.source === "analysis"
          ? { thumb: state.backgroundUrl, text: sc.seat ? `Seat found: ${stripArticle(sc.seat)}` : "Set read, no chair found", stateClass: "is-done" }
          : sc.source === "preset"
            ? { thumb: state.backgroundUrl, text: "Described from your set choices", stateClass: "is-done" }
            : { thumb: state.backgroundUrl, text: "Described in general terms. The set could not be read.", stateClass: "is-warn" });

    const cutText = cuts.points.slice(1, -1).map((p) => `${p}s`).join(" and ");
    setIngredient("ing-voice", !a
      ? { text: "Waiting for the recording", stateClass: busy.audio ? "is-busy" : "is-wait" }
      : pending.transcript
        ? { text: "Listening for natural pauses…", stateClass: "is-busy" }
        : { text: `${D || "?"}s clip, cuts at ${cutText}${cuts.snapped ? ", on natural pauses" : ""}`, stateClass: "is-done" });

    $("fact-length").textContent = D ? `${D} seconds` : "Follows the recording";
    $("fact-format").textContent = ASPECTS[state.backgroundAspect || FORMATS[state.format].aspect];

    const missing = [!characterInput() && "character sheet", !state.backgroundUrl && "studio set", !a && "voice recording"].filter(Boolean);
    const otherBusy = busy.character || busy.background || busy.audio;
    const ready = missing.length === 0;
    $("btn-episode").disabled = !ready || Boolean(busy.video) || Boolean(otherBusy);
    $("btn-episode").textContent = state.result ? "Create a new clip" : "Create episode clip";
    $("hint-episode").textContent = busy.video
      ? "Your clip is being created below."
      : !ready
        ? `Still needed: ${missing.join(", ")}.`
        : otherBusy
          ? "Waiting for the current step to finish."
          : `Uses ${PROVIDERS[state.provider]} credits. The prompt and camera cuts are already prepared.`;

    renderPromptBox("video");
    const anyFailed =
      (state.characterUrl && state.characterInfo?.for === state.characterUrl && state.characterInfo.failed) ||
      (state.backgroundUrl && state.sceneInfo?.for === state.backgroundUrl && state.sceneInfo.failed) ||
      (a && state.transcript?.for === a.url && state.transcript.failed);
    $("btn-reread").hidden = !anyFailed;

    renderProgress();

    // ---- Result ----
    const r = state.result;
    $("step-result").hidden = !r;
    if (r) {
      const v = $("video-result");
      if (v.getAttribute("src") !== r.url) v.src = r.url;
      $("link-open").href = r.url;
      $("result-meta").textContent = [r.duration ? `${r.duration} seconds` : null, ASPECTS[r.aspect] || r.aspect, r.resolution].filter(Boolean).join(" · ");
      $("btn-retake").disabled = Boolean(busy.video) || !ready;
    }

    // ---- Stepper ----
    renderStep("character",
      busy.character ? "is-busy" : characterInput() ? "is-done" : "is-next",
      busy.character ? "Working…" : characterInput() ? "Ready" : state.selfieUrl && createChar ? "Selfie added" : "Upload or create");
    renderStep("set",
      busy.background ? "is-busy" : state.backgroundUrl ? "is-done" : state.characterUrl ? "is-next" : "",
      busy.background ? "Working…" : state.backgroundUrl ? "Ready" : "Upload or create");
    renderStep("voice",
      busy.audio ? "is-busy" : a ? "is-done" : state.characterUrl && state.backgroundUrl ? "is-next" : "",
      busy.audio ? "Preparing…" : a ? fmtSec(audioSeconds()) : "Add an MP4");
    renderStep("episode",
      busy.video ? "is-busy" : r ? "is-done" : ready ? "is-next" : "",
      busy.video ? "Generating…" : r ? "Clip ready" : ready ? "Ready to create" : "Waiting");
  }

  // ===========================================================================
  // Key panel
  // ===========================================================================

  function openKeyPanel(message) {
    $("key-panel").hidden = false;
    $("input-kie-key").value = getKieKey();
    $("input-fal-key").value = getKey();
    setStatus("status-key", message || "");
    renderKeyPill();
    (state.provider === "kie" ? $("input-kie-key") : backend.mode === "server" ? $("btn-save-key") : $("input-fal-key")).focus();
  }

  function closeKeyPanel() {
    $("key-panel").hidden = true;
    setStatus("status-key", "");
  }

  // ===========================================================================
  // Events
  // ===========================================================================

  function bindDrop(zone, input, handler, { target = zone, enabled = () => true } = {}) {
    zone.addEventListener("click", () => input.click());
    zone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        input.click();
      }
    });
    target.addEventListener("dragover", (e) => {
      if (!enabled()) return;
      e.preventDefault();
      target.classList.add("is-over");
    });
    target.addEventListener("dragleave", (e) => {
      if (!target.contains(e.relatedTarget)) target.classList.remove("is-over");
    });
    target.addEventListener("drop", (e) => {
      target.classList.remove("is-over");
      if (!enabled()) return;
      e.preventDefault();
      const f = e.dataTransfer?.files?.[0];
      if (f) handler(f);
    });
  }

  function bindFileInput(input, handler) {
    input.addEventListener("change", () => {
      const f = input.files?.[0];
      input.value = "";
      if (f) handler(f);
    });
  }

  function bindPromptBox(name) {
    const cfg = PROMPT_BOXES[name];
    $(cfg.edit).addEventListener("click", () => {
      state[cfg.custom] = cfg.compose();
      save();
      render();
      $(cfg.ta).focus();
    });
    $(cfg.auto).addEventListener("click", () => {
      state[cfg.custom] = null;
      save();
      render();
    });
    $(cfg.ta).addEventListener("input", (e) => {
      if (state[cfg.custom] == null) return;
      state[cfg.custom] = e.target.value;
      save();
    });
  }

  function bindEvents() {
    buildChips("chips-speaker", SPEAKERS, "speaker");
    buildChips("chips-look", LOOKS, "look");
    buildChips("chips-style", SET_STYLES, "setStyle");
    buildChips("chips-chair", CHAIRS, "chair");
    buildChips("chips-light", LIGHTS, "light");
    buildChips("chips-framing", FRAMINGS, "framing");
    buildChips("chips-format", FORMATS, "format");
    buildChips("chips-quality", QUALITIES, "quality");

    for (const tab of document.querySelectorAll(".segmented button")) {
      tab.addEventListener("click", () => {
        state[tab.dataset.group] = tab.dataset.mode;
        save();
        render();
      });
      tab.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        const sibling = [...tab.parentElement.children].find((b) => b !== tab);
        sibling.focus();
        sibling.click();
      });
    }

    // Step 1
    bindFileInput($("file-selfie"), onSelfie);
    bindFileInput($("file-character"), onOwnCharacter);
    bindDrop($("selfie-slot"), $("file-selfie"), onSelfie);
    bindDrop($("drop-character"), $("file-character"), onOwnCharacter, {
      target: $("media-character"),
      enabled: () => state.characterMode === "upload",
    });
    $("btn-own-character").addEventListener("click", () => $("file-character").click());
    $("btn-character").addEventListener("click", generateCharacter);
    $("input-char-notes").value = state.characterNotes || "";
    $("input-char-notes").addEventListener("input", (e) => {
      state.characterNotes = e.target.value;
      save();
      renderPromptBox("character");
    });

    // Step 2
    bindFileInput($("file-set"), onOwnBackground);
    bindDrop($("drop-set"), $("file-set"), onOwnBackground, {
      target: $("media-set"),
      enabled: () => state.setMode === "upload",
    });
    $("btn-own-set").addEventListener("click", () => $("file-set").click());
    $("btn-set").addEventListener("click", generateBackground);
    $("opt-reference").addEventListener("change", (e) => {
      state.useReference = e.target.checked;
      save();
      render();
    });
    $("input-set-notes").value = state.setNotes || "";
    $("input-set-notes").addEventListener("input", (e) => {
      state.setNotes = e.target.value;
      save();
      renderPromptBox("set");
    });

    // Step 3
    bindFileInput($("file-voice"), onAudio);
    bindDrop($("drop-voice"), $("file-voice"), onAudio, { target: $("media-voice") });
    $("btn-choose-voice").addEventListener("click", () => $("file-voice").click());

    // Step 4
    $("btn-episode").addEventListener("click", createEpisode);
    $("btn-retake").addEventListener("click", () => {
      createEpisode();
      $("step-episode").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    $("btn-download").addEventListener("click", downloadResult);
    for (const name of Object.keys(PROMPT_BOXES)) bindPromptBox(name);
    $("btn-reread").addEventListener("click", () => {
      if (!ensureKey(() => refreshAnalyses(true))) return;
      refreshAnalyses(true);
    });
    $("btn-copy").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText($("prompt-video").value);
        $("btn-copy").textContent = "Copied";
      } catch {
        $("prompt-video").select();
        $("btn-copy").textContent = "Press Ctrl+C";
      }
      setTimeout(() => { $("btn-copy").textContent = "Copy"; }, 1600);
    });

    // Stop the browser from opening files dropped outside the drop areas.
    window.addEventListener("dragover", (e) => e.preventDefault());
    window.addEventListener("drop", (e) => e.preventDefault());

    $("btn-reset").addEventListener("click", () => {
      const msg = busy.video
        ? "A clip is still being created. Start over anyway?"
        : "Clear the character, set, recording and clip, and start over? Your fal.ai key is kept.";
      if (!confirm(msg)) return;
      try { localStorage.removeItem(STATE_KEY); } catch { /* ignore */ }
      location.reload();
    });

    // Key panel
    $("key-status").addEventListener("click", () => {
      if ($("key-panel").hidden) openKeyPanel();
      else closeKeyPanel();
    });
    $("btn-close-key").addEventListener("click", closeKeyPanel);
    for (const b of document.querySelectorAll("#provider-tabs button")) {
      b.addEventListener("click", () => {
        if (busy.video) return setStatus("status-key", "Wait for the current clip to finish before switching provider.", "error");
        state.provider = b.dataset.provider;
        save();
        setStatus("status-key", "");
        render();
      });
    }
    $("btn-save-key").addEventListener("click", () => {
      writeKey(KIE_KEY_STORAGE, $("input-kie-key").value.trim());
      if (backend.mode !== "server") writeKey(KEY_STORAGE, $("input-fal-key").value.trim());
      if (!hasCredentials()) {
        render();
        return setStatus("status-key", `Paste your ${PROVIDERS[state.provider]} key first.`, "error");
      }
      setStatus("status-key", "Saved in this browser.", "ok");
      render();
      setTimeout(closeKeyPanel, 700);
      const action = pendingKeyAction;
      pendingKeyAction = null;
      if (action) action();
      refreshAnalyses();
    });
    for (const id of ["input-kie-key", "input-fal-key"]) {
      $(id).addEventListener("keydown", (e) => {
        if (e.key === "Enter") $("btn-save-key").click();
        if (e.key === "Escape") closeKeyPanel();
      });
    }
    $("btn-forget-key").addEventListener("click", () => {
      writeKey(KIE_KEY_STORAGE, "");
      writeKey(KEY_STORAGE, "");
      $("input-kie-key").value = "";
      $("input-fal-key").value = "";
      setStatus("status-key", "Keys removed from this browser.", "ok");
      render();
    });
    $("input-asset").value = state.assetId || "";
    $("input-asset").addEventListener("input", (e) => {
      state.assetId = e.target.value.trim();
      save();
      render();
    });

    window.addEventListener("beforeunload", (e) => {
      if (busy.character || busy.background || busy.audio) {
        e.preventDefault();
        e.returnValue = "";
      }
    });

    setInterval(() => {
      if (anyBusy()) {
        renderBusy();
        renderProgress();
      }
    }, 1000);
  }

  // ===========================================================================
  // Boot
  // ===========================================================================

  async function detectBackend() {
    try {
      const res = await fetch("/api/health", { headers: { Accept: "application/json" } });
      const h = res.ok ? await res.json() : null;
      if (h?.ok && h.hasKey) {
        backend.mode = "server";
        backend.models = { ...DEFAULT_MODELS, ...(h.models || {}) };
      }
    } catch { /* static hosting: no server */ }
  }

  bindEvents();
  render();
  if (audioMigrated) {
    save();
    setStatus("status-voice", "Please add the recording again. It is now prepared as a clean voice track for the video model.");
  }
  detectBackend().then(() => {
    render();
    if (!hasCredentials()) openKeyPanel();
    if (state.videoJob) followVideo();
    refreshAnalyses();
  });
})();
