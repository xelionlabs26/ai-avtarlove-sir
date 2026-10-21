# Architect Podcast Studio

A small web app that turns **a selfie and a short voice recording** into a lip-synced podcast clip,
set in an architect's studio. Everything between the two uploads is automatic.

## How it works

| Step | What the user does | What the app does automatically |
| --- | --- | --- |
| 1. Architect | Drops a selfie and picks a look (or keeps the default) | Creates a 16:9 character sheet (face left, outfit right), then reads the face and outfit from it |
| 2. Studio set | Nothing (or picks a style, format, or uploads their own set) | Creates an empty podcast set as soon as the selfie arrives, then reads the seat, props and light from it |
| 3. Voice | Drops an MP4 recording, 2 to 30 seconds | Reads the exact length, transcribes it and finds the natural pauses |
| 4. Episode clip | Clicks **Create episode clip** | Writes the video prompt from steps 1 to 3, sets the clip length to the recording, places the camera cuts on pauses, and generates the video |

The video prompt is rebuilt every time an input changes. It can be viewed, and optionally customised, under
**Video prompt** in step 4.

### Presets

- **Looks:** Indo-western (Nehru jacket over kurta), Studio linen, Handloom khadi, or "As in photo".
- **Set styles:** Design studio, Courtyard verandah, Concrete & light.
- **Formats:** Vertical 9:16 (Reels, Shorts) or Landscape 16:9 (YouTube, LinkedIn). An uploaded set keeps its own shape.
- **Quality:** 480p, 720p or 1080p.

All presets and prompts live at the top of `public/app.js`.

### Models (all through one fal.ai key)

| Job | fal.ai endpoint |
| --- | --- |
| Character sheet | `fal-ai/nano-banana-pro/edit` |
| Studio set | `fal-ai/nano-banana-pro` |
| Reading the sheet and the set | `openrouter/router/vision` |
| Transcribing the recording | `fal-ai/whisper` |
| Video | `bytedance/seedance-2.5/reference-to-video` |

The files reach the video model in a fixed order, so the prompt tags always line up:
`@Image1` = character sheet, `@Image2` = studio set, `@Video1` = the recording.

## Use it on GitHub Pages (no install)

Once Pages is switched on, the app lives at `https://<github-account>.github.io/<repository>/`.

On first visit it asks for a fal.ai API key. The key is kept only in that browser and is sent only to fal.ai,
so every visitor uses their own key. Click the key button at the top right to change or remove it.

One-time setup in the repo:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. Run the **Deploy to GitHub Pages** workflow from the Actions tab, or push a change to `public/`.
   The workflow in `.github/workflows/pages.yml` publishes the `public/` folder.

## Run it locally (optional)

```bash
npm install
cp .env.example .env        # optional: put a fal.ai key in FAL_KEY=
npm start                   # http://localhost:3000
```

With `FAL_KEY` set, the key stays on the server and the page never asks for one. Without it, the page asks
for a key in the browser, exactly like the GitHub Pages version.

## Notes

- The recording must be an MP4, 2 to 30 seconds, ideally in a quiet room with no music.
- If an image cannot be read, the prompt falls back to the chosen preset's description. If the recording
  cannot be transcribed, the cuts are spaced evenly.
- An in-progress video job survives a page reload: the page reconnects to it.
- Uploads, choices and the last clip are remembered in the browser. **Start over** clears them but keeps the key.
