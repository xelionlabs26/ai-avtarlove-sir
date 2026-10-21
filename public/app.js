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
  };

  // Vision models that read the character sheet and the set, tried in order.
  const VISION_MODELS = ["google/gemini-2.5-flash", "openai/gpt-4o-mini"];

  // Outfit presets for the character sheet.
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
    photo: {
      label: "As in photo",
      hint: "Keep my clothes",
      outfit: null,
    },
  };

  // Podcast set presets. `read` is used for the video prompt if the image analysis is unavailable.
  const SETS = {
    studio: {
      label: "Design studio",
      hint: "Books, models, drafting table",
      scene:
        "an architect's design studio arranged as a podcast set. Floor-to-ceiling teak bookshelves with architecture monographs and small white massing models, " +
        "a large drafting table with rolled drawings and a brass task lamp in the background, warm lime-plaster walls, a polished Kota stone floor with a handwoven cotton dhurrie. " +
        "In the centre, an empty Chandigarh-style teak-and-cane lounge armchair, angled slightly toward the camera. " +
        "A black podcast microphone on a boom-arm stand beside the chair, pointing at the seat. " +
        "Soft late-afternoon daylight from tall windows, casting patterned jaali shadows on the wall.",
      read: {
        setting: "an architect's design studio with teak bookshelves, white massing models and a drafting table on a Kota stone floor",
        seat: "teak-and-cane lounge armchair in the centre",
        microphone: true,
        lighting: "soft late-afternoon daylight with patterned jaali shadows",
      },
    },
    courtyard: {
      label: "Courtyard",
      hint: "Brick jaali, plants",
      scene:
        "a shaded verandah opening onto the courtyard of a contemporary Indian home, arranged as a podcast set. " +
        "An exposed-brick jaali screen wall casting dappled light, terracotta planters with lush tropical plants, a polished red-oxide floor and slender concrete columns. " +
        "In the centre, an empty low teak-and-cane armchair, angled slightly toward the camera, with a small side table holding a clay cup and a sketchbook. " +
        "A black podcast microphone on a boom-arm stand beside the chair, pointing at the seat. Soft, diffused morning daylight.",
      read: {
        setting: "a shaded courtyard verandah with an exposed-brick jaali wall, terracotta planters and a red-oxide floor",
        seat: "low teak-and-cane armchair in the centre",
        microphone: true,
        lighting: "soft diffused morning daylight through the brick jaali",
      },
    },
    concrete: {
      label: "Concrete & light",
      hint: "Brutalist, skylight",
      scene:
        "a modernist exposed-concrete interior inspired by Indian brutalist architecture, arranged as a podcast set. " +
        "Board-formed concrete walls, a deep circular opening and a skylight sending a soft shaft of light, a low plinth with a white architectural model, a warm wooden floor. " +
        "In the centre, an empty cognac leather lounge armchair, angled slightly toward the camera. " +
        "A black podcast microphone on a boom-arm stand beside the chair, pointing at the seat. Calm, warm, cinematic light.",
      read: {
        setting: "a brutalist exposed-concrete interior with a circular opening, a skylight and a white architectural model on a plinth",
        seat: "cognac leather lounge armchair in the centre",
        microphone: true,
        lighting: "a soft shaft of warm skylight against cool concrete",
      },
    },
  };

  const FORMATS = {
    vertical: { label: "Vertical 9:16", hint: "Reels, Shorts", aspect: "9:16" },
    landscape: { label: "Landscape 16:9", hint: "YouTube, LinkedIn", aspect: "16:9" },
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
  const STATE_KEY = "architect-podcast-studio:v2";
  const KEY_STORAGE = "ai-avatar-studio:fal-key";
  const FAL_REST = "https://rest.fal.ai";
  const FAL_QUEUE = "https://queue.fal.run";
  const MAX_UPLOAD_BYTES = 90 * 1024 * 1024;

  // ===========================================================================
  // State
  // ===========================================================================

  const DEFAULTS = {
    look: "indowestern",
    setStyle: "studio",
    format: "vertical",
    quality: "720p",
    selfieUrl: null,
    characterUrl: null,
    characterSource: null, // "generated" | "uploaded"
    characterLook: null,
    characterInfo: null, // { for, face, outfit, layout } or { for, failed }
    backgroundUrl: null,
    backgroundSource: null,
    backgroundStyle: null,
    backgroundAspect: null,
    sceneInfo: null, // { for, setting, seat, microphone, lighting } or { for, failed }
    audio: null, // { url, name, duration }
    transcript: null, // { for, text, chunks, language } or { for, failed }
    customPrompt: null,
    videoJob: null,
    result: null,
  };

  const state = Object.assign({}, DEFAULTS, loadState());
  if (!LOOKS[state.look]) state.look = DEFAULTS.look;
  if (!SETS[state.setStyle]) state.setStyle = DEFAULTS.setStyle;
  if (!FORMATS[state.format]) state.format = DEFAULTS.format;
  if (!QUALITIES[state.quality]) state.quality = DEFAULTS.quality;

  const busy = { character: null, background: null, audio: null, video: null }; // { text, since, stage }
  const pending = { character: null, scene: null, transcript: null };
  const backend = { mode: "direct", models: DEFAULT_MODELS };
  let selfiePreview = null; // object URL of the selfie being processed
  let pendingKeyAction = null;

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

  function clean(text, max = 260) {
    if (typeof text !== "string") return null;
    let t = text.replace(/\s+/g, " ").trim().replace(/^["'“”]+|["'“”]+$/g, "").replace(/[.;,\s]+$/, "");
    if (!t || /^(null|none|n\/a|unknown|not visible)$/i.test(t)) return null;
    if (t.length > max) t = t.slice(0, max).replace(/[,;\s]+[^,;\s]*$/, "");
    return t;
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
      const e = new Error("Could not reach the server. Is it still running?");
      e.network = true;
      throw e;
    }
    let body = null;
    try { body = await res.json(); } catch { /* not JSON */ }
    if (!res.ok) {
      const e = new Error(body?.error || `Server error ${res.status}`);
      e.status = res.status;
      throw e;
    }
    return body;
  }

  function getKey() {
    try { return (localStorage.getItem(KEY_STORAGE) || "").trim(); } catch { return ""; }
  }
  const hasCredentials = () => backend.mode === "server" || Boolean(getKey());

  function falError(body) {
    const d = body?.detail;
    if (Array.isArray(d)) return d.map((x) => [(x.loc || []).filter((p) => p !== "body").join("."), x.msg].filter(Boolean).join(": ")).join("; ");
    if (d) return typeof d === "string" ? d : JSON.stringify(d);
    return body?.message || body?.error || null;
  }

  async function falFetch(url, opts = {}) {
    const key = getKey();
    if (!key) {
      const e = new Error("Add your fal.ai API key to continue.");
      e.missingKey = true;
      throw e;
    }
    let res;
    try {
      res = await fetch(url, {
        ...opts,
        headers: { Authorization: `Key ${key}`, Accept: "application/json", ...(opts.headers || {}) },
      });
    } catch {
      const e = new Error("Could not reach fal.ai. Check your internet connection and try again.");
      e.network = true;
      throw e;
    }
    const text = await res.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
    if (!res.ok) {
      const detail = falError(body);
      let msg = detail || `fal.ai error ${res.status}`;
      if (res.status === 401) msg = "fal.ai did not accept the API key. Click the key button at the top right to check it.";
      else if (res.status === 403) msg = `fal.ai refused the request${detail ? `: ${detail}` : ". Check the API key and your fal.ai balance."}`;
      const e = new Error(msg);
      e.status = res.status;
      throw e;
    }
    return body;
  }

  async function uploadFile(file) {
    if (backend.mode === "server") {
      const fd = new FormData();
      fd.append("file", file, file.name || "upload");
      return api("/api/upload", { method: "POST", body: fd });
    }
    if (file.size > MAX_UPLOAD_BYTES) throw new Error("This file is too large. The limit is 90 MB.");
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
    return {
      mode: "direct",
      kind,
      requestId: r.request_id,
      statusUrl: r.status_url || `${base}/status`,
      responseUrl: r.response_url || base,
    };
  }

  async function jobStatus(job) {
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

  function characterPrompt(lookId) {
    const look = LOOKS[lookId] || LOOKS.indowestern;
    const outfit = look.outfit
      ? `the full outfit as a ghost mannequin, front view, head to toe: ${look.outfit}`
      : "the full outfit as a ghost mannequin, front view, head to toe: the same clothes the person wears in the photo, completed naturally into a smart full outfit with matching trousers and footwear";
    return [
      "Use the uploaded photo for the face. Create one wide 16:9 character sheet on a plain white background.",
      "LEFT side: close-up studio portrait of this exact person, with the same face, hair, facial hair, glasses (if any) and skin tone. Do not change age, face shape or features. Calm, confident and approachable expression.",
      `RIGHT side: ${outfit}.`,
      "Photorealistic, soft even studio light, no text, no logos.",
    ].join(" ");
  }

  function backgroundPrompt(setId, formatId) {
    const set = SETS[setId] || SETS.studio;
    const fmt = FORMATS[formatId] || FORMATS.vertical;
    const frame = fmt.aspect === "9:16" ? "Vertical 9:16" : "Wide 16:9";
    return `${frame} photo of ${set.scene} No people. Photorealistic, natural colours, eye-level camera, gentle depth of field, no text, no logos.`;
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
    const set = state.backgroundSource === "generated" ? SETS[state.backgroundStyle] : null;
    if (set) return { ...set.read, source: "preset" };
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

  function composeVideoPrompt() {
    const ch = characterDetails();
    const sc = sceneDetails();
    const { points } = currentCuts();
    const lang = transcriptReady() ? LANGUAGES[state.transcript.language] : null;

    const p1 =
      ch.layout === "photo"
        ? `@Image1 defines the architect: face, hair, skin tone and full outfit.${ch.face ? ` Face: ${ch.face}.` : ""}${ch.outfit ? ` Outfit: ${ch.outfit}.` : ""} Only this one person. Do not use the background of @Image1.`
        : `@Image1 defines the architect's face, hair, facial hair, skin tone and full outfit.${ch.face ? ` Face: ${ch.face}.` : ""} Take the face from the left side of @Image1 and the outfit from the right side${ch.outfit ? `: ${ch.outfit}` : ""}. Only this one person. Do not use the white background of @Image1.`;

    const p2 = `@Image2 defines the set${sc.setting ? `: ${sc.setting}` : ""}. Keep the layout, furniture, props and lighting exactly as in @Image2.`;

    const p3 =
      `@Video1 defines only the audio. Use it exactly as provided as the only audio track. ` +
      `The architect lip-syncs precisely to @Video1${lang ? `, speaking ${lang}` : ""}. ` +
      `Do not use any visuals from @Video1. No new dialogue, voice-over, music or sound effects.`;

    const seat = sc.seat ? `sits relaxed in the ${stripArticle(sc.seat)}` : "sits relaxed at the centre of the set";
    const p4 =
      `The architect ${seat} and talks to camera in the calm, articulate and confident manner of a renowned architect on a podcast` +
      `${sc.microphone ? ", microphone near the mouth" : ""}. ` +
      `Measured, natural hand gestures that sketch forms and spaces in the air, natural blinking, steady eye contact. ` +
      `${cap(sc.lighting || "soft natural light")}, real skin and fabric texture, photorealistic documentary look.`;

    let shots;
    if (points.length === 3) {
      const [, a, D] = points;
      shots = [
        `[0-${a}s] Medium-wide shot${sc.seat ? ", seated" : ""}, the set softly behind.`,
        `[${a}-${D}s] Hard cut to face close-up, ending on a small, assured smile.`,
      ];
    } else {
      const [, a, b, D] = points;
      shots = [
        `[0-${a}s] Wide shot, full body${sc.seat ? " seated" : ""}, the whole set in frame.`,
        `[${a}-${b}s] Hard cut to medium close-up${sc.microphone ? ", microphone in the foreground" : ""}, hands gesturing as the architect explains an idea.`,
        `[${b}-${D}s] Hard cut to face close-up, ending on a small, assured smile.`,
      ];
    }

    const p6 = "Face, outfit and set stay identical in all cuts. No subtitles, no captions, no on-screen text, no logos.";
    return [p1, p2, p3, p4, shots.join("\n"), p6].join("\n\n");
  }

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

  function analyseCharacter() {
    const url = state.characterUrl;
    if (!url || !hasCredentials()) return null;
    let p = null;
    p = (async () => {
      try {
        const j = await runVision(CHARACTER_VISION_PROMPT, url);
        if (state.characterUrl !== url) return;
        state.characterInfo = {
          for: url,
          layout: String(j.layout || "").toLowerCase() === "photo" ? "photo" : "sheet",
          face: clean(j.face, 180),
          outfit: clean(j.outfit, 320),
        };
        if (!state.characterInfo.face && !state.characterInfo.outfit) state.characterInfo = { for: url, failed: true };
      } catch (err) {
        console.warn("Character analysis failed:", err);
        if (state.characterUrl === url) state.characterInfo = { for: url, failed: true };
      } finally {
        if (pending.character === p) pending.character = null;
        save();
        render();
      }
    })();
    pending.character = p;
    render();
    return p;
  }

  function analyseScene() {
    const url = state.backgroundUrl;
    if (!url || !hasCredentials()) return null;
    let p = null;
    p = (async () => {
      try {
        const j = await runVision(SCENE_VISION_PROMPT, url);
        if (state.backgroundUrl !== url) return;
        state.sceneInfo = {
          for: url,
          setting: clean(j.setting, 220),
          seat: clean(j.seat, 120),
          microphone: j.microphone === true || /^(true|yes)$/i.test(String(j.microphone)),
          lighting: clean(j.lighting, 110),
        };
        if (!state.sceneInfo.setting && !state.sceneInfo.seat) state.sceneInfo = { for: url, failed: true };
      } catch (err) {
        console.warn("Set analysis failed:", err);
        if (state.backgroundUrl === url) state.sceneInfo = { for: url, failed: true };
      } finally {
        if (pending.scene === p) pending.scene = null;
        save();
        render();
      }
    })();
    pending.scene = p;
    render();
    return p;
  }

  function transcribeAudio() {
    const url = state.audio?.url;
    if (!url || !hasCredentials()) return null;
    let p = null;
    p = (async () => {
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
      } finally {
        if (pending.transcript === p) pending.transcript = null;
        save();
        render();
      }
    })();
    pending.transcript = p;
    render();
    return p;
  }

  /** Re-reads any input that has not been read yet (after a reload or once a key is added). */
  function refreshAnalyses(force = false) {
    if (!hasCredentials()) return;
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

  function elementDuration(file, tag) {
    return new Promise((resolve) => {
      const el = document.createElement(tag);
      const url = URL.createObjectURL(file);
      let settled = false;
      const done = (d) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        el.removeAttribute("src");
        resolve(Number.isFinite(d) && d > 0 ? d : null);
      };
      const timer = setTimeout(() => done(null), 8000);
      el.preload = "metadata";
      el.muted = true;
      el.onloadedmetadata = () => {
        if (el.duration === Infinity) {
          el.ontimeupdate = () => done(el.duration);
          el.currentTime = 1e7;
        } else {
          done(el.duration);
        }
      };
      el.onerror = () => done(null);
      el.src = url;
    });
  }

  async function probeDuration(file) {
    try {
      const d = await mp4Duration(file);
      if (d) return d;
    } catch { /* fall through */ }
    return (await elementDuration(file, "video")) || (await elementDuration(file, "audio"));
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

  // ===========================================================================
  // Actions
  // ===========================================================================

  function ensureKey(action) {
    if (hasCredentials()) return true;
    pendingKeyAction = action;
    openKeyPanel("Add your fal.ai key to continue. The step you started will carry on right after.");
    return false;
  }

  async function onSelfie(file) {
    if (!file.type.startsWith("image/")) return setStatus("status-character", "Please choose an image file (JPG, PNG or WebP).", "error");
    if (busy.character) return setStatus("status-character", "Please wait for the current step to finish.", "error");
    if (!ensureKey(() => onSelfie(file))) return;
    if (selfiePreview) URL.revokeObjectURL(selfiePreview);
    selfiePreview = URL.createObjectURL(file);
    Object.assign(state, { characterUrl: null, characterInfo: null, characterSource: null });
    setStatus("status-character", "");
    setBusy("character", "Uploading the selfie…");
    render();
    try {
      const { url } = await uploadFile(file);
      state.selfieUrl = url;
      save();
    } catch (err) {
      setStatus("status-character", err.message, "error");
      setBusy("character", null);
      render();
      return;
    }
    setBusy("character", null);
    generateCharacter();
    if (!state.backgroundUrl && !busy.background) generateBackground();
  }

  async function generateCharacter() {
    if (!state.selfieUrl || busy.character) return;
    if (!ensureKey(generateCharacter)) return;
    const look = state.look;
    setStatus("status-character", "");
    setBusy("character", "Creating the character sheet…");
    render();
    try {
      const r = await runJob(
        "imageEdit",
        { prompt: characterPrompt(look), image_urls: [state.selfieUrl], aspect_ratio: "16:9", resolution: "2K", output_format: "png", num_images: 1 },
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
    const style = state.setStyle;
    const format = state.format;
    setStatus("status-set", "");
    setBusy("background", "Creating the studio set…");
    render();
    try {
      const r = await runJob(
        "image",
        { prompt: backgroundPrompt(style, format), aspect_ratio: FORMATS[format].aspect, resolution: "2K", output_format: "png", num_images: 1 },
        (s) => { setBusy("background", `Creating the studio set, ${describe(s)}…`); renderBusy(); },
      );
      const url = r?.images?.[0]?.url;
      if (!url) throw new Error("No image came back. Please try again.");
      Object.assign(state, {
        backgroundUrl: url, backgroundSource: "generated", backgroundStyle: style,
        backgroundAspect: FORMATS[format].aspect, sceneInfo: null,
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
    setBusy("background", "Uploading your set…");
    render();
    try {
      const size = await imageSize(file);
      const { url } = await uploadFile(file);
      Object.assign(state, {
        backgroundUrl: url, backgroundSource: "uploaded", backgroundStyle: null,
        backgroundAspect: (size && nearestAspect(size.w, size.h)) || FORMATS[state.format].aspect, sceneInfo: null,
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

  async function onAudio(file) {
    const isMp4 = /\.mp4$/i.test(file.name || "") || file.type === "video/mp4" || file.type === "audio/mp4";
    if (!isMp4) return setStatus("status-voice", "Please use an MP4 file.", "error");
    if (busy.audio) return setStatus("status-voice", "Please wait for the current upload to finish.", "error");
    if (!ensureKey(() => onAudio(file))) return;
    setStatus("status-voice", "");
    setBusy("audio", "Checking the recording…");
    render();
    try {
      const duration = await probeDuration(file);
      if (duration && duration > MAX_AUDIO + 0.2) {
        throw new Error(`This recording is ${fmtSec(duration)} long. Please trim it to ${MAX_AUDIO} seconds or less.`);
      }
      if (duration && duration < MIN_AUDIO) {
        throw new Error(`This recording is only ${fmtSec(duration)} long. Please use at least ${MIN_AUDIO} seconds.`);
      }
      setBusy("audio", "Uploading the recording…");
      renderBusy();
      const { url } = await uploadFile(file);
      state.audio = { url, name: file.name || "recording.mp4", duration: duration || null };
      state.transcript = null;
      save();
      setStatus("status-voice", "Recording added. Camera cuts now follow it.", "ok");
      transcribeAudio();
    } catch (err) {
      setStatus("status-voice", err.message, "error");
    } finally {
      setBusy("audio", null);
      render();
    }
  }

  async function createEpisode() {
    if (!(state.characterUrl && state.backgroundUrl && state.audio?.url) || busy.video) return;
    if (!ensureKey(createEpisode)) return;
    setStatus("status-video", "");
    setBusy("video", "Finishing the prompt…", "prompt");
    render();
    try {
      refreshAnalyses();
      await Promise.allSettled(Object.values(pending).filter(Boolean));
      const D = clipDuration();
      const aspect = state.backgroundAspect || FORMATS[state.format].aspect;
      const prompt = (state.customPrompt ?? composeVideoPrompt()).trim();
      const input = {
        prompt,
        image_urls: [state.characterUrl, state.backgroundUrl],
        video_urls: [state.audio.url],
        aspect_ratio: aspect,
        resolution: state.quality,
        duration: D ? String(D) : "auto",
      };
      setBusy("video", "Sending to the video model…", "queue");
      renderProgress();
      const job = await submitJob("video", input);
      state.videoJob = { ...job, startedAt: Date.now(), meta: { aspect, resolution: state.quality, duration: D } };
      save();
    } catch (err) {
      setStatus("status-video", err.message, "error");
      setBusy("video", null);
      render();
      return;
    }
    followVideo();
  }

  async function followVideo() {
    const job = state.videoJob;
    if (!job) return;
    if (job.mode !== backend.mode) {
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
      setStatus("status-video", err.message, "error");
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

  function buildChips(containerId, options, key, onChange) {
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
        onChange?.(id);
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
    pill.classList.remove("is-ok", "is-missing", "is-server");
    if (backend.mode === "server") {
      pill.textContent = "Server key in use";
      pill.classList.add("is-ok", "is-server");
      pill.title = "The fal.ai key is stored on the server.";
    } else if (getKey()) {
      pill.textContent = "fal.ai connected";
      pill.classList.add("is-ok");
      pill.title = "Change or remove your fal.ai key";
    } else {
      pill.textContent = "Add fal.ai key";
      pill.classList.add("is-missing");
      pill.title = "Add your fal.ai key";
    }
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

    // ---- Step 1: architect ----
    updateChips("chips-look", state.look, Boolean(busy.character));
    const charImg = state.characterUrl || selfiePreview || state.selfieUrl;
    setImg($("img-character"), charImg);
    $("drop-selfie").hidden = Boolean(charImg);
    $("media-character").classList.toggle("is-selfie", !state.characterUrl && Boolean(charImg));
    const btnChar = $("btn-character");
    btnChar.hidden = !state.selfieUrl;
    btnChar.disabled = Boolean(busy.character);
    if (!state.characterUrl || state.characterSource !== "generated") btnChar.textContent = "Create character sheet";
    else btnChar.textContent = state.characterLook !== state.look ? "Apply this look" : "Create again";
    btnChar.classList.toggle("btn-primary", !state.characterUrl || state.characterSource !== "generated" || state.characterLook !== state.look);
    $("btn-change-selfie").hidden = !charImg;
    $("btn-change-selfie").disabled = Boolean(busy.character);
    $("btn-own-character").disabled = Boolean(busy.character);

    // ---- Step 2: studio set ----
    updateChips("chips-set", state.setStyle, Boolean(busy.background));
    updateChips("chips-format", state.format, Boolean(busy.background));
    setImg($("img-set"), state.backgroundUrl);
    $("drop-set").hidden = Boolean(state.backgroundUrl);
    const setAspect = state.backgroundUrl ? state.backgroundAspect : FORMATS[state.format].aspect;
    $("media-set").classList.toggle("media-tall", isPortrait(setAspect));
    $("media-set").classList.toggle("media-wide", !isPortrait(setAspect));
    const btnSet = $("btn-set");
    btnSet.disabled = Boolean(busy.background);
    const setChanged =
      state.backgroundSource === "generated" &&
      (state.backgroundStyle !== state.setStyle || state.backgroundAspect !== FORMATS[state.format].aspect);
    btnSet.textContent = !state.backgroundUrl ? "Create studio set" : setChanged ? "Apply changes" : "Create again";
    btnSet.classList.toggle("btn-primary", !state.backgroundUrl || setChanged || state.backgroundSource !== "generated");
    $("btn-own-set").disabled = Boolean(busy.background);

    // ---- Step 3: voice ----
    const a = state.audio;
    $("drop-voice").hidden = Boolean(a);
    $("voice-panel").hidden = !a;
    $("btn-change-voice").hidden = !a;
    $("btn-change-voice").disabled = Boolean(busy.audio);
    if (a) {
      $("voice-name").textContent = a.name;
      const secs = audioSeconds();
      const lang = transcriptReady() ? LANGUAGES[state.transcript.language] : null;
      $("voice-meta").textContent = [secs ? fmtSec(secs) : null, lang].filter(Boolean).join(" · ") || "Length being checked";
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

    setIngredient("ing-character", !state.characterUrl
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
            ? { thumb: state.backgroundUrl, text: `Described from the ${SETS[state.backgroundStyle].label} style`, stateClass: "is-done" }
            : { thumb: state.backgroundUrl, text: "Described in general terms. The set could not be read.", stateClass: "is-warn" });

    const cutText = cuts.points.slice(1, -1).map((p) => `${p}s`).join(" and ");
    setIngredient("ing-voice", !a
      ? { text: "Waiting for the recording", stateClass: busy.audio ? "is-busy" : "is-wait" }
      : pending.transcript
        ? { text: "Listening for natural pauses…", stateClass: "is-busy" }
        : { text: `${D || "?"}s clip, cuts at ${cutText}${cuts.snapped ? ", on natural pauses" : ""}`, stateClass: "is-done" });

    $("fact-length").textContent = D ? `${D} seconds` : "Follows the recording";
    $("fact-format").textContent = ASPECTS[state.backgroundAspect || FORMATS[state.format].aspect];

    const missing = [!state.characterUrl && "character sheet", !state.backgroundUrl && "studio set", !a && "voice recording"].filter(Boolean);
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
          : "Uses your fal.ai credits. The prompt and camera cuts are already prepared.";

    // Prompt box
    const auto = state.customPrompt == null;
    const ta = $("prompt-video");
    const text = auto ? composeVideoPrompt() : state.customPrompt;
    if (document.activeElement !== ta && ta.value !== text) ta.value = text;
    ta.readOnly = auto;
    $("prompt-mode").textContent = auto ? "Written automatically" : "Customised";
    $("prompt-mode").className = `pill ${auto ? "pill-auto" : "pill-custom"}`;
    $("btn-customise").hidden = !auto;
    $("btn-auto").hidden = auto;
    const anyFailed =
      (state.characterUrl && state.characterInfo?.for === state.characterUrl && state.characterInfo.failed) ||
      (state.backgroundUrl && state.sceneInfo?.for === state.backgroundUrl && state.sceneInfo.failed) ||
      (a && state.transcript?.for === a.url && state.transcript.failed);
    $("btn-reread").hidden = !anyFailed;

    renderProgress();

    // Result
    const r = state.result;
    $("step-result").hidden = !r;
    if (r) {
      const v = $("video-result");
      if (v.getAttribute("src") !== r.url) v.src = r.url;
      $("link-open").href = r.url;
      $("result-meta").textContent = [r.duration ? `${r.duration} seconds` : null, ASPECTS[r.aspect] || r.aspect, r.resolution].filter(Boolean).join(" · ");
      $("btn-retake").disabled = Boolean(busy.video) || !ready;
    }

    // Stepper
    renderStep("character",
      busy.character ? "is-busy" : state.characterUrl ? "is-done" : "is-next",
      busy.character ? "Working…" : state.characterUrl ? "Ready" : state.selfieUrl ? "Selfie added" : "Add a selfie");
    renderStep("set",
      busy.background ? "is-busy" : state.backgroundUrl ? "is-done" : state.characterUrl ? "is-next" : "",
      busy.background ? "Working…" : state.backgroundUrl ? "Ready" : "Create or upload");
    renderStep("voice",
      busy.audio ? "is-busy" : a ? "is-done" : state.characterUrl && state.backgroundUrl ? "is-next" : "",
      busy.audio ? "Uploading…" : a ? fmtSec(audioSeconds()) : "Add an MP4");
    renderStep("episode",
      busy.video ? "is-busy" : r ? "is-done" : ready ? "is-next" : "",
      busy.video ? "Generating…" : r ? "Clip ready" : ready ? "Ready to create" : "Waiting");
  }

  // ===========================================================================
  // Key panel
  // ===========================================================================

  function openKeyPanel(message) {
    if (backend.mode === "server") return;
    $("key-panel").hidden = false;
    $("input-key").value = getKey();
    setStatus("status-key", message || "");
    $("input-key").focus();
  }

  function closeKeyPanel() {
    $("key-panel").hidden = true;
    setStatus("status-key", "");
  }

  // ===========================================================================
  // Events
  // ===========================================================================

  function bindDrop(zoneId, mediaId, inputId, handler) {
    const zone = $(zoneId);
    const media = $(mediaId);
    const input = $(inputId);
    zone.addEventListener("click", () => input.click());
    zone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        input.click();
      }
    });
    media.addEventListener("dragover", (e) => {
      e.preventDefault();
      media.classList.add("is-over");
    });
    media.addEventListener("dragleave", (e) => {
      if (!media.contains(e.relatedTarget)) media.classList.remove("is-over");
    });
    media.addEventListener("drop", (e) => {
      e.preventDefault();
      media.classList.remove("is-over");
      const f = e.dataTransfer?.files?.[0];
      if (f) handler(f);
    });
    input.addEventListener("change", () => {
      const f = input.files?.[0];
      input.value = "";
      if (f) handler(f);
    });
  }

  function bindEvents() {
    buildChips("chips-look", LOOKS, "look");
    buildChips("chips-set", SETS, "setStyle");
    buildChips("chips-format", FORMATS, "format");
    buildChips("chips-quality", QUALITIES, "quality");

    bindDrop("drop-selfie", "media-character", "file-selfie", onSelfie);
    bindDrop("drop-set", "media-set", "file-set", onOwnBackground);
    bindDrop("drop-voice", "media-voice", "file-voice", onAudio);
    $("file-character").addEventListener("change", (e) => {
      const f = e.target.files?.[0];
      e.target.value = "";
      if (f) onOwnCharacter(f);
    });

    // Stop the browser from opening files dropped outside the drop areas.
    window.addEventListener("dragover", (e) => e.preventDefault());
    window.addEventListener("drop", (e) => e.preventDefault());

    $("btn-character").addEventListener("click", generateCharacter);
    $("btn-change-selfie").addEventListener("click", () => $("file-selfie").click());
    $("btn-own-character").addEventListener("click", () => $("file-character").click());
    $("btn-set").addEventListener("click", generateBackground);
    $("btn-own-set").addEventListener("click", () => $("file-set").click());
    $("btn-change-voice").addEventListener("click", () => $("file-voice").click());
    $("btn-episode").addEventListener("click", createEpisode);
    $("btn-retake").addEventListener("click", () => {
      createEpisode();
      $("step-episode").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    $("btn-download").addEventListener("click", downloadResult);

    $("btn-customise").addEventListener("click", () => {
      state.customPrompt = composeVideoPrompt();
      save();
      render();
      $("prompt-video").focus();
    });
    $("btn-auto").addEventListener("click", () => {
      state.customPrompt = null;
      save();
      render();
    });
    $("prompt-video").addEventListener("input", (e) => {
      if (state.customPrompt == null) return;
      state.customPrompt = e.target.value;
      save();
    });
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

    $("btn-reset").addEventListener("click", () => {
      if (busy.video && !confirm("A clip is still being created. Start over anyway?")) return;
      if (!busy.video && !confirm("Clear the character, set, recording and clip, and start over?")) return;
      try { localStorage.removeItem(STATE_KEY); } catch { /* ignore */ }
      location.reload();
    });

    // Key panel
    $("key-status").addEventListener("click", () => {
      if (backend.mode === "server") return;
      if ($("key-panel").hidden) openKeyPanel();
      else closeKeyPanel();
    });
    $("btn-close-key").addEventListener("click", closeKeyPanel);
    $("btn-save-key").addEventListener("click", () => {
      const v = $("input-key").value.trim();
      if (!v) return setStatus("status-key", "Paste your key first.", "error");
      try { localStorage.setItem(KEY_STORAGE, v); } catch { /* ignore */ }
      setStatus("status-key", "Key saved in this browser.", "ok");
      render();
      setTimeout(closeKeyPanel, 700);
      const action = pendingKeyAction;
      pendingKeyAction = null;
      if (action) action();
      refreshAnalyses();
    });
    $("input-key").addEventListener("keydown", (e) => {
      if (e.key === "Enter") $("btn-save-key").click();
      if (e.key === "Escape") closeKeyPanel();
    });
    $("btn-forget-key").addEventListener("click", () => {
      try { localStorage.removeItem(KEY_STORAGE); } catch { /* ignore */ }
      $("input-key").value = "";
      setStatus("status-key", "Key removed from this browser.", "ok");
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
  detectBackend().then(() => {
    render();
    if (backend.mode === "direct" && !getKey()) openKeyPanel();
    if (state.videoJob) followVideo();
    refreshAnalyses();
  });
})();
