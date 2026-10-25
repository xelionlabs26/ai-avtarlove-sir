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
    tts: "fal-ai/elevenlabs/tts/multilingual-v2",
    ttsExpressive: "fal-ai/elevenlabs/tts/eleven-v3",
  };

  // Vision models that read the character sheet and the set, tried in order.
  const VISION_MODELS = ["google/gemini-2.5-flash", "openai/gpt-4o-mini"];

  // Image used as a camera-distance guide for generated sets (served next to this page).
  const REFERENCE_PATH = "reference/podcast-set-framing.jpg";

  // Outfits and preset sets live in library/outfits.json and library/sets.json (see library/README.md).
  // This one outfit is used only if outfits.json cannot be loaded.
  const FALLBACK_OUTFIT = {
    id: "indowestern",
    name: "Charcoal Nehru jacket",
    hint: "Nehru jacket, kurta",
    category: "Indo-western",
    for: ["man", "woman", "person"],
    default: true,
    prompt: "charcoal-grey Nehru jacket over an off-white handloom linen kurta, slim charcoal trousers, tan leather loafers, minimal steel wristwatch",
    image: null,
    colors: ["#3a3d42", "#efe8da", "#b0835a"],
  };
  const LIBRARY_ROOT = "library/";

  const SPEAKERS = {
    man: { label: "Man", hint: "he / his", noun: "man", he: "he", his: "his", He: "He", His: "His" },
    woman: { label: "Woman", hint: "she / her", noun: "woman", he: "she", his: "her", He: "She", His: "Her" },
    person: { label: "Person", hint: "they / their", noun: "person", he: "they", his: "their", He: "They", His: "Their" },
  };

  // Light wording for the video prompt's look paragraph.
  const LIGHT_LOOKS = {
    day: "soft, warm natural daylight from a window on the left, gentle shadows",
    soft: "soft, even, slightly cool studio light from the front, gentle shadows",
    warm: "warm cinematic lighting with amber and chocolate-brown tones, soft shadows",
    moody: "low-key cinematic lighting from warm practical lamps, deep soft shadows",
  };

  const SET_STYLES = {
    studio: {
      label: "Architect studio",
      hint: "Books, models, drafting table",
      chair: "velvet",
      scene: "an architect's working studio: warm, textured lime-plaster walls in soft ochre, a tall white-framed window on the left letting in daylight, " +
        "honey-toned teak bookshelves behind the chair filled with architecture books, with small white architectural massing models standing on top of the shelves and on a low cabinet by the window, " +
        "a wooden drafting table on the right with rolled white drawings and an open floor plan on it, a large architectural floor plan pinned to the wall above it, a brass desk lamp and a cup of pencils, and old wooden floorboards",
      setting: "an architect's working studio with teak bookshelves, white architectural models, a drafting table with rolled drawings and a tall window",
    },
    velvet: {
      label: "Teal velvet",
      hint: "Curtains, velvet chair",
      chair: "velvet",
      scene: "a minimal podcast studio: floor-to-ceiling teal-blue velvet curtains with soft, even vertical folds filling the entire background, and nothing else in the room",
      setting: "a minimal podcast studio with floor-to-ceiling teal-blue velvet curtains",
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
    velvet: { label: "Teal velvet", hint: "Rolled arms", text: "deep teal velvet armchair with rolled arms" },
    cane: { label: "Teak & cane", hint: "Mid-century", text: "teak-and-cane lounge armchair" },
    boucle: { label: "Bouclé", hint: "Cream, rounded", text: "cream bouclé swivel armchair" },
    leather: { label: "Leather", hint: "Cognac lounge", text: "cognac leather lounge armchair" },
  };

  const LIGHTS = {
    soft: { label: "Soft studio", hint: "Even, clean", text: "soft, even, diffused studio light from the front, slightly cool and clean, gentle shadows", short: "soft, even studio light from the front" },
    warm: { label: "Warm evening", hint: "Lamps, amber glow", text: "warm amber evening light from lamps and soft uplighting, cosy and cinematic", short: "warm amber evening lamplight" },
    day: { label: "Soft daylight", hint: "Window light", text: "soft, warm natural daylight from the tall window on the left, calm and bright, gentle shadows", short: "soft, warm daylight from a window on the left" },
    moody: { label: "Moody", hint: "Low-key", text: "low-key cinematic light from warm practical lamps with deep, soft shadows", short: "low-key cinematic lamplight with soft shadows" },
  };

  const FRAMINGS = {
    close: {
      label: "Talking-head",
      hint: "Close, like a clip",
      text:
        "Framed like a close talking-head podcast shot. Camera about one and a half metres from the chair, at seated chest height, straight on and very slightly looking down at the seat. " +
        "The chair fills the lower half of the frame, placed right of centre and turned slightly to the left; its right armrest is cut off by the right edge of the frame and the front of the seat is cut off by the bottom edge. " +
        "A black broadcast dynamic microphone on a black boom arm enters from the left edge at about 45 percent of the frame height and hangs straight down, so the microphone sits just above the top-left of the backrest, where a seated person's mouth would be. " +
        "The upper half of the frame is background only, slightly soft with shallow depth of field, filling the frame behind the chair from edge to edge. No ceiling visible; at most a sliver of floor in a bottom corner.",
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

  // Reference video: off, copy its performance (sent as @Video1), or take its script (transcribed).
  const REF_MODES = {
    off: { label: "Don't use", hint: "No reference" },
    performance: { label: "Copy the performance", hint: "Movement and camera" },
    script: { label: "Use the script", hint: "Words to record" },
  };
  // Typed words are spoken by ElevenLabs through the chosen provider (kie.ai or fal.ai), with the same key.
  const TTS_MODELS = {
    multilingual: { label: "Natural", hint: "Multilingual v2", kind: "tts" },
    v3: { label: "Expressive", hint: "Eleven v3", kind: "ttsExpressive" },
  };
  // Indian ElevenLabs voices for Hindi and English, from library/voices.json (this list is the fallback).
  const FALLBACK_VOICES = [
    { id: "niraj", name: "Niraj", voiceId: "zgqefOY5FPQ3bB7OZTVR", gender: "male", hint: "Hindi and English, calm narrator", default: true },
    { id: "indian-hindi-female", name: "Indian Hindi voice", voiceId: "2F1KINpxsttim2WfMbVs", gender: "female", hint: "Hindi and English, clear", default: true },
  ];
  const TTS_VOICE_GROUPS = { male: "Male voices", female: "Female voices" };
  const VOICE_ID = /^[A-Za-z0-9]{15,40}$/;
  const TTS_WORDS_PER_SEC = 2.6; // a calm speaking pace, for the length estimate

  // Seedance 2.5 limits for reference videos. A clip used only for its script is never sent to Seedance, so only its
  // length counts, and only its sound is uploaded.
  const REF_LIMITS = { minSec: 2, maxSec: 30, minFps: 24, maxFps: 60, minPixels: 409600, maxPixels: 927408, minSide: 300, maxSide: 6000 };
  const SCRIPT_MAX_SEC = 180;
  const SCRIPT_MAX_BYTES = 250 * 1024 * 1024;

  const CAMERAS = {
    still: { label: "Still", hint: "One fixed angle" },
    cuts: { label: "Three cuts", hint: "Wide, medium, close" },
  };

  const QUALITIES = {
    "480p": { label: "Test 480p", hint: "Lowest cost" },
    "720p": { label: "Standard 720p", hint: "Balanced" },
    "1080p": { label: "Final 1080p", hint: "Highest cost" },
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
  const KIE_MODELS = {
    image: "nano-banana-pro", imageEdit: "nano-banana-pro", video: "bytedance/seedance-2-5",
    tts: "elevenlabs/text-to-speech-multilingual-v2", ttsExpressive: "elevenlabs/text-to-dialogue-v3",
  };
  // Jobs that run on the provider the user picked. The rest (reading images, transcription,
  // audio conversion) are optional helpers that only run with fal.ai credentials.
  const PROVIDER_KINDS = new Set(["image", "imageEdit", "video", "tts", "ttsExpressive"]);
  const PROVIDERS = { kie: "kie.ai", fal: "fal.ai" };

  // ===========================================================================
  // State
  // ===========================================================================

  const DEFAULTS = {
    characterMode: "upload", // "upload" | "create"
    speaker: "man",
    look: "indowestern", // outfit used when creating a sheet (kept in step with outfitId)
    outfitId: null, // null = "Default (no outfit chosen)"
    outfitCategory: "all",
    libraryUploads: {}, // provider|path -> { url, at }: library files already uploaded
    characterNotes: "",
    customCharacterPrompt: null,
    selfieUrl: null,
    characterUrl: null,
    characterSource: null, // "generated" | "uploaded"
    characterLook: null,
    characterInfo: null, // { for, face, outfit, layout } or { for, failed }

    setMode: "library", // "library" | "upload" | "create"
    libraryId: null, // preset set picked in the Library tab
    backgroundLibraryId: null, // preset set the current background came from
    backgroundChair: null, // chair added by "Add chair and mic"
    setStyle: "studio",
    chair: "velvet",
    light: "day",
    framing: "close",
    format: "vertical",
    useReference: true,
    setNotes: "",
    customSetPrompt: null,
    backgroundUrl: null,
    backgroundSource: null, // "library" | "library-edited" | "generated" | "uploaded"
    backgroundAspect: null,
    backgroundRead: null, // description of a generated set, used if reading the image fails
    sceneInfo: null, // { for, setting, seat, microphone, lighting } or { for, failed }

    audio: null, // { url, name, duration, format }
    transcript: null, // { for, text, chunks, language } or { for, failed }

    assetId: "",

    refMode: "off", // "off" | "performance" | "script"
    refRights: false,
    refVideo: null, // { id, name, size, duration, width, height, fps, url?, provider?, at?, audioUrl? }: url only once uploaded for copying the performance
    refScript: null, // { for: refVideo.id, text, language } or { for, failed }

    voiceMode: "upload", // "upload" | "record" | "tts"
    ttsText: "",
    ttsVoice: null, // id from library/voices.json; null follows the Speaker choice
    ttsCustomVoice: "", // an ElevenLabs voice ID pasted by the user; used instead when set
    ttsModel: "multilingual",

    provider: "kie", // "kie" | "fal"
    quality: "720p",
    camera: "still",
    customPrompt: null,
    videoJob: null,
    result: null,
  };

  const saved = loadState();
  const state = Object.assign({}, DEFAULTS, saved);
  const enums = [["refMode", REF_MODES], ["ttsModel", TTS_MODELS], ["speaker", SPEAKERS], ["setStyle", SET_STYLES], ["chair", CHAIRS], ["light", LIGHTS], ["framing", FRAMINGS], ["format", FORMATS], ["quality", QUALITIES], ["camera", CAMERAS]];
  for (const [k, opts] of enums) if (!opts[state[k]]) state[k] = DEFAULTS[k];
  if (!["upload", "create"].includes(state.characterMode)) state.characterMode = "upload";
  if (!["upload", "record", "tts"].includes(state.voiceMode)) state.voiceMode = "upload";
  if (!["library", "upload", "create"].includes(state.setMode)) state.setMode = "library";
  // The set library is new: show it first unless a set is already in use.
  if (!saved.setLibraryV) {
    if (!saved.backgroundUrl) state.setMode = "library";
    state.setLibraryV = 1;
  }
  if (!PROVIDERS[state.provider]) state.provider = "kie";
  // Before the outfit library, the chosen "Look" only affected new sheets. Carry a non-default look over once.
  if (!saved.outfitsV) {
    state.outfitId = saved.look && saved.look !== "indowestern" ? saved.look : null;
    state.outfitsV = 1;
  }
  if ((saved.setDefaultsV || 0) < 3) {
    Object.assign(state, { setStyle: "studio", chair: "velvet", light: "day", framing: "close", customSetPrompt: null, setDefaultsV: 3 });
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

  const busy = { character: null, background: null, ref: null, audio: null, video: null }; // { text, since, stage }
  const pending = { character: null, scene: null, transcript: null };
  const backend = { mode: "direct", models: DEFAULT_MODELS };
  let pendingKeyAction = null;
  let keyCloseTimer = null;
  let refFile = null; // { id, file, preview }: the reference clip picked in this visit, kept in memory only
  const rec = { recorder: null, stream: null, started: 0, timer: null, meter: null }; // the recording in progress

  // The library: outfits and preset sets, loaded from library/*.json at start-up.
  const library = { outfits: [FALLBACK_OUTFIT], sets: [], voices: FALLBACK_VOICES, loaded: false };

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
    if (kind === "tts" || kind === "ttsExpressive") {
      const voice = input.voice;
      return kind === "tts" ? { text: input.text, voice, timestamps: true } : { dialogue: [{ text: input.text, voice }], stability: 0.5 };
    }
    if (kind === "video") {
      const out = {
        prompt: input.prompt,
        reference_image_urls: input.image_urls,
        reference_audio_urls: input.audio_urls,
        ...(input.video_urls?.length ? { reference_video_urls: input.video_urls } : {}),
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
    let out = {};
    try { out = JSON.parse(d.resultJson || "{}") || {}; } catch { /* malformed */ }
    const urls = Array.isArray(out.resultUrls) ? out.resultUrls : [];
    if (!urls.length) throw Object.assign(new Error("kie.ai finished the task without a file."), { status: 400 });
    const result = job.kind === "video"
      ? { video: { url: urls[0] } }
      : job.kind === "tts" || job.kind === "ttsExpressive"
        ? { audio: { url: urls[0] }, timestamps: out.timestamps || out.alignment || null }
        : { images: urls.map((url) => ({ url })) };
    return { status: "COMPLETED", queuePosition: null, result };
  }

  const useKie = (kind) => state.provider === "kie" && PROVIDER_KINDS.has(kind);

  async function uploadFile(file, via = state.provider) {
    if (via === "kie") return kieUpload(file);
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
  // Library
  // ===========================================================================

  const libraryPath = (p) => (typeof p === "string" && p ? (/^https?:\/\//i.test(p) ? p : LIBRARY_ROOT + p.replace(/^\/+/, "")) : null);
  const str = (v, max = 600) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

  function sanitizeVoices(list) {
    if (!Array.isArray(list)) return null;
    const out = [];
    for (const x of list) {
      const id = str(x?.id, 80);
      const voiceId = str(x?.voiceId, 60);
      if (!id || !voiceId || !VOICE_ID.test(voiceId) || out.some((y) => y.id === id)) continue;
      out.push({ id, voiceId, name: str(x.name, 60) || id, gender: x.gender === "female" ? "female" : "male", hint: str(x.hint, 80) || "", default: x.default === true });
    }
    return out.length ? out : null;
  }

  function sanitizeOutfits(list) {
    if (!Array.isArray(list)) return null;
    const seen = new Set();
    const out = [];
    for (const o of list) {
      const id = str(o?.id, 80);
      if (!id || seen.has(id)) continue;
      const fromPhoto = o.fromPhoto === true;
      const prompt = str(o.prompt, 600);
      if (!prompt && !fromPhoto) continue;
      seen.add(id);
      out.push({
        id,
        name: str(o.name, 60) || id,
        hint: str(o.hint, 60) || str(o.category, 40) || "",
        category: str(o.category, 40) || "Other",
        for: Array.isArray(o.for) && o.for.length ? o.for.filter((x) => SPEAKERS[x]) : Object.keys(SPEAKERS),
        default: o.default === true,
        fromPhoto,
        prompt,
        image: libraryPath(o.image),
        colors: Array.isArray(o.colors) ? o.colors.filter((c) => /^#[0-9a-f]{3,8}$/i.test(c)).slice(0, 4) : [],
      });
    }
    return out.length ? out : null;
  }

  function sanitizeSets(list) {
    if (!Array.isArray(list)) return [];
    const seen = new Set();
    const out = [];
    for (const x of list) {
      const id = str(x?.id, 80);
      const image = libraryPath(x?.image);
      if (!id || !image || seen.has(id)) continue;
      seen.add(id);
      out.push({
        id,
        name: str(x.name, 60) || id,
        image,
        thumb: libraryPath(x.thumb) || image,
        aspect: ASPECTS[x.aspect] ? x.aspect : "9:16",
        hasChairAndMic: x.hasChairAndMic !== false,
        scene: str(x.scene, 700),
        seat: str(x.seat, 160),
        microphone: x.microphone !== false && x.hasChairAndMic !== false,
        light: LIGHTS[x.light] ? x.light : null,
      });
    }
    return out;
  }

  async function loadLibrary() {
    const get = async (path) => {
      try {
        const res = await fetch(LIBRARY_ROOT + path, { cache: "no-cache" });
        return res.ok ? await res.json() : null;
      } catch {
        return null;
      }
    };
    const [o, sets, v] = await Promise.all([get("outfits.json"), get("sets.json"), get("voices.json")]);
    library.outfits = sanitizeOutfits(o?.outfits) || [FALLBACK_OUTFIT];
    library.sets = sanitizeSets(sets?.sets);
    library.voices = sanitizeVoices(v?.voices) || FALLBACK_VOICES;
    if (state.ttsVoice && !library.voices.some((x) => x.id === state.ttsVoice)) state.ttsVoice = null;
    library.loaded = true;
    if (state.outfitId && !outfitById(state.outfitId)) state.outfitId = null;
    state.look = sheetOutfit().id;
  }

  const outfitById = (id) => library.outfits.find((o) => o.id === id) || null;
  const defaultOutfit = () => library.outfits.find((o) => o.default) || library.outfits[0] || FALLBACK_OUTFIT;
  // The outfit a new character sheet is made with: the chosen one, or the default.
  const sheetOutfit = () => outfitById(state.outfitId) || defaultOutfit();

  /**
   * How the chosen outfit reaches the video prompt:
   *  - "sheet":        no outfit chosen (or "as in my photo"): the outfit comes from the sheet, as before.
   *  - "sheet-chosen": the sheet was made in the app with the chosen outfit: name it from the library.
   *  - "override":     the sheet shows other clothes (uploaded, made with another outfit, or a verified
   *                    portrait): take only the face from @Image1 and dress the person in the chosen outfit,
   *                    with its image as @Image3 when it has one.
   */
  function outfitPlan() {
    const chosen = outfitById(state.outfitId);
    if (!chosen || chosen.fromPhoto) return { mode: "sheet", outfit: null };
    const madeWithIt = !assetRef() && state.characterSource === "generated" && state.characterLook === chosen.id;
    if (madeWithIt) return { mode: "sheet-chosen", outfit: chosen };
    return { mode: "override", outfit: chosen, image: chosen.image };
  }

  const refActive = () => state.refMode === "performance" && Boolean(state.refVideo?.url) && state.refRights;

  const isLibrarySource = () => state.backgroundSource === "library" || state.backgroundSource === "library-edited";
  // What to show for the current set: the app's own copy for unedited library sets (fast, never expires).
  const setDisplayUrl = () => (state.backgroundSource === "library" && setById(state.backgroundLibraryId)?.image) || state.backgroundUrl;

  /** Prompt for "Add chair and mic": puts the podcast chair and boom-arm mic into a plain room photo. */
  function addChairPrompt(chair) {
    return [
      "Edit this photograph of a room. Keep the room, its walls, furniture, props, light, colours and the camera position exactly as they are.",
      `Add, in the foreground, an empty ${chair}, placed in the lower half of the frame, right of centre and turned slightly to the left, large in the frame as if the camera were about one and a half metres away; the front of the seat may be cut off by the bottom edge.`,
      "Add a black broadcast dynamic microphone on a black boom arm entering from the left edge at about 45 percent of the frame height and hanging down just above the top-left of the chair's backrest, where a seated person's mouth would be.",
      "Match the room's lighting, shadows, perspective and colour so the chair and the microphone look naturally part of the photo.",
      "No people, no hands, no text, no logos, no watermark. Photorealistic.",
    ].join(" ");
  }

  const UPLOAD_TTL = { kie: 12 * 3600e3, fal: 24 * 3600e3 };

  /** Uploads a file shipped with the app (library image, framing reference) once per provider and reuses the link. */
  async function libraryUpload(path) {
    const key = `${state.provider}|${backend.mode}|${path}`;
    const hit = state.libraryUploads?.[key];
    if (hit?.url && Date.now() - hit.at < UPLOAD_TTL[state.provider]) return hit.url;
    let res;
    try { res = await fetch(path); } catch { res = null; }
    if (!res?.ok) throw new Error(`The library file ${path.split("/").pop()} could not be loaded.`);
    const blob = await res.blob();
    const name = path.split("/").pop() || "library-file";
    const { url } = await uploadFile(new File([blob], name, { type: blob.type || "image/jpeg" }));
    const entries = Object.entries({ ...(state.libraryUploads || {}), [key]: { url, at: Date.now() } });
    state.libraryUploads = Object.fromEntries(entries.slice(-40));
    save();
    return url;
  }
  const setById = (id) => library.sets.find((x) => x.id === id) || null;

  // ===========================================================================
  // Prompts
  // ===========================================================================

  function characterPrompt() {
    const look = sheetOutfit();
    const withImage = Boolean(look.image && !look.fromPhoto);
    let outfit;
    if (look.fromPhoto || !look.prompt) {
      outfit = "the full outfit as a ghost mannequin, front view, head to toe: the same clothes the person wears in the photo, completed naturally into a smart full outfit with matching trousers and footwear";
    } else if (withImage) {
      outfit = `the outfit from the second image as a ghost mannequin, front view, head to toe: ${look.prompt}. Copy only the clothes from the second image, not any person, mannequin or background in it`;
    } else {
      outfit = `the full outfit as a ghost mannequin, front view, head to toe: ${look.prompt}`;
    }
    return [
      withImage
        ? "Use the first image (the photo) for the face. Create one wide 16:9 character sheet on a plain white background."
        : "Use the uploaded photo for the face. Create one wide 16:9 character sheet on a plain white background.",
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
        ? `In the foreground is an empty ${chairName()}.`
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
    const look = state.characterSource === "generated" ? outfitById(state.characterLook) : null;
    if (look?.prompt) return { face: null, outfit: look.prompt, layout: "sheet", source: "preset" };
    return { face: null, outfit: null, layout: "sheet", source: "generic" };
  }

  function sceneDetails() {
    if (isLibrarySource()) {
      const e = setById(state.backgroundLibraryId);
      if (e) {
        const edited = state.backgroundSource === "library-edited";
        const seat = edited ? state.backgroundChair : e.hasChairAndMic ? e.seat : null;
        const mic = edited ? true : e.microphone;
        const extras = [seat ? `a ${seat.replace(/^(a|an|the)\s+/i, "")}` : null, mic ? "a black broadcast microphone on a boom arm" : null].filter(Boolean);
        return {
          scene: extras.length ? `${e.scene}, with ${extras.join(" and ")}` : e.scene,
          setting: e.scene,
          seat,
          microphone: mic,
          light: e.light,
          lighting: null,
          source: "library",
          name: e.name,
        };
      }
    }
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

    // 1. Who: face and outfit from the character sheet (or a verified portrait), and the chosen outfit.
    const plan = outfitPlan();
    let p1;
    if (plan.mode === "override") {
      const facePart = ch.layout === "photo"
        ? `@Image1 defines ${who}'s face, hair, ${facial} and skin tone. Use only the face from @Image1 and ignore the clothes in it.`
        : `@Image1 defines ${who}'s face, hair, ${facial} and skin tone. Use only the face from the left side of @Image1 and ignore the clothes shown in it.`;
      const wearPart = plan.image
        ? `@Image3 defines the outfit ${who} wears: ${trim(plan.outfit.prompt)}. Use only the clothes from @Image3, not any person, mannequin or background in it.`
        : `${Who} wears ${trim(plan.outfit.prompt)}.`;
      p1 = `${facePart} ${wearPart} The output must contain only this one ${sp.noun}. Do not use the background of @Image1.`;
    } else if (plan.mode === "sheet-chosen") {
      p1 = `@Image1 defines ${who}'s face, hair, ${facial}, skin tone and full outfit. Use the face from the left side of the image and the outfit from the right side: ` +
        `${trim(plan.outfit.prompt)}. The output must contain only this one ${sp.noun}. Do not use the white background of @Image1.`;
    } else if (ch.layout === "photo") {
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

    // 4. Performance, modelled on a calm, seated podcast answer.
    const seatName = sc.seat ? `the ${trim(sc.seat).replace(/^(a|an|the)\s+/i, "").replace(/\s+in the (centre|center).*$/i, "")}` : "the chair";
    const mic = sc.microphone !== false;
    const p4 = `${Who} sits back in ${seatName} from @Image2, relaxed and upright, legs apart and feet flat on the floor, ` +
      `body turned a little toward ${mic ? `the microphone, which hangs close to ${sp.his} mouth without covering ${sp.his} lips` : "the side"}. ` +
      `Both forearms rest on the armrests. The hand on the far side stays relaxed on the armrest near ${sp.his} knee; ` +
      `the hand on the ${mic ? "microphone " : ""}side now and then lifts off the armrest into an open-palm gesture toward the host, then settles back. ` +
      `${Who} speaks in a calm, warm, conversational tone, as if answering a host sitting just off-frame to camera-left. ` +
      `${sp.His} eyes and face stay turned slightly to camera-left, toward the microphone side, for the whole clip and never look into the lens. ` +
      `${sp.His} mouth shapes every word clearly in sync with @Audio1. On key words ${sp.his} eyebrows lift and ${sp.his} head turns or tilts slightly; ` +
      `between phrases ${who} pauses with ${sp.his} mouth closed, blinks naturally and sometimes briefly closes ${sp.his} eyes in thought. ` +
      `Movements stay small and natural: no big gestures, no exaggerated smiling.`;

    // A reference video replaces the house performance and camera with the clip's own.
    const ref = refActive();
    const p4ref = `${Who} sits in ${seatName} from @Image2 and copies the body movement, posture, gestures, head turns, facial expressions and pacing of the person in @Video1, ` +
      `while lip-syncing precisely to @Audio1. Use @Video1 only for movement, timing and camera: do not use its person, face, body shape, clothing, background, text or audio.`;

    // 5. Look.
    const lightLook = (sc.light && LIGHT_LOOKS[sc.light]) || (sc.lighting ? `${trim(sc.lighting)}, soft shadows` : LIGHT_LOOKS.warm);
    const p5 = `The visuals feature ${lightLook}, natural skin texture, realistic fabric texture on the outfit, and a photorealistic authentic UGC creator look.`;

    // 6. Camera: one fixed angle, or cuts fitted to the recording.
    let shots;
    let p7;
    if (ref) {
      shots = [`Camera: follow the camera angle, framing and any camera movement or cuts of @Video1, applied to the scene from @Image2.`];
      p7 = `${Who}'s face, outfit, lighting and scene stay identical throughout.`;
    } else if (state.camera !== "cuts") {
      shots = [
        `Camera: one continuous shot from a locked-off tripod camera at seated chest height, straight on, in the same direction as @Image2: a seated full-body shot with ${who} filling the frame from just above the head down to the shoes, both armrests of the chair visible at the sides, the microphone on its boom arm at the upper left, and the set softly behind. ` +
        `The camera never moves: no cuts, no zoom, no pan, no tilt, no shake. Only ${who} moves.`,
      ];
      p7 = `${Who}'s face, outfit, lighting and scene stay identical throughout.`;
    } else if (points.length === 3) {
      const [, a, D] = points;
      shots = [
        `Use two hard cuts:`,
        `[0–${a}s] Medium-wide shot, eye-level, straight-on: ${who} seated in the chair, with the set softly behind.`,
        `[${a}–${D}s] Hard jump cut to an extreme close-up of ${sp.his} face from just above the eyebrows to the chin, direct eye-level, ending on a calm, assured expression.`,
      ];
      p7 = `${Who}'s face, outfit, lighting and scene stay identical across both cuts.`;
    } else {
      const [, a, b, D] = points;
      shots = [
        `Use three hard cuts:`,
        `[0–${a}s] Wide full shot, eye-level, straight-on: full body visible seated in the chair, with the floor, the furniture and the whole set in frame.`,
        `[${a}–${b}s] Hard cut to a medium close-up from mid-torso up, slightly angled from the side, eye-level to slightly low angle${mic ? ", with the microphone and boom arm prominent in the foreground" : ""}.`,
        `[${b}–${D}s] Hard jump cut to an extreme close-up of ${sp.his} face from just above the eyebrows to the chin, direct eye-level, ending on a calm, assured expression.`,
      ];
      p7 = `${Who}'s face, outfit, lighting and scene stay identical across all three cuts.`;
    }

    const p8 = `Audio includes only the original audio from @Audio1${ref ? ", nothing from @Video1" : ""}. No background music, no sound effects, no added ambience, no subtitles, no on-screen text.`;
    return [p1, p2, p3, ref ? p4ref : p4, p5, shots.join("\n"), p7, p8].join("\n\n");
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
    if (isLibrarySource()) return null;
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
    if (state.backgroundUrl && !isLibrarySource() && !pending.scene && (force || state.sceneInfo?.for !== state.backgroundUrl)) analyseScene();
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

  /** Reads duration, video size (after rotation) and frame rate from an MP4/MOV header, for any codec. */
  async function mp4Info(file) {
    const read = async (start, len) => new DataView(await file.slice(start, start + len).arrayBuffer());
    const t4 = (dv, o) => String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3));
    let pos = 0;
    let moov = null;
    for (let g = 0; pos + 8 <= file.size && g < 10000; g++) {
      const h = await read(pos, 16);
      if (h.byteLength < 8) return null;
      let size = h.getUint32(0);
      let header = 8;
      if (size === 1) { size = Number(h.getBigUint64(8)); header = 16; } else if (size === 0) size = file.size - pos;
      if (size < header) return null;
      if (t4(h, 4) === "moov") {
        if (size > 16 * 1024 * 1024) return null;
        moov = await read(pos, size);
        break;
      }
      pos += size;
    }
    if (!moov) return null;
    const children = (start, end) => {
      const out = [];
      for (let p = start; p + 8 <= end; ) {
        let size = moov.getUint32(p);
        let header = 8;
        if (size === 1) { size = Number(moov.getBigUint64(p + 8)); header = 16; } else if (size === 0) size = end - p;
        if (size < header || p + size > end) break;
        out.push({ t: t4(moov, p + 4), start: p, body: p + header, end: p + size });
        p += size;
      }
      return out;
    };
    const find = (box, t) => children(box.body, box.end).find((b) => b.t === t);
    const timing = (box) => {
      const v = moov.getUint8(box.start + 8);
      const ts = moov.getUint32(box.start + (v === 1 ? 28 : 20));
      const d = v === 1 ? Number(moov.getBigUint64(box.start + 32)) : moov.getUint32(box.start + 24);
      return ts ? d / ts : null;
    };
    const root = { start: 0, body: moov.getUint32(0) === 1 ? 16 : 8, end: moov.byteLength };
    const mvhd = find(root, "mvhd");
    const info = { duration: mvhd ? timing(mvhd) : null, width: null, height: null, fps: null };
    for (const trak of children(root.body, root.end).filter((b) => b.t === "trak")) {
      const mdia = find(trak, "mdia");
      const hdlr = mdia && find(mdia, "hdlr");
      if (!hdlr || t4(moov, hdlr.start + 16) !== "vide") continue;
      const tkhd = find(trak, "tkhd");
      if (tkhd) {
        let w = moov.getUint32(tkhd.end - 8) / 65536;
        let h = moov.getUint32(tkhd.end - 4) / 65536;
        const a = moov.getInt32(tkhd.end - 44) / 65536;
        const b = moov.getInt32(tkhd.end - 40) / 65536;
        if (Math.abs(a) < 0.01 && Math.abs(Math.abs(b) - 1) < 0.01) [w, h] = [h, w];
        info.width = Math.round(w) || null;
        info.height = Math.round(h) || null;
      }
      const mdhd = find(mdia, "mdhd");
      const minf = find(mdia, "minf");
      const stbl = minf && find(minf, "stbl");
      const stts = stbl && find(stbl, "stts");
      if (mdhd && stts) {
        const secs = timing(mdhd);
        let samples = 0;
        const count = moov.getUint32(stts.start + 12);
        for (let i = 0; i < count && stts.start + 24 + i * 8 <= stts.end; i++) samples += moov.getUint32(stts.start + 16 + i * 8);
        if (secs) info.fps = Math.round((samples / secs) * 100) / 100;
      }
      break;
    }
    return info;
  }

  /** Falls back to the browser's video element for length and size when the header cannot be read (a file or a link). */
  function videoElementInfo(file) {
    return new Promise((resolve) => {
      const el = document.createElement("video");
      const url = typeof file === "string" ? file : URL.createObjectURL(file);
      let settled = false;
      const done = (v) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (url !== file) URL.revokeObjectURL(url);
        el.removeAttribute("src");
        resolve(v);
      };
      const timer = setTimeout(() => done(null), 8000);
      el.preload = "metadata";
      el.muted = true;
      el.onloadedmetadata = () => done({ duration: Number.isFinite(el.duration) ? el.duration : null, width: el.videoWidth || null, height: el.videoHeight || null, fps: null });
      el.onerror = () => done(null);
      el.src = url;
    });
  }

  /** Returns a plain message when a reference clip is outside what Seedance accepts (or, for a script, too long), else null. */
  function refProblem(info, forScript) {
    const L = REF_LIMITS;
    if (forScript) {
      return info.duration > SCRIPT_MAX_SEC + 0.5 ? `This clip is ${fmtSec(info.duration)} long. To read a script, use a clip of ${SCRIPT_MAX_SEC / 60} minutes or less.` : null;
    }
    if (info.duration && (info.duration < L.minSec || info.duration > L.maxSec + 0.2)) {
      return `This clip is ${fmtSec(info.duration)} long. Reference videos must be ${L.minSec} to ${L.maxSec} seconds. Trim it and try again.`;
    }
    if (info.width && info.height) {
      const px = info.width * info.height;
      const side = `${info.width} × ${info.height}`;
      if (px > L.maxPixels || Math.max(info.width, info.height) > L.maxSide) return `This clip is ${side}. Reference videos must be 720p or smaller (for example 720 × 1280). Export it at 720p and try again.`;
      if (px < L.minPixels || Math.min(info.width, info.height) < L.minSide) return `This clip is ${side}, below what the model accepts. Use at least 480p (for example 480 × 854).`;
    }
    if (info.fps && (info.fps < L.minFps - 0.5 || info.fps > L.maxFps + 0.5)) {
      return `This clip runs at ${Math.round(info.fps)} frames per second. Reference videos must be ${L.minFps} to ${L.maxFps} frames per second.`;
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

  /** Encodes an AudioBuffer (or the part of it from sample `from` to `to`) as a mono 16-bit PCM WAV file. */
  function encodeWav(buffer, maxSeconds, from = 0, to = buffer.length) {
    const rate = buffer.sampleRate;
    const len = Math.max(0, Math.min(to - from, Math.round(rate * maxSeconds)));
    const channels = buffer.numberOfChannels;
    const mono = new Float32Array(len);
    for (let c = 0; c < channels; c++) {
      const d = buffer.getChannelData(c);
      for (let i = 0; i < len; i++) mono[i] += d[from + i] / channels;
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

  const getReferenceUrl = () => libraryUpload(REFERENCE_PATH);

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
      setStatus("status-character", "Selfie added. Choose an outfit, then press Create character sheet.", "ok");
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
    const outfit = sheetOutfit();
    const look = outfit.id;
    const prompt = promptFor("character");
    setStatus("status-character", "");
    setBusy("character", "Creating the character sheet…");
    render();
    try {
      const images = [state.selfieUrl];
      if (outfit.image && !outfit.fromPhoto && state.customCharacterPrompt == null) images.push(await libraryUpload(outfit.image));
      const r = await runJob(
        "imageEdit",
        { prompt, image_urls: images, aspect_ratio: "16:9", resolution: "2K", output_format: "png", num_images: 1 },
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
        backgroundUrl: url, backgroundSource: "generated", backgroundAspect: fmt.aspect, backgroundRead: read, sceneInfo: null, libraryId: null,
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

  async function onLibraryPick(id) {
    const e = setById(id);
    if (!e || busy.background) return;
    state.libraryId = id;
    save();
    setStatus("status-set", "");
    render();
    if (!e.hasChairAndMic) return setStatus("status-set", "This one is a room only. Add the chair and mic, or use it as it is.");
    await useLibrarySet(id);
  }

  async function useLibrarySet(id) {
    const e = setById(id);
    if (!e || busy.background) return;
    if (!ensureKey(() => useLibrarySet(id))) return;
    setStatus("status-set", "");
    setBusy("background", "Adding the set from the library…");
    render();
    try {
      const url = await libraryUpload(e.image);
      Object.assign(state, {
        backgroundUrl: url, backgroundSource: "library", backgroundLibraryId: e.id, backgroundChair: null,
        backgroundAspect: e.aspect, backgroundRead: null, sceneInfo: null, libraryId: e.id,
      });
      save();
      setStatus("status-set", `${e.name} is your set.`, "ok");
    } catch (err) {
      setStatus("status-set", err.message, "error");
    } finally {
      setBusy("background", null);
      render();
    }
  }

  async function addChairAndMic() {
    const e = setById(state.libraryId);
    if (!e || busy.background) return;
    if (!ensureKey(addChairAndMic)) return;
    const chair = chairName();
    setStatus("status-set", "");
    setBusy("background", "Adding the chair and mic…");
    render();
    try {
      const src = await libraryUpload(e.image);
      const r = await runJob(
        "imageEdit",
        { prompt: addChairPrompt(chair), image_urls: [src], aspect_ratio: e.aspect, resolution: "2K", output_format: "png", num_images: 1 },
        (st) => { setBusy("background", `Adding the chair and mic, ${describe(st)}…`); renderBusy(); },
      );
      const url = r?.images?.[0]?.url;
      if (!url) throw new Error("No image came back. Please try again.");
      Object.assign(state, {
        backgroundUrl: url, backgroundSource: "library-edited", backgroundLibraryId: e.id, backgroundChair: chair,
        backgroundAspect: e.aspect, backgroundRead: null, sceneInfo: null,
      });
      save();
      setStatus("status-set", "Chair and mic added.", "ok");
    } catch (err) {
      setStatus("status-set", err.message, "error");
    } finally {
      setBusy("background", null);
      render();
    }
  }

  /** Library sets are re-uploaded when their link may have expired (kie.ai keeps uploads for a limited time). */
  async function freshBackgroundUrl() {
    if (state.backgroundSource === "library") {
      const e = setById(state.backgroundLibraryId);
      if (e) {
        const url = await libraryUpload(e.image);
        if (url !== state.backgroundUrl) {
          state.backgroundUrl = url;
          save();
        }
      }
    }
    return state.backgroundUrl;
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
        backgroundUrl: url, backgroundSource: "uploaded", backgroundRead: null, sceneInfo: null, libraryId: null,
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
    const checkLength = (secs) => checkVoiceLength(secs);
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

  /** Throws a plain message when a voice is outside 2 to 30 seconds. */
  function checkVoiceLength(secs, kind = "recording") {
    if (!secs) return;
    const speech = kind === "speech";
    const what = speech ? "The voice" : "This recording";
    if (secs > MAX_AUDIO + 0.2) throw userError(`${what} is ${fmtSec(secs)} long. ${speech ? "Shorten the text and create it again." : `Please trim it to ${MAX_AUDIO} seconds or less.`}`);
    if (secs < MIN_AUDIO) throw userError(`${what} is only ${fmtSec(secs)} long. ${speech ? "Add a few more words and create it again." : `Please use at least ${MIN_AUDIO} seconds.`}`);
  }

  /** The part of a recording from the first to the last sound, with a little air around it. Null if it is all silence. */
  function speechRange(buffer) {
    const data = buffer.getChannelData(0);
    const rate = buffer.sampleRate;
    const win = Math.max(1, Math.round(rate * 0.02));
    let peak = 0;
    for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
    const level = Math.max(0.02, Math.min(0.06, peak * 0.1));
    let first = -1;
    let last = -1;
    for (let w = 0; w < data.length; w += win) {
      const end = Math.min(w + win, data.length);
      for (let i = w; i < end; i++) {
        if (Math.abs(data[i]) > level) {
          if (first < 0) first = w;
          last = end;
          break;
        }
      }
    }
    if (first < 0) return null;
    return [Math.max(0, first - Math.round(rate * 0.25)), Math.min(data.length, last + Math.round(rate * 0.4))];
  }

  /**
   * Turns ElevenLabs timing into transcript chunks, one per phrase, so the cuts can land on pauses. Takes character
   * alignment or a word list, in seconds or milliseconds. Null when there is no usable timing.
   */
  function timingChunks(timing) {
    const al = timing?.characters ? timing : timing?.alignment?.characters ? timing.alignment : null;
    let words = [];
    if (al) {
      const starts = al.character_start_times_seconds || [];
      const ends = al.character_end_times_seconds || [];
      let cur = null;
      al.characters.forEach((ch, i) => {
        const c = String(ch);
        if (!c.trim()) { if (cur) words.push(cur); cur = null; return; }
        cur = cur ? { ...cur, text: cur.text + c, end: Number(ends[i]) } : { text: c, start: Number(starts[i]), end: Number(ends[i]) };
      });
      if (cur) words.push(cur);
    } else {
      const list = Array.isArray(timing) ? timing : Array.isArray(timing?.words) ? timing.words : [];
      words = list.map((w) => ({
        text: String(w?.text ?? w?.word ?? "").trim(),
        start: Number(w?.start ?? w?.start_time ?? w?.start_seconds),
        end: Number(w?.end ?? w?.end_time ?? w?.end_seconds),
      }));
    }
    words = words.filter((w) => w.text && Number.isFinite(w.start) && Number.isFinite(w.end));
    if (!words.length) return null;
    const scale = Math.max(...words.map((w) => w.end)) > 120 ? 1000 : 1; // milliseconds
    const chunks = [];
    let phrase = [];
    for (const w of words) {
      phrase.push(w);
      if (/[.!?,;:…।]$/.test(w.text)) {
        chunks.push({ timestamp: [phrase[0].start / scale, w.end / scale], text: phrase.map((x) => x.text).join(" ") });
        phrase = [];
      }
    }
    if (phrase.length) chunks.push({ timestamp: [phrase[0].start / scale, phrase.at(-1).end / scale], text: phrase.map((x) => x.text).join(" ") });
    return chunks.slice(0, 200);
  }

  /**
   * Makes the voice track from a recording  /**
   * Makes the voice track from a recording made in the app: decoded here, cut to the speech, checked for length and
   * uploaded as a mono WAV, the same as an uploaded MP4.
   */
  async function prepareVoice(blob, { name, fileName }) {
    setStatus("status-voice", "");
    setBusy("audio", "Preparing the voice track…");
    render();
    try {
      let buffer = null;
      try { buffer = await decodeAudio(blob); } catch (err) { console.warn("This browser could not decode the recording:", err); }
      if (!buffer) throw userError("This browser could not prepare the recording. Try Chrome or Safari, or upload an MP4.");
      const range = speechRange(buffer);
      const secs = Math.min(MAX_AUDIO, (range ? range[1] - range[0] : buffer.length) / buffer.sampleRate); // it stops by itself at 30 s
      checkVoiceLength(secs);
      const wav = encodeWav(buffer, MAX_AUDIO, ...(range || []));
      setBusy("audio", "Uploading the voice track…");
      renderBusy();
      const { url } = await uploadFile(new File([wav], `${fileName.replace(/\.[^.]+$/, "")}-voice.wav`, { type: "audio/wav" }));
      state.audio = { url, name, duration: secs, format: "wav", source: "recorded" };
      state.transcript = null;
      save();
      setStatus("status-voice", "Voice track ready. Clip length and camera cuts now follow it.", "ok");
      if (!state.transcript) transcribeAudio();
    } catch (err) {
      setStatus("status-voice", err.message, "error");
    } finally {
      setBusy("audio", null);
      render();
    }
  }

  const recordingSupported = () => Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);

  /** Records the voice with the microphone. It stops by itself at 30 seconds. */
  async function startRecording() {
    if (rec.recorder || busy.audio) return;
    if (!recordingSupported()) return setStatus("status-voice", "This browser cannot record audio. Upload an MP4 instead.", "error");
    if (!ensureKey(startRecording)) return;
    setStatus("status-voice", "");
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch (err) {
      const why = err?.name || "";
      return setStatus("status-voice", /NotAllowed|Security/.test(why)
        ? "The microphone is blocked for this site. Allow it in the browser's site settings, then press Start recording again."
        : /NotFound|Overconstrained/.test(why)
          ? "No microphone was found. Connect one and try again."
          : "The microphone could not be started. Close other apps that use it and try again.", "error");
    }
    const type = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"].find((t) => MediaRecorder.isTypeSupported?.(t));
    let recorder;
    try {
      recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      return setStatus("status-voice", "This browser cannot record audio. Upload an MP4 instead.", "error");
    }
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
    recorder.onstop = () => finishRecording(new Blob(chunks, { type: (recorder.mimeType || type || "audio/webm").split(";")[0] }));
    Object.assign(rec, { recorder, stream, started: Date.now() });
    recorder.start(250);
    rec.timer = setInterval(() => (Date.now() - rec.started >= MAX_AUDIO * 1000 ? stopRecording() : renderRecorder()), 200);
    startLevelMeter(stream);
    render();
  }

  function stopRecording() {
    if (!rec.recorder) return;
    clearInterval(rec.timer);
    stopLevelMeter();
    const { recorder, stream } = rec;
    Object.assign(rec, { recorder: null, stream: null, timer: null });
    setBusy("audio", "Preparing the voice track…"); // until the recorder hands over the last piece
    if (recorder.state !== "inactive") recorder.stop();
    else finishRecording(new Blob([]));
    stream.getTracks().forEach((t) => t.stop());
    render();
  }

  async function finishRecording(blob) {
    if (!blob.size) {
      setBusy("audio", null);
      render();
      return setStatus("status-voice", "Nothing was recorded. Check the microphone and try again.", "error");
    }
    const ext = /mp4/.test(blob.type) ? "m4a" : /ogg/.test(blob.type) ? "ogg" : "webm";
    await prepareVoice(blob, { name: "Recorded in the app", fileName: `recording.${ext}` });
  }

  /** A small live level bar, so the speaker can see the microphone hears them. */
  function startLevelMeter(stream) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      // Some browsers only feed an analyser that reaches the speakers, so it goes through a muted gain.
      const mute = ctx.createGain();
      mute.gain.value = 0;
      ctx.createMediaStreamSource(stream).connect(analyser);
      analyser.connect(mute);
      mute.connect(ctx.destination);
      const data = new Float32Array(analyser.fftSize);
      const bar = $("rec-level-bar");
      const tick = () => {
        if (!rec.meter) return;
        analyser.getFloatTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
        bar.style.width = `${Math.min(100, Math.round(Math.sqrt(sum / data.length) * 400))}%`;
        rec.meter.raf = requestAnimationFrame(tick);
      };
      rec.meter = { ctx, raf: 0 };
      rec.meter.raf = requestAnimationFrame(tick);
      ctx.resume?.();
    } catch {
      rec.meter = null; // the level bar is only a guide
    }
  }

  function stopLevelMeter() {
    if (!rec.meter) return;
    cancelAnimationFrame(rec.meter.raf);
    try { rec.meter.ctx.close(); } catch { /* already closed */ }
    rec.meter = null;
    $("rec-level-bar").style.width = "0%";
  }

  /** Rough speaking time of typed words, so a text that cannot fit one clip is caught before credits are spent. */
  function speechSeconds(text) {
    const words = (text.match(/\S+/g) || []).length;
    const stops = (text.match(/[.!?।]+/g) || []).length;
    return words / TTS_WORDS_PER_SEC + stops * 0.3;
  }

  /** The library voice in use: the chosen one, or the default for the Speaker (a woman gets a female voice). */
  function ttsLibraryVoice() {
    const list = library.voices;
    const chosen = list.find((v) => v.id === state.ttsVoice);
    if (chosen) return chosen;
    const gender = state.speaker === "woman" ? "female" : "male";
    const same = list.filter((v) => v.gender === gender);
    return same.find((v) => v.default) || same[0] || list[0];
  }
  const customVoiceId = () => (VOICE_ID.test((state.ttsCustomVoice || "").trim()) ? state.ttsCustomVoice.trim() : null);
  /** { name, voiceId } to speak with: a pasted voice ID wins over the list. */
  const ttsVoice = () => (customVoiceId() ? { name: "Your ElevenLabs voice", voiceId: customVoiceId() } : ttsLibraryVoice());

  /** Speaks the typed words with an ElevenLabs voice on the chosen provider (uses its credits, only on the button). */
  async function createSpeech() {
    if (busy.audio || rec.recorder) return;
    const text = (state.ttsText || "").trim();
    if (!text) return setStatus("status-voice", "Type what the architect should say first.", "error");
    const est = speechSeconds(text);
    if (est > MAX_AUDIO) return setStatus("status-voice", `This text takes about ${Math.round(est)} seconds to say. One clip is at most ${MAX_AUDIO} seconds, so please shorten it.`, "error");
    if (est < MIN_AUDIO) return setStatus("status-voice", `This text takes only about ${est.toFixed(1)} seconds to say. A clip needs at least ${MIN_AUDIO} seconds, so add a few words.`, "error");
    if (!ensureKey(createSpeech)) return;
    if ((state.ttsCustomVoice || "").trim() && !customVoiceId()) {
      return setStatus("status-voice", "That voice ID does not look right. Copy the ID from the voice in ElevenLabs (letters and numbers only), or clear the box.", "error");
    }
    const voice = ttsVoice();
    const kind = (TTS_MODELS[state.ttsModel] || TTS_MODELS.multilingual).kind;
    setStatus("status-voice", "");
    setBusy("audio", `Creating the voice on ${PROVIDERS[state.provider]}…`);
    render();
    try {
      const r = await runJob(kind, { text, voice: voice.voiceId, timestamps: true }, null, 1500);
      const url = r?.audio?.url || (typeof r?.audio === "string" ? r.audio : null);
      if (!url) throw new Error("No audio came back. Please try again.");
      const chunks = timingChunks(r?.timestamps);
      const secs = (await videoElementInfo(url))?.duration || (chunks ? chunks.at(-1).timestamp[1] : null);
      checkVoiceLength(secs, "speech");
      state.audio = { url, name: `${voice.name} · ElevenLabs`, duration: secs || null, format: "mp3", source: "tts", text };
      state.transcript = chunks ? { for: url, text, chunks, language: null } : null;
      save();
      setStatus("status-voice", "Voice track ready. Clip length and camera cuts now follow it.", "ok");
      if (!state.transcript) transcribeAudio();
    } catch (err) {
      setStatus("status-voice", err.userFacing ? err.message : `The voice could not be created. ${err.message}`, "error");
    } finally {
      setBusy("audio", null);
      render();
    }
  }

  /** Length, size and frame rate of a clip: from the file header, or from the browser when the header cannot be read. */
  async function clipInfo(file) {
    let info = null;
    try { info = await mp4Info(file); } catch { info = null; }
    if (!info || !info.width || !info.duration) {
      const el = await videoElementInfo(file);
      info = { ...(el || {}), ...Object.fromEntries(Object.entries(info || {}).filter(([, v]) => v)) };
    }
    return info;
  }

  /** Reading a script always runs on fal.ai (Whisper), also when videos are made on kie.ai. */
  function needFalForScript(action) {
    pendingKeyAction = action;
    openKeyPanel("Reading a script uses fal.ai, also when videos are made on kie.ai. Add a fal.ai key and the script is read straight away.");
    setStatus("status-ref", "Add a fal.ai key in the key panel to read the script.", "error");
  }

  /**
   * Adds a reference clip. To copy its performance, it must meet Seedance's limits and is uploaded to the video
   * provider. To use its script, only its sound is taken out and read, so any size and frame rate is fine.
   */
  async function onRefVideo(file) {
    const ok = /\.(mp4|mov)$/i.test(file.name || "") || /^video\/(mp4|quicktime)$/.test(file.type);
    if (!ok) return setStatus("status-ref", "Please use an MP4 or MOV video.", "error");
    if (!state.refRights) return setStatus("status-ref", "Please confirm you have the right to use this clip first.", "error");
    if (busy.ref) return setStatus("status-ref", "Please wait for the current step to finish.", "error");
    const forScript = state.refMode === "script";
    if (file.size > (forScript ? SCRIPT_MAX_BYTES : MAX_UPLOAD_BYTES)) {
      return setStatus("status-ref", forScript
        ? "This clip is larger than 250 MB. Export a smaller copy and try again."
        : "This clip is larger than 90 MB. Export it at 720p, 30 seconds or less, and try again.", "error");
    }
    if (forScript && !falReady()) return needFalForScript(() => onRefVideo(file));
    if (!forScript && !ensureKey(() => onRefVideo(file))) return;
    setStatus("status-ref", "");
    setBusy("ref", "Checking the clip…");
    render();
    let readScript = false;
    try {
      const info = await clipInfo(file);
      const problem = refProblem(info, forScript);
      if (problem) throw userError(problem);
      const clip = {
        id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: file.name || "reference.mp4", size: file.size,
        duration: info.duration || null, width: info.width || null, height: info.height || null, fps: info.fps || null,
      };
      if (!forScript) {
        setBusy("ref", "Uploading the clip…");
        renderBusy();
        Object.assign(clip, { url: (await uploadFile(file)).url, provider: state.provider, at: Date.now() });
      }
      if (refFile?.preview) URL.revokeObjectURL(refFile.preview);
      refFile = { id: clip.id, file, preview: forScript ? URL.createObjectURL(file) : null };
      state.refVideo = clip;
      state.refScript = null;
      save();
      setStatus("status-ref", forScript ? "Clip added." : "Reference clip ready.", "ok");
      readScript = forScript;
    } catch (err) {
      setStatus("status-ref", err.message, "error");
    } finally {
      setBusy("ref", null);
      render();
    }
    if (readScript) readRefScript();
  }

  /** Takes the sound out of a clip as a small WAV on fal.ai storage. Null when this browser cannot decode it. */
  async function clipSoundUrl(file) {
    let wav;
    try {
      wav = encodeWav(await decodeAudio(file), SCRIPT_MAX_SEC + 1);
    } catch (err) {
      console.warn("Could not take the sound out of the clip in the browser:", err);
      return null;
    }
    const base = (file.name || "reference").replace(/\.[^.]+$/, "");
    return (await uploadFile(new File([wav], `${base}-sound.wav`, { type: "audio/wav" }), "fal")).url;
  }

  /** Transcribes the reference clip so the architect can record the same words in their own voice. */
  async function readRefScript() {
    const rv = state.refVideo;
    if (!rv || busy.ref) return;
    if (!falReady()) return needFalForScript(readRefScript);
    const id = rv.id;
    const file = refFile?.id === id ? refFile.file : null;
    setStatus("status-ref", "");
    setBusy("ref", "Taking the sound out of the clip…");
    render();
    try {
      let url = rv.audioUrl || (file && (await clipSoundUrl(file))) || rv.url || null;
      if (!url && file && file.size <= MAX_UPLOAD_BYTES) url = (await uploadFile(file, "fal")).url;
      if (!url) throw userError("This browser could not read the sound in this clip. Export it as an MP4 and add it again.");
      if (state.refVideo?.id !== id) return;
      state.refVideo.audioUrl = url;
      setBusy("ref", "Reading the script…");
      renderBusy();
      const r = await runJob("transcribe", { audio_url: url, task: "transcribe", chunk_level: "segment" }, null, 1200);
      if (state.refVideo?.id !== id) return;
      const text = String(r?.text || "").trim();
      state.refScript = text ? { for: id, text, language: r?.inferred_languages?.[0] || null } : { for: id, failed: true };
      save();
      const long = rv.duration > MAX_AUDIO + 0.2;
      setStatus("status-ref", !text
        ? "No speech was found in this clip."
        : long
          ? `Script ready. One clip is at most ${MAX_AUDIO} seconds, so record the part you need in step 4, in the architect's own voice.`
          : "Script ready. Record it in the architect's own voice in step 4.", text ? "ok" : "error");
    } catch (err) {
      if (state.refVideo?.id === id) {
        state.refScript = { for: id, failed: true };
        delete state.refVideo.audioUrl; // a retry takes the sound out again
      }
      save();
      setStatus("status-ref", err.userFacing ? err.message : `The script could not be read. ${err.message}`, "error");
    } finally {
      setBusy("ref", null);
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
      const refNote = refActive() ? " The reference video can also cause this: use a clip without an identifiable face." : "";
      return `Seedance 2.5 refused the inputs because they show a real person's face.${refNote} ` +
        "Seedance only accepts real people through ByteDance's verified-portrait programme, so trying again with the same sheet will fail the same way. " +
        `${route} Details: ${m}`;
    }
    if (/video_urls/i.test(m)) return `The video model could not read the reference video. Add it again in step 3, or switch the reference off. Details: ${m}`;
    if (/audio_urls/i.test(m)) return `The video model could not read the voice track. Please add the recording again in step 4. Details: ${m}`;
    if (/image_urls/i.test(m)) return `The video model could not read one of the images. Try adding it again as a JPG or PNG. Details: ${m}`;
    return m;
  }

  const characterInput = () => assetRef() || state.characterUrl;

  async function createEpisode() {
    if (!(characterInput() && state.backgroundUrl && state.audio?.url) || busy.video) return;
    if (state.refMode === "performance" && !refActive()) {
      return setStatus("status-video", "Add the reference clip in step 3 (and tick the rights box), or switch the reference off.", "error");
    }
    if (!ensureKey(createEpisode)) return;
    setStatus("status-video", "");
    setBusy("video", "Finishing the prompt…", "prompt");
    render();
    try {
      refreshAnalyses();
      await Promise.allSettled(Object.values(pending).filter(Boolean));
      const D = clipDuration();
      const aspect = state.backgroundAspect || FORMATS[state.format].aspect;
      const images = [characterInput(), await freshBackgroundUrl()];
      const plan = outfitPlan();
      if (plan.mode === "override" && plan.image) {
        setBusy("video", "Adding the outfit reference…", "prompt");
        renderProgress();
        images.push(await libraryUpload(plan.image));
      }
      // The rights box can be unticked while the prompt is being finished.
      if (state.refMode === "performance" && !refActive()) {
        throw userError("Add the reference clip in step 3 (and tick the rights box), or switch the reference off.");
      }
      const ref = refActive();
      if (ref) {
        const r = state.refVideo;
        if (r.provider !== state.provider || Date.now() - r.at > UPLOAD_TTL[state.provider]) {
          throw userError("The reference clip's upload has expired or belongs to the other provider. Please add it again in step 3.");
        }
      }
      const input = {
        prompt: promptFor("video"),
        image_urls: images,
        ...(ref ? { video_urls: [state.refVideo.url] } : {}),
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
    if (box.dataset.keys) return;
    box.dataset.keys = "1";
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

  let outfitGridKey = "";
  let setGridKey = "";

  function renderSetLibrary() {
    const key = JSON.stringify(library.sets.map((x) => [x.id, x.thumb, x.name, x.hasChairAndMic]));
    if (key !== setGridKey) {
      setGridKey = key;
      const grid = $("set-grid");
      grid.innerHTML = "";
      for (const e of library.sets) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "set-card";
        b.setAttribute("role", "radio");
        b.dataset.value = e.id;
        const v = document.createElement("span");
        v.className = "set-thumb";
        const img = document.createElement("img");
        img.src = e.thumb;
        img.alt = "";
        img.loading = "lazy";
        v.appendChild(img);
        const t = document.createElement("span");
        t.className = "set-text";
        const n = document.createElement("b");
        n.textContent = e.name;
        const badge = document.createElement("small");
        badge.className = `set-badge ${e.hasChairAndMic ? "is-ready" : "is-room"}`;
        badge.textContent = e.hasChairAndMic ? "Chair and mic" : "Room only";
        t.append(n, badge);
        b.append(v, t);
        b.addEventListener("click", () => onLibraryPick(e.id));
        grid.appendChild(b);
      }
    }
    for (const b of $("set-grid").querySelectorAll(".set-card")) {
      const on = b.dataset.value === state.libraryId;
      b.setAttribute("aria-checked", String(on));
      b.tabIndex = on || (!state.libraryId && b === b.parentElement.firstElementChild) ? 0 : -1;
      b.disabled = Boolean(busy.background);
      b.classList.toggle("is-used", isLibrarySource() && state.backgroundLibraryId === b.dataset.value);
    }
    $("set-library-empty").hidden = !library.loaded || library.sets.length > 0;
    const picked = setById(state.libraryId);
    const roomPending = Boolean(picked && !picked.hasChairAndMic && state.setMode === "library");
    $("room-actions").hidden = !roomPending;
    if (roomPending) {
      const chairId = state.chair === "auto" ? SET_STYLES[state.setStyle].chair : state.chair;
      updateChips("chips-chair-lib", chairId, Boolean(busy.background));
      const added = state.backgroundSource === "library-edited" && state.backgroundLibraryId === picked.id;
      $("btn-add-chair").textContent = added ? "Add them again" : "Add chair and mic";
      $("btn-add-chair").disabled = Boolean(busy.background);
      $("btn-use-room").disabled = Boolean(busy.background);
    }
  }

  function visibleOutfits() {
    return library.outfits.filter((o) => o.for.includes(state.speaker) || o.id === state.outfitId);
  }

  function outfitVisual(o) {
    const v = document.createElement("span");
    v.className = "outfit-visual";
    if (o.image) {
      const img = document.createElement("img");
      img.src = o.image;
      img.alt = "";
      img.loading = "lazy";
      v.appendChild(img);
    } else if (o.fromPhoto) {
      v.classList.add("is-icon");
      v.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';
    } else if (o.colors?.length) {
      v.classList.add("is-swatch");
      for (const c of o.colors) {
        const band = document.createElement("i");
        band.style.background = c;
        v.appendChild(band);
      }
    } else {
      v.classList.add("is-icon");
    }
    return v;
  }

  function outfitCard(id, name, sub, visual) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "outfit-card";
    b.setAttribute("role", "radio");
    b.dataset.value = id;
    b.appendChild(visual);
    const t = document.createElement("span");
    t.className = "outfit-text";
    const n = document.createElement("b");
    n.textContent = name;
    const m = document.createElement("small");
    m.textContent = sub;
    t.append(n, m);
    b.appendChild(t);
    b.addEventListener("click", () => {
      const next = id === "__default" ? null : id;
      if (state.outfitId === next) return;
      state.outfitId = next;
      state.look = sheetOutfit().id;
      save();
      render();
    });
    return b;
  }

  /** Rebuilds the outfit grid when the library, speaker or filter changes; otherwise only updates the selection. */
  function renderOutfits() {
    const list = visibleOutfits();
    const cats = [...new Set(list.map((o) => o.category))];
    if (state.outfitCategory !== "all" && !cats.includes(state.outfitCategory)) state.outfitCategory = "all";
    const shown = list.filter((o) => state.outfitCategory === "all" || o.category === state.outfitCategory);
    const key = JSON.stringify([state.speaker, state.outfitCategory, shown.map((o) => o.id), defaultOutfit().id, cats]);
    if (key !== outfitGridKey) {
      outfitGridKey = key;
      const filters = $("outfit-filters");
      filters.innerHTML = "";
      filters.hidden = cats.length < 2;
      for (const c of ["all", ...cats]) {
        const f = document.createElement("button");
        f.type = "button";
        f.className = "filter-chip";
        f.dataset.value = c;
        f.textContent = c === "all" ? "All" : c;
        f.addEventListener("click", () => {
          state.outfitCategory = c;
          save();
          render();
        });
        filters.appendChild(f);
      }
      const grid = $("outfit-grid");
      grid.innerHTML = "";
      const dv = document.createElement("span");
      dv.className = "outfit-visual is-default";
      dv.textContent = "Auto";
      grid.appendChild(outfitCard("__default", "Default", `Uses ${defaultOutfit().name}`, dv));
      for (const o of shown) grid.appendChild(outfitCard(o.id, o.name, o.hint || o.category, outfitVisual(o)));
    }
    for (const f of $("outfit-filters").querySelectorAll(".filter-chip")) f.setAttribute("aria-pressed", String(f.dataset.value === state.outfitCategory));
    const selected = state.outfitId || "__default";
    for (const b of $("outfit-grid").querySelectorAll(".outfit-card")) {
      const on = b.dataset.value === selected;
      b.setAttribute("aria-checked", String(on));
      b.tabIndex = on ? 0 : -1;
      b.disabled = Boolean(busy.character);
    }
    $("outfit-count").textContent = `${library.outfits.length} in the library`;

    // Explain what the video will do when the sheet and the chosen outfit differ.
    const plan = outfitPlan();
    let note = "";
    let canRecreate = false;
    if (plan.mode === "override" && (state.characterUrl || assetRef())) {
      const how = plan.image ? "using its photo as a reference" : "from its description";
      if (assetRef()) note = `The video dresses the verified portrait in ${plan.outfit.name}, ${how}.`;
      else if (state.characterSource === "generated") {
        note = `The sheet was made with ${outfitById(state.characterLook)?.name || "another outfit"}. The video dresses the architect in ${plan.outfit.name}, ${how}.`;
        canRecreate = Boolean(state.selfieUrl);
      } else {
        note = `The video dresses the architect in ${plan.outfit.name} instead of the clothes on the sheet, ${how}.`;
        canRecreate = Boolean(state.selfieUrl);
      }
    }
    $("outfit-notice").textContent = note;
    $("outfit-notice").hidden = !note;
    $("outfit-actions").hidden = !canRecreate;
    $("btn-recreate-outfit").disabled = Boolean(busy.character);
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

  function renderRecorder() {
    const on = Boolean(rec.recorder);
    const btn = $("btn-record");
    btn.classList.toggle("is-recording", on);
    btn.querySelector(".rec-label").textContent = on ? "Stop recording" : state.audio?.source === "recorded" ? "Record again" : "Start recording";
    btn.disabled = !on && Boolean(busy.audio);
    $("rec-meter").hidden = !on;
    if (on) {
      const secs = Math.min(MAX_AUDIO, Math.floor((Date.now() - rec.started) / 1000));
      $("rec-time").textContent = `0:${String(secs).padStart(2, "0")} / 0:${MAX_AUDIO}`;
    }
  }

  function renderTts() {
    const ta = $("tts-text");
    if (document.activeElement !== ta && ta.value !== state.ttsText) ta.value = state.ttsText;
    const text = (state.ttsText || "").trim();
    const est = text ? speechSeconds(text) : 0;
    const words = (text.match(/\S+/g) || []).length;
    const fit = Math.floor(MAX_AUDIO * TTS_WORDS_PER_SEC * 0.95);
    const long = est > MAX_AUDIO;
    const short = Boolean(text) && est < MIN_AUDIO;
    $("tts-estimate").textContent = !text
      ? `Type the exact words. About ${fit} words fit in ${MAX_AUDIO} seconds.`
      : long
        ? `About ${Math.round(est)} seconds (${words} words): too long for one clip. Shorten it to about ${fit} words.`
        : short ? `About ${est.toFixed(1)} seconds: add a few more words.` : `About ${Math.round(est)} seconds · ${words} words`;
    $("tts-estimate").classList.toggle("is-warn", long || short);

    const sel = $("tts-voice");
    const listKey = library.voices.map((v) => v.id).join(",");
    if (sel.dataset.key !== listKey) {
      sel.dataset.key = listKey;
      sel.innerHTML = "";
      for (const [group, label] of Object.entries(TTS_VOICE_GROUPS)) {
        const voicesInGroup = library.voices.filter((v) => v.gender === group);
        if (!voicesInGroup.length) continue;
        const og = document.createElement("optgroup");
        og.label = label;
        for (const v of voicesInGroup) og.appendChild(new Option(v.hint ? `${v.name} · ${v.hint}` : v.name, v.id));
        sel.appendChild(og);
      }
    }
    const libVoice = ttsLibraryVoice();
    if (libVoice && sel.value !== libVoice.id) sel.value = libVoice.id;
    const custom = $("tts-custom-voice");
    if (document.activeElement !== custom && custom.value !== state.ttsCustomVoice) custom.value = state.ttsCustomVoice;
    sel.disabled = Boolean(busy.audio) || Boolean(customVoiceId());
    $("tts-credits").textContent = `Uses ${PROVIDERS[state.provider]} credits, with the key you already added. Nothing is created until you press Create voice.`;
    updateChips("chips-tts-model", state.ttsModel, Boolean(busy.audio));
    $("btn-tts").disabled = Boolean(busy.audio) || Boolean(rec.recorder) || !text;
    $("btn-tts").textContent = state.audio?.source === "tts" && state.audio.text === text ? "Create again" : "Create voice";
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
    const map = { character: "busy-character", background: "busy-set", ref: "busy-ref", audio: "busy-voice" };
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
    renderOutfits();
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
    // Only fall back from the Library tab once the library has finished loading and is really empty.
    const noLibrary = library.loaded && !library.sets.length;
    if (noLibrary && state.setMode === "library") state.setMode = state.backgroundSource === "generated" ? "create" : "upload";
    $("tab-set-library").hidden = noLibrary;
    $("set-tabs").classList.toggle("segmented-3", !noLibrary);
    renderTabs("setMode", { library: "panel-set-library", upload: "panel-set-upload", create: "panel-set-create" });
    const createSet = state.setMode === "create";
    const libMode = state.setMode === "library";
    renderSetLibrary();
    const setBusyNow = Boolean(busy.background);
    updateChips("chips-style", state.setStyle, setBusyNow);
    updateChips("chips-chair", state.chair, setBusyNow);
    updateChips("chips-light", state.light, setBusyNow);
    updateChips("chips-framing", state.framing, setBusyNow);
    updateChips("chips-format", state.format, setBusyNow);
    $("opt-reference").checked = state.useReference;
    $("reference-row").hidden = Boolean(FRAMINGS[state.framing].noRoomRef);
    $("opt-reference").disabled = setBusyNow;
    // In the Library tab, a picked room that is not in use yet is previewed from the library file.
    const pickedSet = libMode ? setById(state.libraryId) : null;
    const pendingSet = pickedSet && !(isLibrarySource() && state.backgroundLibraryId === pickedSet.id) ? pickedSet : null;
    const setPreview = pendingSet ? pendingSet.image : setDisplayUrl();
    setImg($("img-set"), setPreview);
    $("drop-set").hidden = Boolean(setPreview) || state.setMode !== "upload";
    $("ph-set").hidden = Boolean(setPreview) || !createSet;
    $("ph-set-library").hidden = Boolean(setPreview) || !libMode;
    const closeFraming = Boolean(FRAMINGS[state.framing].noRoomRef);
    $("ph-set").classList.toggle("placeholder-ref", !closeFraming);
    $("ph-set").querySelector("img").hidden = closeFraming;
    $("ph-set").querySelector("p").innerHTML = closeFraming
      ? "<b>Talking-head framing</b>Your set appears here after you press Create."
      : "<b>Framing reference</b>Your set appears here after you press Create.";
    const setAspect = pendingSet ? pendingSet.aspect : state.backgroundUrl ? state.backgroundAspect : createSet ? FORMATS[state.format].aspect : "9:16";
    $("media-set").classList.toggle("media-tall", isPortrait(setAspect));
    $("media-set").classList.toggle("media-wide", !isPortrait(setAspect));
    const btnSet = $("btn-set");
    btnSet.disabled = setBusyNow;
    btnSet.textContent = state.backgroundSource === "generated" && state.backgroundUrl ? "Create again" : "Create studio set";
    $("btn-own-set").disabled = setBusyNow;
    $("btn-own-set").textContent = state.backgroundUrl && state.backgroundSource === "uploaded" ? "Replace set image" : "Choose set image";
    renderPromptBox("set");

    // ---- Step 3: reference video (optional) ----
    const rv = state.refVideo;
    const refOn = state.refMode !== "off";
    const scriptMode = state.refMode === "script";
    // The clip this mode can use: any clip for a script, an uploaded one for copying the performance.
    const clip = !refOn || !rv ? null : scriptMode || rv.url ? rv : null;
    const preview = clip && (clip.url || (refFile?.id === clip.id ? refFile.preview : null));
    updateChips("chips-refmode", state.refMode, Boolean(busy.ref) || Boolean(busy.video));
    $("ref-body").hidden = !refOn;
    $("ref-face-note").hidden = state.refMode !== "performance";
    $("opt-ref-rights").checked = Boolean(state.refRights);
    $("btn-choose-ref").disabled = Boolean(busy.ref) || !state.refRights;
    $("btn-choose-ref").textContent = clip ? "Replace reference video" : "Choose reference video";
    $("ref-limits").textContent = scriptMode
      ? "MP4 or MOV · up to 3 minutes · any size. Only the sound is used, to read the words."
      : "MP4 or MOV · 2 to 30 seconds · 24 to 60 fps · 480p to 720p (for example 720 × 1280) · up to 90 MB";
    $("ph-ref").hidden = refOn;
    $("drop-ref").hidden = !refOn || Boolean(preview);
    const refEl = $("ref-video");
    refEl.hidden = !preview;
    if (preview && refEl.getAttribute("src") !== preview) refEl.src = preview;
    if (!preview && refEl.hasAttribute("src")) { refEl.removeAttribute("src"); refEl.load(); }
    $("ref-meta").textContent = clip
      ? [clip.name, clip.duration ? fmtSec(clip.duration) : null, clip.width && clip.height ? `${clip.width} × ${clip.height}` : null, clip.fps ? `${Math.round(clip.fps)} fps` : null].filter(Boolean).join(" · ")
      : refOn && rv ? `${rv.name} was added for its script only. Add it again to copy its performance.` : "";
    $("ref-meta").hidden = !$("ref-meta").textContent;
    const refScript = clip && state.refScript?.for === clip.id ? state.refScript : null;
    $("ref-script-box").hidden = !scriptMode || !clip;
    if (scriptMode && clip) {
      const ta2 = $("ref-script");
      const t = refScript?.text || "";
      if (ta2.value !== t) ta2.value = t;
      ta2.placeholder = refScript?.failed ? "No script could be read from this clip." : falReady() ? "Press Read the script." : "Add a fal.ai key in the key panel to read the script.";
      $("btn-read-script").hidden = Boolean(refScript?.text);
      $("btn-read-script").disabled = Boolean(busy.ref);
      $("btn-copy-script").hidden = !refScript?.text;
      $("btn-script-to-voice").hidden = !refScript?.text;
    }

    // ---- Step 4: voice ----
    const a = state.audio;
    const recording = Boolean(rec.recorder);
    renderTabs("voiceMode", { upload: "panel-voice-upload", record: "panel-voice-record", tts: "panel-voice-tts" });
    for (const tab of $("voice-tabs").children) tab.disabled = recording && tab.dataset.mode !== "record";
    $("drop-voice").hidden = Boolean(a) || state.voiceMode !== "upload";
    $("ph-voice").hidden = Boolean(a) || state.voiceMode === "upload";
    $("voice-panel").hidden = !a;
    $("btn-choose-voice").disabled = Boolean(busy.audio) || recording;
    $("btn-choose-voice").textContent = a ? "Replace recording" : "Choose MP4";
    renderRecorder();
    renderTts();
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

    // ---- Step 5: episode ----
    updateChips("chips-quality", state.quality, Boolean(busy.video));
    updateChips("chips-camera", state.camera, Boolean(busy.video) || refActive());
    $("camera-hint").hidden = !refActive();
    $("ing-ref").hidden = state.refMode !== "performance";
    if (state.refMode === "performance") {
      setIngredient("ing-ref", refActive()
        ? { text: `${rv.name}, copying its movement and camera`, stateClass: "is-done" }
        : { text: rv?.url ? "Tick the rights box in step 3" : "Waiting for the reference clip", stateClass: busy.ref ? "is-busy" : "is-wait" });
    }
    const ch = characterDetails();
    const sc = sceneDetails();
    const D = clipDuration();
    const cuts = currentCuts();

    const oPlan = outfitPlan();
    const outfitNote = oPlan.mode === "override" ? `, wearing ${oPlan.outfit.name}` : "";
    setIngredient("ing-character", assetRef() && !state.characterUrl
      ? { thumb: null, text: `Verified portrait ${assetRef()}${outfitNote}`, stateClass: "is-done" }
      : !state.characterUrl
      ? { thumb: null, text: "Waiting for the character sheet", stateClass: busy.character ? "is-busy" : "is-wait" }
      : pending.character
        ? { thumb: state.characterUrl, text: "Reading the face and outfit…", stateClass: "is-busy" }
        : oPlan.mode !== "sheet"
          ? { thumb: state.characterUrl, text: oPlan.mode === "override" ? `Face from the sheet${outfitNote}` : `Outfit: ${oPlan.outfit.name}`, stateClass: "is-done" }
        : ch.source === "analysis"
          ? { thumb: state.characterUrl, text: ch.outfit ? `Outfit read from the sheet: ${ch.outfit}` : "Face and outfit read from the sheet", stateClass: "is-done" }
          : ch.source === "preset"
            ? { thumb: state.characterUrl, text: `Outfit: ${outfitById(state.characterLook)?.name || "chosen look"}`, stateClass: "is-done" }
            : { thumb: state.characterUrl, text: "Described in general terms. The sheet could not be read.", stateClass: "is-warn" });

    setIngredient("ing-set", !state.backgroundUrl
      ? { thumb: null, text: "Waiting for the studio set", stateClass: busy.background ? "is-busy" : "is-wait" }
      : pending.scene
        ? { thumb: state.backgroundUrl, text: "Reading the seat, props and light…", stateClass: "is-busy" }
        : sc.source === "library"
          ? { thumb: setDisplayUrl(), text: `From the library: ${sc.name}${state.backgroundSource === "library-edited" ? ", chair and mic added" : ""}`, stateClass: "is-done" }
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
        : { text: state.camera === "cuts" ? `${D || "?"}s clip, cuts at ${cutText}${cuts.snapped ? ", on natural pauses" : ""}` : `${D || "?"}s clip, one still camera`, stateClass: "is-done" });

    $("fact-length").textContent = D ? `${D} seconds` : "Follows the recording";
    $("fact-format").textContent = ASPECTS[state.backgroundAspect || FORMATS[state.format].aspect];

    const missing = [
      !characterInput() && "character sheet",
      !state.backgroundUrl && "studio set",
      state.refMode === "performance" && !refActive() && "reference clip (or switch it off)",
      !a && "voice recording",
    ].filter(Boolean);
    const otherBusy = busy.character || busy.background || busy.ref || busy.audio;
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
      busy.background ? "Working…" : state.backgroundUrl ? "Ready" : library.sets.length ? "Pick, upload or create" : "Upload or create");
    const refDone = scriptMode ? Boolean(refScript?.text) : refActive();
    renderStep("ref",
      busy.ref ? "is-busy" : !refOn ? "" : refDone ? "is-done" : "is-next",
      busy.ref ? "Working…" : !refOn ? "Optional" : refDone ? (scriptMode ? "Script ready" : "Copying performance") : clip ? (scriptMode ? "Read the script" : "Tick the rights box") : "Add a clip");
    renderStep("voice",
      busy.audio ? "is-busy" : a ? "is-done" : state.characterUrl && state.backgroundUrl ? "is-next" : "",
      busy.audio ? "Preparing…" : rec.recorder ? "Recording…" : a ? fmtSec(audioSeconds()) : "Add the voice");
    renderStep("episode",
      busy.video ? "is-busy" : r ? "is-done" : ready ? "is-next" : "",
      busy.video ? "Generating…" : r ? "Clip ready" : ready ? "Ready to create" : "Waiting");
  }

  // ===========================================================================
  // Key panel
  // ===========================================================================

  function openKeyPanel(message) {
    clearTimeout(keyCloseTimer); // a step that needs another key can reopen the panel right after a save
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
    buildChips("chips-style", SET_STYLES, "setStyle");
    buildChips("chips-chair", CHAIRS, "chair");
    buildChips("chips-light", LIGHTS, "light");
    buildChips("chips-framing", FRAMINGS, "framing");
    buildChips("chips-format", FORMATS, "format");
    buildChips("chips-quality", QUALITIES, "quality");
    buildChips("chips-camera", CAMERAS, "camera");

    for (const tab of document.querySelectorAll(".segmented button")) {
      tab.addEventListener("click", () => {
        state[tab.dataset.group] = tab.dataset.mode;
        save();
        render();
      });
      tab.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        const tabs = [...tab.parentElement.children].filter((b) => !b.hidden);
        const i = tabs.indexOf(tab);
        const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
        next.focus();
        next.click();
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
    $("btn-recreate-outfit").addEventListener("click", () => {
      state.characterMode = "create";
      save();
      generateCharacter();
    });
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
    const libChairs = {};
    for (const [id, c] of Object.entries(CHAIRS)) if (id !== "auto") libChairs[id] = c;
    buildChips("chips-chair-lib", libChairs, "chair");
    $("btn-add-chair").addEventListener("click", addChairAndMic);
    $("btn-use-room").addEventListener("click", () => useLibrarySet(state.libraryId));
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

    // Step 3: reference video
    buildChips("chips-refmode", REF_MODES, "refMode");
    bindFileInput($("file-ref"), onRefVideo);
    bindDrop($("drop-ref"), $("file-ref"), onRefVideo, { target: $("media-ref"), enabled: () => state.refMode !== "off" });
    $("btn-choose-ref").addEventListener("click", () => $("file-ref").click());
    $("opt-ref-rights").addEventListener("change", (e) => {
      state.refRights = e.target.checked;
      save();
      render();
    });
    $("btn-read-script").addEventListener("click", readRefScript);
    $("btn-script-to-voice").addEventListener("click", () => {
      const t = $("ref-script").value.trim();
      if (!t) return;
      state.ttsText = t;
      state.voiceMode = "tts";
      save();
      render();
      $("step-voice").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    $("btn-copy-script").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText($("ref-script").value);
        $("btn-copy-script").textContent = "Copied";
      } catch {
        $("ref-script").select();
        $("btn-copy-script").textContent = "Press Ctrl+C";
      }
      setTimeout(() => { $("btn-copy-script").textContent = "Copy script"; }, 1600);
    });

    // Step 4: voice
    bindFileInput($("file-voice"), onAudio);
    bindDrop($("drop-voice"), $("file-voice"), onAudio, { target: $("media-voice"), enabled: () => state.voiceMode === "upload" });
    $("btn-choose-voice").addEventListener("click", () => $("file-voice").click());
    $("btn-record").addEventListener("click", () => (rec.recorder ? stopRecording() : startRecording()));
    buildChips("chips-tts-model", TTS_MODELS, "ttsModel");
    $("tts-text").addEventListener("input", (e) => {
      state.ttsText = e.target.value;
      save();
      renderTts();
    });
    $("tts-custom-voice").addEventListener("input", (e) => {
      state.ttsCustomVoice = e.target.value.trim();
      save();
      renderTts();
    });
    $("tts-voice").addEventListener("change", (e) => {
      if (!library.voices.some((v) => v.id === e.target.value)) return;
      state.ttsVoice = e.target.value;
      save();
      render();
    });
    $("btn-tts").addEventListener("click", createSpeech);

    // Step 5: episode
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
      keyCloseTimer = setTimeout(closeKeyPanel, 700);
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
      if (busy.character || busy.background || busy.ref || busy.audio || rec.recorder) {
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
  loadLibrary().then(() => {
    save();
    render();
  });
  writeKey("architect-podcast-studio:elevenlabs-key", ""); // no longer used: speech runs on kie.ai or fal.ai
  detectBackend().then(() => {
    render();
    if (!hasCredentials()) openKeyPanel();
    if (state.videoJob) followVideo();
    refreshAnalyses();
  });
})();
