/* AI Avatar Studio – front-end logic (no build step, no dependencies). */
(() => {
  "use strict";

  // ---------------------------------------------------------------------------
  // Default prompts (from the AI Avatar Prompt Guide by @tusharx.ai)
  // ---------------------------------------------------------------------------
  const PROMPTS = {
    character:
      "Use my uploaded photo for the face. Create one wide 16:9 image on a plain white background. " +
      "LEFT side: close-up studio portrait of this exact man, same face, hair, beard and skin tone. " +
      "RIGHT side: his full outfit as a ghost mannequin: black cable-knit long-sleeve polo sweater with silver quarter-zip, " +
      "dark olive cargo pants, white chunky sneakers, black wristwatch. Photorealistic, no text.",
    background:
      "Vertical 9:16 photo of an empty cozy podcast studio. Brown velvet curtains, warm amber floor uplighting, " +
      "cream boucle swivel armchair in the center, black podcast mic on a boom arm stand, glowing floor lamp, tall palm plant, " +
      "wooden side cabinet, wooden floor, beige jute rug. No people. Photorealistic, cinematic warm light.",
    video: (d) =>
      "@Image1 defines the man's face, hair, beard, skin tone and full outfit. Face from the left side, outfit from the right side. " +
      "Only this one man. Do not use the white background of @Image1.\n\n" +
      "@Image2 defines the scene. Keep the podcast studio layout, furniture and lighting exactly as in @Image2.\n\n" +
      "@Video1 defines only the audio. Use it exactly as provided as the only audio track. The man lip-syncs precisely to @Video1. " +
      "Do not use any visuals from @Video1. No new dialogue, music or sound effects.\n\n" +
      "He sits relaxed in the cream armchair and talks to camera in a casual, confident podcast style, mic near his mouth. " +
      "Natural hand gestures, natural blinking, steady eye contact. Warm amber cinematic light, real skin texture, photorealistic UGC look.\n\n" +
      timingBlock(d) + "\n\n" +
      "Face, outfit and scene stay identical in all cuts. No subtitles, no on-screen text.",
  };

  const MAX_AUDIO_SECONDS = 30;
  const STORAGE_KEY = "ai-avatar-studio:v1";

  // ---------------------------------------------------------------------------
  // State (persisted to localStorage so a refresh doesn't lose uploads)
  // ---------------------------------------------------------------------------
  const state = Object.assign(
    {
      characterUrl: null,
      backgroundUrl: null,
      audioUrl: null,
      audioName: null,
      audioDuration: null,
      selfieUrl: null,
      promptCharacter: PROMPTS.character,
      promptBackground: PROMPTS.background,
      promptVideo: PROMPTS.video(30),
      resultUrl: null,
    },
    load(),
  );

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const $ = (id) => document.getElementById(id);

  function timingBlock(seconds) {
    const d = Math.max(3, Math.round(seconds || 30));
    const a = Math.ceil(d / 3);
    const b = Math.min(d - 1, Math.ceil((2 * d) / 3));
    return (
      `[0-${a}s] Wide shot, full body seated, whole studio in frame.\n` +
      `[${a}-${b}s] Hard cut to medium close-up, mic in the foreground.\n` +
      `[${b}-${d}s] Hard cut to face close-up, ending on a small confident smile.`
    );
  }

  function setStatus(id, msg, kind = "") {
    const el = $(id);
    el.textContent = msg || "";
    el.className = `status ${kind}`.trim();
  }

  function fmtSeconds(s) {
    if (!Number.isFinite(s)) return "?";
    return `${s.toFixed(1)} s`;
  }

  async function api(path, opts = {}) {
    const res = await fetch(path, opts);
    let body = null;
    try { body = await res.json(); } catch { /* non-json */ }
    if (!res.ok) throw new Error(body?.error || `${res.status} ${res.statusText}`);
    return body;
  }

  async function uploadFile(file, onProgress) {
    onProgress?.(`Uploading ${file.name}…`);
    const fd = new FormData();
    fd.append("file", file, file.name);
    return api("/api/upload", { method: "POST", body: fd });
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /** Submit a job and poll until it completes. */
  async function runJob(kind, input, onUpdate) {
    const { requestId } = await api("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, input }),
    });
    onUpdate?.({ status: "SUBMITTED", requestId, logs: [] });
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await sleep(kind === "video" ? 3000 : 1500);
      const s = await api(`/api/jobs/${kind}/${requestId}`);
      onUpdate?.(s);
      if (s.status === "COMPLETED") return s.result;
    }
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------
  function render() {
    // Character tile
    setTileImage("tile-character", "img-character", "empty-character", state.characterUrl);
    setTileImage("tile-background", "img-background", "empty-background", state.backgroundUrl);
    setRef("ref-character", state.characterUrl);
    setRef("ref-background", state.backgroundUrl);

    // Selfie thumb
    const selfie = $("img-selfie");
    selfie.hidden = !state.selfieUrl;
    if (state.selfieUrl) selfie.src = state.selfieUrl;
    $("name-selfie").textContent = state.selfieUrl ? "Selfie uploaded ✓" : "One clear selfie";

    // Audio tile
    const hasAudio = Boolean(state.audioUrl);
    $("tile-audio").classList.toggle("has-media", hasAudio);
    $("wave").hidden = !hasAudio;
    $("audio-meta").hidden = !hasAudio;
    $("empty-audio").hidden = hasAudio;
    $("audio-meta").textContent = hasAudio ? `${state.audioName} · ${fmtSeconds(state.audioDuration)}` : "";
    $("name-audio").textContent = state.audioName || "audio.mp4";
    $("ref-audio").classList.toggle("has-media", hasAudio);

    // Prompts
    if ($("prompt-character").value !== state.promptCharacter) $("prompt-character").value = state.promptCharacter;
    if ($("prompt-background").value !== state.promptBackground) $("prompt-background").value = state.promptBackground;
    if ($("prompt-video").value !== state.promptVideo) $("prompt-video").value = state.promptVideo;

    // Duration select
    renderDurationOptions();

    // Generate row
    const ready = state.characterUrl && state.backgroundUrl && state.audioUrl;
    $("btn-gen-video").disabled = !ready;
    const missing = [
      !state.characterUrl && "character",
      !state.backgroundUrl && "background",
      !state.audioUrl && "audio",
    ].filter(Boolean);
    $("gen-left").textContent = ready
      ? `${fmtSeconds(state.audioDuration)} audio`
      : `Missing: ${missing.join(", ")}`;
    $("gen-right").textContent = $("opt-aspect").value;

    // Result
    $("card-result").hidden = !state.resultUrl;
    if (state.resultUrl) {
      const v = $("video-result");
      if (v.src !== state.resultUrl) v.src = state.resultUrl;
      $("link-download").href = state.resultUrl;
    }
  }

  function setTileImage(tileId, imgId, emptyId, url) {
    const tile = $(tileId), img = $(imgId), empty = $(emptyId);
    tile.classList.toggle("has-media", Boolean(url));
    img.hidden = !url;
    empty.hidden = Boolean(url);
    if (url && img.src !== url) img.src = url;
  }

  function setRef(refId, url) {
    const ref = $(refId), img = ref.querySelector("img");
    ref.classList.toggle("has-media", Boolean(url));
    img.hidden = !url;
    if (url && img.src !== url) img.src = url;
  }

  function renderDurationOptions() {
    const sel = $("opt-duration");
    const current = sel.value;
    const suggested = state.audioDuration ? Math.min(MAX_AUDIO_SECONDS, Math.max(4, Math.ceil(state.audioDuration))) : null;
    sel.innerHTML = "";
    const add = (value, label) => {
      const o = document.createElement("option");
      o.value = value; o.textContent = label; sel.appendChild(o);
    };
    add("auto", "auto (match references)");
    for (let s = 4; s <= MAX_AUDIO_SECONDS; s++) add(String(s), `${s} s${s === suggested ? " (audio length)" : ""}`);
    sel.value = current && [...sel.options].some((o) => o.value === current) ? current : (suggested ? String(suggested) : "auto");
  }

  // ---------------------------------------------------------------------------
  // Tabs
  // ---------------------------------------------------------------------------
  document.querySelectorAll("[data-tabs]").forEach((group) => {
    const name = group.dataset.tabs;
    group.querySelectorAll(".tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        group.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b === btn));
        document.querySelectorAll(`[data-panel^="${name}-"]`).forEach((p) => {
          p.hidden = p.dataset.panel !== `${name}-${btn.dataset.tab}`;
        });
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Step 1: Character
  // ---------------------------------------------------------------------------
  $("file-selfie").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { url } = await uploadFile(file, (m) => setStatus("status-character", m));
      state.selfieUrl = url; save(); render();
      setStatus("status-character", "Selfie uploaded. Now generate the character sheet.", "ok");
    } catch (err) {
      setStatus("status-character", err.message, "error");
    } finally { e.target.value = ""; }
  });

  $("prompt-character").addEventListener("input", (e) => { state.promptCharacter = e.target.value; save(); });

  $("btn-gen-character").addEventListener("click", async () => {
    if (!state.selfieUrl) return setStatus("status-character", "Upload a selfie first.", "error");
    const btn = $("btn-gen-character");
    btn.disabled = true;
    try {
      const result = await runJob(
        "imageEdit",
        {
          prompt: state.promptCharacter,
          image_urls: [state.selfieUrl],
          aspect_ratio: "16:9",
          resolution: "2K",
          output_format: "png",
          num_images: 1,
        },
        (s) => setStatus("status-character", `Nano Banana Pro: ${describe(s)}`),
      );
      const url = result?.images?.[0]?.url;
      if (!url) throw new Error("No image returned.");
      state.characterUrl = url; save(); render();
      setStatus("status-character", "Character sheet ready (@Image1).", "ok");
    } catch (err) {
      setStatus("status-character", err.message, "error");
    } finally { btn.disabled = false; }
  });

  $("file-character").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { url } = await uploadFile(file, (m) => setStatus("status-character", m));
      state.characterUrl = url; save(); render();
      setStatus("status-character", "Character sheet uploaded (@Image1).", "ok");
    } catch (err) {
      setStatus("status-character", err.message, "error");
    } finally { e.target.value = ""; }
  });

  // ---------------------------------------------------------------------------
  // Step 2: Background
  // ---------------------------------------------------------------------------
  $("prompt-background").addEventListener("input", (e) => { state.promptBackground = e.target.value; save(); });

  $("btn-gen-background").addEventListener("click", async () => {
    const btn = $("btn-gen-background");
    btn.disabled = true;
    try {
      const result = await runJob(
        "image",
        {
          prompt: state.promptBackground,
          aspect_ratio: "9:16",
          resolution: "2K",
          output_format: "png",
          num_images: 1,
        },
        (s) => setStatus("status-background", `Nano Banana Pro: ${describe(s)}`),
      );
      const url = result?.images?.[0]?.url;
      if (!url) throw new Error("No image returned.");
      state.backgroundUrl = url; save(); render();
      setStatus("status-background", "Background ready (@Image2).", "ok");
    } catch (err) {
      setStatus("status-background", err.message, "error");
    } finally { btn.disabled = false; }
  });

  $("file-background").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { url } = await uploadFile(file, (m) => setStatus("status-background", m));
      state.backgroundUrl = url; save(); render();
      setStatus("status-background", "Background uploaded (@Image2).", "ok");
    } catch (err) {
      setStatus("status-background", err.message, "error");
    } finally { e.target.value = ""; }
  });

  // ---------------------------------------------------------------------------
  // Step 3: Audio (MP4)
  // ---------------------------------------------------------------------------
  function probeDuration(file) {
    return new Promise((resolve) => {
      const v = $("probe-audio");
      const url = URL.createObjectURL(file);
      const done = (d) => { URL.revokeObjectURL(url); v.removeAttribute("src"); resolve(d); };
      v.onloadedmetadata = () => done(Number.isFinite(v.duration) ? v.duration : null);
      v.onerror = () => done(null);
      v.src = url;
    });
  }

  $("file-audio").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isMp4 = file.type === "video/mp4" || /\.mp4$/i.test(file.name);
    if (!isMp4) {
      setStatus("status-audio", "Please choose an MP4 file.", "error");
      e.target.value = "";
      return;
    }
    try {
      const duration = await probeDuration(file);
      if (duration && duration > MAX_AUDIO_SECONDS + 0.2) {
        setStatus("status-audio", `This clip is ${fmtSeconds(duration)}. Seedance accepts up to ${MAX_AUDIO_SECONDS} s. Trim it and try again.`, "error");
        e.target.value = "";
        return;
      }
      const { url } = await uploadFile(file, (m) => setStatus("status-audio", m));
      state.audioUrl = url;
      state.audioName = file.name;
      state.audioDuration = duration;
      // Re-fit the cut timings if the user hasn't customised the prompt much.
      if (duration) state.promptVideo = refitTimings(state.promptVideo, duration);
      $("opt-duration").value = "";
      save(); render();
      setStatus("status-audio", duration ? `Audio ready (@Video1), ${fmtSeconds(duration)}. Timings fitted.` : "Audio ready (@Video1).", "ok");
    } catch (err) {
      setStatus("status-audio", err.message, "error");
    } finally { e.target.value = ""; }
  });

  // ---------------------------------------------------------------------------
  // Step 4: Video prompt + generation
  // ---------------------------------------------------------------------------
  const TIMING_RE = /\[\s*\d+(?:\.\d+)?\s*-\s*\d+(?:\.\d+)?s\s*\][^\n]*(?:\n\[\s*\d+(?:\.\d+)?\s*-\s*\d+(?:\.\d+)?s\s*\][^\n]*)*/;

  function refitTimings(prompt, seconds) {
    const block = timingBlock(seconds);
    if (TIMING_RE.test(prompt)) return prompt.replace(TIMING_RE, block);
    return `${prompt.trimEnd()}\n\n${block}`;
  }

  $("prompt-video").addEventListener("input", (e) => { state.promptVideo = e.target.value; save(); });

  $("btn-fit-timings").addEventListener("click", () => {
    const d = state.audioDuration || Number($("opt-duration").value) || 30;
    state.promptVideo = refitTimings(state.promptVideo, d);
    save(); render();
    setStatus("status-video", `Cut timings fitted to ${Math.round(d)} s.`, "ok");
  });

  $("btn-reset-prompt").addEventListener("click", () => {
    state.promptVideo = PROMPTS.video(state.audioDuration || 30);
    save(); render();
  });

  $("opt-aspect").addEventListener("change", render);

  function describe(s) {
    if (s.status === "SUBMITTED") return "submitted…";
    if (s.status === "IN_QUEUE") return `in queue${s.queuePosition != null ? ` (position ${s.queuePosition})` : ""}…`;
    if (s.status === "IN_PROGRESS") return "generating…";
    if (s.status === "COMPLETED") return "done.";
    return s.status;
  }

  $("btn-gen-video").addEventListener("click", async () => {
    const btn = $("btn-gen-video");
    const progress = $("progress-video");
    const prompt = state.promptVideo.trim();
    if (!prompt) return setStatus("status-video", "Prompt is empty.", "error");
    for (const tag of ["@Image1", "@Image2", "@Video1"]) {
      if (!prompt.includes(tag)) {
        setStatus("status-video", `Your prompt doesn't mention ${tag}. Add it so the model knows what that file is for.`, "error");
        return;
      }
    }

    const input = {
      prompt,
      image_urls: [state.characterUrl, state.backgroundUrl],
      video_urls: [state.audioUrl],
      aspect_ratio: $("opt-aspect").value,
      resolution: $("opt-resolution").value,
      duration: $("opt-duration").value || "auto",
    };
    const ga = $("opt-generate-audio").value;
    if (ga) input.generate_audio = ga === "true";

    btn.disabled = true;
    progress.hidden = false;
    $("progress-title").textContent = "Submitting to Seedance 2.5…";
    $("progress-logs").textContent = "";
    setStatus("status-video", "");
    const started = Date.now();

    try {
      const result = await runJob("video", input, (s) => {
        const elapsed = Math.round((Date.now() - started) / 1000);
        $("progress-title").textContent = `Seedance 2.5: ${describe(s)}  (${elapsed}s)`;
        if (s.logs?.length) $("progress-logs").textContent = s.logs.slice(-12).join("\n");
      });
      const url = result?.video?.url;
      if (!url) throw new Error("No video returned.");
      state.resultUrl = url; save(); render();
      $("result-meta").textContent = `${input.aspect_ratio} · ${input.resolution} · ${Math.round((Date.now() - started) / 1000)} s`;
      setStatus("status-video", "Video ready.", "ok");
      $("card-result").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      setStatus("status-video", err.message, "error");
    } finally {
      btn.disabled = false;
      progress.hidden = true;
      render();
    }
  });

  $("btn-clear-result").addEventListener("click", () => {
    state.resultUrl = null; save(); render();
  });

  $("btn-reset-all").addEventListener("click", () => {
    if (!confirm("Clear all uploads, prompts and results?")) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------
  async function checkHealth() {
    const pill = $("key-status");
    try {
      const h = await api("/api/health");
      if (h.hasKey) {
        pill.textContent = "fal.ai key detected";
        pill.className = "pill pill-ok";
        pill.title = `image: ${h.models.image}\nedit: ${h.models.imageEdit}\nvideo: ${h.models.video}`;
      } else {
        pill.textContent = "FAL_KEY missing – add it to .env";
        pill.className = "pill pill-bad";
      }
    } catch {
      pill.textContent = "Server unreachable";
      pill.className = "pill pill-bad";
    }
  }

  checkHealth();
  render();
})();
