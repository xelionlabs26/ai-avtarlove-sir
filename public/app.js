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
    audioConvert: "fal-ai/ffmpeg-api/merge-audios",
    avatarKling: "fal-ai/kling-video/ai-avatar/v2/pro",
    avatarAurora: "fal-ai/creatify/aurora",
    avatarOmni: "fal-ai/bytedance/omnihuman/v1.5",
    avatarFabric: "veed/fabric-1.0",
  };

  // Talking-avatar models: one photo plus the voice in, one lip-synced shot out.
  // They accept photos of real people, which the earlier reference-to-video model refused.
  const VIDEO_MODELS = {
    kling: {
      label: "Best lip-sync", hint: "Recommended", name: "Kling AI Avatar v2 Pro", kind: "avatarKling", prompt: true,
      input: (image, audio, prompt) => ({ image_url: image, audio_url: audio, prompt }),
    },
    aurora: {
      label: "Natural gestures", hint: "Upper-body motion", name: "Creatify Aurora", kind: "avatarAurora", prompt: true,
      input: (image, audio, prompt) => ({ image_url: image, audio_url: audio, prompt, resolution: "720p" }),
    },
    omni: {
      label: "Most expressive", hint: "Body and hands", name: "OmniHuman 1.5", kind: "avatarOmni", prompt: true,
      input: (image, audio, prompt) => ({ image_url: image, audio_url: audio, prompt, resolution: "720p" }),
    },
    fabric: {
      label: "Fastest", hint: "Head and face", name: "VEED Fabric 1.0", kind: "avatarFabric", prompt: false,
      input: (image, audio) => ({ image_url: image, audio_url: audio, resolution: "720p" }),
    },
  };

  // Messages that mean a model refused the input (for example because it shows a real person).
  const REFUSAL = /likeness|real (people|person|human)|privacy|content[_ ]?policy|moderation|partner_validation|sensitive|50510|not allowed|safety|violat/i;

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

  const SET_STYLES = {
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
    cane: { label: "Teak & cane", hint: "Mid-century", text: "teak-and-cane lounge armchair" },
    boucle: { label: "Bouclé", hint: "Cream, rounded", text: "cream bouclé swivel armchair" },
    leather: { label: "Leather", hint: "Cognac lounge", text: "cognac leather lounge armchair" },
  };

  const LIGHTS = {
    warm: { label: "Warm evening", hint: "Lamps, amber glow", text: "warm amber evening light from lamps and soft uplighting, cosy and cinematic", short: "warm amber evening lamplight" },
    day: { label: "Soft daylight", hint: "Bright, calm", text: "soft natural daylight from a large window, bright and calm", short: "soft natural daylight from a window" },
    moody: { label: "Moody", hint: "Low-key", text: "low-key cinematic light from warm practical lamps with deep, soft shadows", short: "low-key cinematic lamplight with soft shadows" },
  };

  const FRAMINGS = {
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

  const ASPECTS = {
    "21:9": "Cinema 21:9",
    "16:9": "Landscape 16:9",
    "4:3": "Landscape 4:3",
    "1:1": "Square 1:1",
    "3:4": "Portrait 3:4",
    "9:16": "Vertical 9:16",
  };

  const MIN_AUDIO = 2;
  const MAX_AUDIO = 30;
  const MIN_CLIP = 4;
  const WAV_RATE = 44100;
  const STATE_KEY = "architect-podcast-studio:v2";
  const KEY_STORAGE = "ai-avatar-studio:fal-key";
  const FAL_REST = "https://rest.fal.ai";
  const FAL_QUEUE = "https://queue.fal.run";
  const MAX_UPLOAD_BYTES = 90 * 1024 * 1024;

  // ===========================================================================
  // State
  // ===========================================================================

  const DEFAULTS = {
    characterMode: "upload", // "upload" | "create"
    look: "indowestern",
    characterNotes: "",
    customCharacterPrompt: null,
    selfieUrl: null,
    characterUrl: null,
    characterSource: null, // "generated" | "uploaded"
    characterLook: null,

    setMode: "upload", // "upload" | "create"
    setStyle: "studio",
    chair: "auto",
    light: "warm",
    framing: "wide",
    format: "vertical",
    useReference: true,
    setNotes: "",
    customSetPrompt: null,
    backgroundUrl: null,
    backgroundSource: null,
    backgroundAspect: null,

    frameUrl: null,
    frameSource: null, // "generated" | "uploaded"
    frameFor: null, // { character, background } the photo was made from
    frameAspect: null,
    customFramePrompt: null,

    audio: null, // { url, name, duration, format }

    videoModel: "kling",
    consent: false,
    customPrompt: null,
    videoJob: null,
    result: null,
  };

  const saved = loadState();
  const state = Object.assign({}, DEFAULTS, saved);
  const enums = [["look", LOOKS], ["setStyle", SET_STYLES], ["chair", CHAIRS], ["light", LIGHTS], ["framing", FRAMINGS], ["format", FORMATS], ["videoModel", VIDEO_MODELS]];
  for (const [k, opts] of enums) if (!opts[state[k]]) state[k] = DEFAULTS[k];
  if (!["upload", "create"].includes(state.characterMode)) state.characterMode = "upload";
  if (!["upload", "create"].includes(state.setMode)) state.setMode = "upload";
  // Earlier versions sent the MP4 itself to the video model, which can fail. Ask for the recording again.
  let audioMigrated = false;
  if (state.audio && !state.audio.format) {
    state.audio = null;
    audioMigrated = true;
  }
  // Prompts written for the old video model use @Image/@Audio tags that the avatar models do not understand.
  if (typeof state.customPrompt === "string" && /@(Image|Audio|Video)\d/.test(state.customPrompt)) state.customPrompt = null;
  if (saved.characterSource === "generated" && !("characterMode" in saved)) state.characterMode = "create";
  if (saved.backgroundSource === "generated" && !("setMode" in saved)) state.setMode = "create";

  const busy = { character: null, background: null, frame: null, audio: null, video: null }; // { text, since, stage }
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

  async function uploadFile(file) {
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

  function setPrompt() {
    const style = SET_STYLES[state.setStyle];
    const fmt = FORMATS[state.format];
    return [
      state.useReference
        ? "Use the attached image only as a guide for camera distance, camera height, framing and composition: match how much of the room is visible and how small the chair is in the frame. Do not copy its furniture, decor or colours unless they are described below."
        : "",
      `${fmt.aspect === "9:16" ? "Vertical 9:16" : "Wide 16:9"} photograph of an empty podcast set in ${style.scene}.`,
      `In the centre stands an empty ${chairName()}, angled slightly toward the camera, with a black podcast microphone on a boom-arm stand beside it, pointing at the seat.`,
      FRAMINGS[state.framing].text,
      `Lighting: ${LIGHTS[state.light].text}.`,
      notes(state.setNotes),
      "No people. Photorealistic interior photography, natural colours, sharp focus, no text, no logos.",
    ].filter(Boolean).join(" ");
  }

  function frameAspect() {
    return state.backgroundAspect || FORMATS[state.format].aspect;
  }

  function framePrompt() {
    return [
      "Image 1 is a photograph of an empty podcast studio set. Image 2 is a character reference sheet of one real person: a face close-up on the left and the full outfit on the right, on a white background.",
      "Edit Image 1. Keep the exact camera position, lens, framing, crop, perspective, lighting, colours and every object of the set unchanged.",
      "Place the person from Image 2 sitting naturally in the set's chair: back against the backrest, shoulders relaxed, hands resting loosely on the thighs or armrests, torso turned slightly toward the microphone, face toward the camera, eyes looking into the lens.",
      "Position the boom-arm microphone in front of them, slightly below and to one side of the mouth, so that it never covers the lips and the whole mouth stays visible.",
      "Mouth closed, calm, relaxed, slightly friendly expression.",
      "Preserve the person's identity exactly (face shape, eyes, nose, skin tone, hair, facial hair, glasses, age) and the exact outfit, colours and accessories from Image 2.",
      "Correct real-world scale relative to the chair, the set's lighting falling on the person, soft contact shadows on the chair and floor.",
      "Photorealistic photograph, natural skin texture. One person only, no white background, no reference-sheet layout, no text, single frame.",
    ].join(" ");
  }

  function videoPrompt() {
    return [
      "The architect sits relaxed in the chair and speaks to the camera in the calm, articulate and confident manner of a renowned architect on a podcast.",
      "Lip movements match the voice exactly. Natural blinking, subtle head movement, steady eye contact, and measured hand gestures at chest height that sketch shapes in the air.",
      "The microphone stays in front of the mouth without covering the lips.",
      "Static camera, no zoom, no camera movement. Keep the face, hair, outfit, microphone and studio exactly as in the image.",
      "Photorealistic, natural skin texture, no text.",
    ].join(" ");
  }

  function audioSeconds() {
    return Number.isFinite(state.audio?.duration) ? state.audio.duration : null;
  }

  function frameIsStale() {
    return Boolean(
      state.frameUrl && state.frameSource === "generated" && state.frameFor &&
      (state.frameFor.character !== state.characterUrl || state.frameFor.background !== state.backgroundUrl),
    );
  }

  // Prompt boxes: each is written automatically until the user chooses to edit it.
  const PROMPT_BOXES = {
    character: { custom: "customCharacterPrompt", compose: characterPrompt, ta: "prompt-character", mode: "pmode-character", edit: "btn-customise-character", auto: "btn-auto-character" },
    set: { custom: "customSetPrompt", compose: setPrompt, ta: "prompt-set", mode: "pmode-set", edit: "btn-customise-set", auto: "btn-auto-set" },
    frame: { custom: "customFramePrompt", compose: framePrompt, ta: "prompt-frame", mode: "pmode-frame", edit: "btn-customise-frame", auto: "btn-auto-frame" },
    video: { custom: "customPrompt", compose: videoPrompt, ta: "prompt-video", mode: "pmode-video", edit: "btn-customise-video", auto: "btn-auto-video" },
  };
  const promptFor = (box) => (state[PROMPT_BOXES[box].custom] ?? PROMPT_BOXES[box].compose()).trim();

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
    openKeyPanel("Add your fal.ai key to continue. The step you started will carry on right after.");
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
      Object.assign(state, { characterUrl: url, characterSource: "generated", characterLook: look });
      save();
      setStatus("status-character", "Character sheet ready.", "ok");
    } catch (err) {
      setStatus("status-character", friendlyImageError(err), "error");
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
      Object.assign(state, { characterUrl: url, characterSource: "uploaded", characterLook: null });
      save();
      setStatus("status-character", "Character sheet added.", "ok");
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
    const useRef = state.useReference;
    const prompt = promptFor("set");
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
      Object.assign(state, { backgroundUrl: url, backgroundSource: "generated", backgroundAspect: fmt.aspect });
      save();
      setStatus("status-set", "Studio set ready.", "ok");
    } catch (err) {
      setStatus("status-set", friendlyImageError(err), "error");
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
        backgroundUrl: url, backgroundSource: "uploaded",
        backgroundAspect: (size && nearestAspect(size.w, size.h)) || FORMATS[state.format].aspect,
      });
      save();
      setStatus("status-set", "Studio set added.", "ok");
    } catch (err) {
      setStatus("status-set", err.message, "error");
    } finally {
      setBusy("background", null);
      render();
    }
  }

  async function generateFrame() {
    if (busy.frame) return;
    if (!state.characterUrl || !state.backgroundUrl) return setStatus("status-frame", "Add the character sheet and the set first.", "error");
    if (!ensureKey(generateFrame)) return;
    const aspect = frameAspect();
    const used = { character: state.characterUrl, background: state.backgroundUrl };
    setStatus("status-frame", "");
    setBusy("frame", "Placing the architect in the set…");
    render();
    try {
      const r = await runJob(
        "imageEdit",
        { prompt: promptFor("frame"), image_urls: [used.background, used.character], aspect_ratio: aspect, resolution: "2K", output_format: "png", num_images: 1 },
        (s) => { setBusy("frame", `Placing the architect in the set, ${describe(s)}…`); renderBusy(); },
      );
      const url = r?.images?.[0]?.url;
      if (!url) throw new Error("No image came back. Please try again.");
      Object.assign(state, { frameUrl: url, frameSource: "generated", frameFor: used, frameAspect: aspect });
      save();
      setStatus("status-frame", "On-set photo ready. Check the face, outfit and chair before making the video.", "ok");
    } catch (err) {
      setStatus("status-frame", friendlyImageError(err), "error");
    } finally {
      setBusy("frame", null);
      render();
    }
  }

  async function onOwnFrame(file) {
    if (!file.type.startsWith("image/")) return setStatus("status-frame", "Please choose an image file.", "error");
    if (busy.frame) return setStatus("status-frame", "Please wait for the current step to finish.", "error");
    if (!ensureKey(() => onOwnFrame(file))) return;
    setStatus("status-frame", "");
    setBusy("frame", "Uploading the photo…");
    render();
    try {
      const size = await imageSize(file);
      const { url } = await uploadFile(file);
      Object.assign(state, {
        frameUrl: url, frameSource: "uploaded", frameFor: null,
        frameAspect: (size && nearestAspect(size.w, size.h)) || frameAspect(),
      });
      save();
      setStatus("status-frame", "On-set photo added.", "ok");
    } catch (err) {
      setStatus("status-frame", err.message, "error");
    } finally {
      setBusy("frame", null);
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
        setBusy("audio", "Converting the recording…");
        renderBusy();
        const src = (await uploadFile(file)).url;
        const r = await runJob("audioConvert", { audio_urls: [src], output_format: "mp3_44100_128" });
        url = r?.audio?.url;
        if (!url) throw new Error("The voice could not be taken out of this MP4. Please export the recording again and retry.");
        format = "mp3";
      }

      state.audio = { url, name: file.name || "recording.mp4", duration: secs || null, format };
      save();
      setStatus("status-voice", "Voice track ready.", "ok");
    } catch (err) {
      setStatus("status-voice", err.message, "error");
    } finally {
      setBusy("audio", null);
      render();
    }
  }

  function friendlyImageError(err) {
    const m = err?.message || String(err);
    if (REFUSAL.test(m)) return `The image model refused this request, possibly because of a photo of a real person. Try again, or upload your own image instead. Details: ${m}`;
    return m;
  }

  function friendlyVideoError(err) {
    const m = err?.message || String(err);
    if (REFUSAL.test(m)) {
      return `This video model refused the photo, most likely because it shows a real person. Choose another video model above and try again. Details: ${m}`;
    }
    if (/audio_url/i.test(m)) return `The video model could not read the voice track. Please add the recording again in step 4. Details: ${m}`;
    if (/image_url/i.test(m)) return `The video model could not read the on-set photo. Create or upload it again in step 3. Details: ${m}`;
    return m;
  }

  async function createEpisode() {
    if (!(state.frameUrl && state.audio?.url) || busy.video) return;
    if (!state.consent) return setStatus("status-video", "Please confirm you have the consent of the person shown.", "error");
    if (!ensureKey(createEpisode)) return;
    const model = VIDEO_MODELS[state.videoModel];
    setStatus("status-video", "");
    setBusy("video", "Sending to the video model…", "prompt");
    render();
    try {
      const input = model.input(state.frameUrl, state.audio.url, promptFor("video"));
      const job = await submitJob(model.kind, input);
      const meta = { aspect: state.frameAspect || frameAspect(), model: state.videoModel, duration: audioSeconds() };
      state.videoJob = { ...job, startedAt: Date.now(), meta };
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
    const map = { character: "busy-character", background: "busy-set", frame: "busy-frame", audio: "busy-voice" };
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
    renderTabs("characterMode", { upload: "panel-char-upload", create: "panel-char-create" });
    const createChar = state.characterMode === "create";
    updateChips("chips-look", state.look, Boolean(busy.character));
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
    $("opt-reference").disabled = setBusyNow;
    setImg($("img-set"), state.backgroundUrl);
    $("drop-set").hidden = Boolean(state.backgroundUrl) || createSet;
    $("ph-set").hidden = Boolean(state.backgroundUrl) || !createSet;
    const setAspect = state.backgroundUrl ? state.backgroundAspect : createSet ? FORMATS[state.format].aspect : "9:16";
    $("media-set").classList.toggle("media-tall", isPortrait(setAspect));
    $("media-set").classList.toggle("media-wide", !isPortrait(setAspect));
    const btnSet = $("btn-set");
    btnSet.disabled = setBusyNow;
    btnSet.textContent = state.backgroundSource === "generated" && state.backgroundUrl ? "Create again" : "Create studio set";
    $("btn-own-set").disabled = setBusyNow;
    $("btn-own-set").textContent = state.backgroundUrl && state.backgroundSource === "uploaded" ? "Replace set image" : "Choose set image";
    renderPromptBox("set");

    // ---- Step 3: on set ----
    const haveInputs = Boolean(state.characterUrl && state.backgroundUrl);
    setImg($("img-frame"), state.frameUrl);
    $("ph-frame").hidden = Boolean(state.frameUrl);
    const fAspect = state.frameUrl ? state.frameAspect : frameAspect();
    $("media-frame").classList.toggle("media-tall", isPortrait(fAspect));
    $("media-frame").classList.toggle("media-wide", !isPortrait(fAspect));
    $("btn-frame").disabled = Boolean(busy.frame) || !haveInputs || Boolean(busy.character) || Boolean(busy.background);
    $("btn-frame").textContent = state.frameUrl && state.frameSource === "generated" ? "Create again" : "Create on-set photo";
    $("btn-own-frame").disabled = Boolean(busy.frame);
    $("frame-stale").hidden = !frameIsStale();
    $("hint-frame").textContent = haveInputs ? "" : `Still needed: ${[!state.characterUrl && "character sheet", !state.backgroundUrl && "studio set"].filter(Boolean).join(", ")}.`;
    renderPromptBox("frame");

    // ---- Step 4: voice ----
    const a = state.audio;
    $("drop-voice").hidden = Boolean(a);
    $("voice-panel").hidden = !a;
    $("btn-choose-voice").disabled = Boolean(busy.audio);
    $("btn-choose-voice").textContent = a ? "Replace recording" : "Choose MP4";
    if (a) {
      $("voice-name").textContent = a.name;
      const secs = audioSeconds();
      $("voice-meta").textContent = [secs ? fmtSec(secs) : null, "voice track ready"].filter(Boolean).join(" · ");
      const audioEl = $("voice-audio");
      if (audioEl.getAttribute("src") !== a.url) audioEl.src = a.url;
      $("voice-transcript").hidden = true;
    }

    renderBusy();

    // ---- Step 5: episode ----
    const model = VIDEO_MODELS[state.videoModel];
    updateChips("chips-model", state.videoModel, Boolean(busy.video));
    for (const b of $("chips-model").querySelectorAll(".chip")) b.title = VIDEO_MODELS[b.dataset.value].name;
    $("opt-consent").checked = Boolean(state.consent);
    $("opt-consent").disabled = Boolean(busy.video);

    setIngredient("ing-frame", !state.frameUrl
      ? { thumb: null, text: "Waiting for the on-set photo", stateClass: busy.frame ? "is-busy" : "is-wait" }
      : frameIsStale()
        ? { thumb: state.frameUrl, text: "Made from an earlier sheet or set. Create it again in step 3 to update it.", stateClass: "is-warn" }
        : { thumb: state.frameUrl, text: state.frameSource === "uploaded" ? "Your own photo" : "The architect seated in the set", stateClass: "is-done" });
    const secs = audioSeconds();
    setIngredient("ing-voice", !a
      ? { text: "Waiting for the recording", stateClass: busy.audio ? "is-busy" : "is-wait" }
      : { text: secs ? `${fmtSec(secs)}, the clip will be the same length` : "Ready", stateClass: "is-done" });

    $("fact-length").textContent = secs ? `${Math.round(secs * 10) / 10} seconds` : "Follows the recording";
    $("fact-format").textContent = ASPECTS[state.frameAspect || frameAspect()] || state.frameAspect;

    const missing = [!state.frameUrl && "on-set photo", !a && "voice recording"].filter(Boolean);
    const otherBusy = busy.character || busy.background || busy.frame || busy.audio;
    const ready = missing.length === 0;
    $("btn-episode").disabled = !ready || !state.consent || Boolean(busy.video) || Boolean(otherBusy);
    $("btn-episode").textContent = state.result ? "Create a new clip" : "Create episode clip";
    $("hint-episode").textContent = busy.video
      ? "Your clip is being created below."
      : !ready
        ? `Still needed: ${missing.join(", ")}.`
        : !state.consent
          ? "Tick the consent box to continue."
          : otherBusy
            ? "Waiting for the current step to finish."
            : `Uses fal.ai credits. Made with ${model.name}.`;

    renderPromptBox("video");
    $("prompt-video-note").hidden = model.prompt;
    $("prompt-video").disabled = !model.prompt;

    renderProgress();

    // ---- Result ----
    const r = state.result;
    $("step-result").hidden = !r;
    if (r) {
      const v = $("video-result");
      if (v.getAttribute("src") !== r.url) v.src = r.url;
      $("link-open").href = r.url;
      $("result-meta").textContent = [r.duration ? fmtSec(r.duration) : null, ASPECTS[r.aspect] || r.aspect, VIDEO_MODELS[r.model]?.name].filter(Boolean).join(" · ");
      $("btn-retake").disabled = Boolean(busy.video) || !ready;
    }

    // ---- Stepper ----
    renderStep("character",
      busy.character ? "is-busy" : state.characterUrl ? "is-done" : "is-next",
      busy.character ? "Working…" : state.characterUrl ? "Ready" : state.selfieUrl && createChar ? "Selfie added" : "Upload or create");
    renderStep("set",
      busy.background ? "is-busy" : state.backgroundUrl ? "is-done" : state.characterUrl ? "is-next" : "",
      busy.background ? "Working…" : state.backgroundUrl ? "Ready" : "Upload or create");
    renderStep("frame",
      busy.frame ? "is-busy" : state.frameUrl ? (frameIsStale() ? "is-next" : "is-done") : state.characterUrl && state.backgroundUrl ? "is-next" : "",
      busy.frame ? "Working…" : state.frameUrl ? (frameIsStale() ? "Out of date" : "Ready") : "Create the photo");
    renderStep("voice",
      busy.audio ? "is-busy" : a ? "is-done" : state.frameUrl ? "is-next" : "",
      busy.audio ? "Preparing…" : a ? fmtSec(audioSeconds()) : "Add an MP4");
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
    buildChips("chips-look", LOOKS, "look");
    buildChips("chips-style", SET_STYLES, "setStyle");
    buildChips("chips-chair", CHAIRS, "chair");
    buildChips("chips-light", LIGHTS, "light");
    buildChips("chips-framing", FRAMINGS, "framing");
    buildChips("chips-format", FORMATS, "format");
    buildChips("chips-model", VIDEO_MODELS, "videoModel");

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

    // Step 3
    bindFileInput($("file-frame"), onOwnFrame);
    $("btn-frame").addEventListener("click", generateFrame);
    $("btn-own-frame").addEventListener("click", () => $("file-frame").click());

    // Step 5
    $("opt-consent").addEventListener("change", (e) => {
      state.consent = e.target.checked;
      save();
      render();
    });
    $("btn-episode").addEventListener("click", createEpisode);
    $("btn-retake").addEventListener("click", () => {
      createEpisode();
      $("step-episode").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    $("btn-download").addEventListener("click", downloadResult);
    for (const name of Object.keys(PROMPT_BOXES)) bindPromptBox(name);
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
        : "Clear the character, set, on-set photo, recording and clip, and start over? Your fal.ai key is kept.";
      if (!confirm(msg)) return;
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
      if (busy.character || busy.background || busy.frame || busy.audio) {
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
  save(); // writes back any cleaned-up saved state
  if (audioMigrated) {
    setStatus("status-voice", "Please add the recording again. It is now prepared as a clean voice track for the video model.");
  }
  detectBackend().then(() => {
    render();
    if (backend.mode === "direct" && !getKey()) openKeyPanel();
    if (state.videoJob) followVideo();
  });
})();
