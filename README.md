# Architect Podcast Studio

A small web app that turns **a selfie and a short voice recording** into a lip-synced podcast clip,
set in an architect's studio. Everything between the two uploads is automatic.

## How it works

Nothing is generated on its own. Every image and video starts from a **Create** button, so credits are only
spent when the user asks.

| Step | Upload (free) | Or create (uses credits) | Done automatically |
| --- | --- | --- | --- |
| 1. Architect | A ready character sheet (face left, outfit right) | From a selfie, with a look and optional notes | Reads the face and outfit from the sheet |
| 2. Studio set | A set image (its shape sets the clip format) | From style, chair, light, framing, format and optional notes | Reads the seat, props and light from the set |
| 3. Voice | An MP4, 2 to 30 seconds | – | Takes the voice out of the MP4 as a clean audio track, measures it, transcribes it and finds natural pauses |
| 4. Episode clip | – | **Create episode clip** | Writes the video prompt, sets the clip length to the recording and places the camera cuts on pauses |

All three prompts (character sheet, studio set, video) are written automatically and can be opened and edited.

### Studio set options

- **Style:** Design studio, Podcast lounge, Courtyard, Concrete & light.
- **Chair:** Suits the style, Teak & cane, Bouclé, Leather.
- **Light:** Warm evening, Soft daylight, Moody.
- **Framing:** Whole room (recommended) or a bit closer. Both keep the whole chair in view.
- **Format:** Vertical 9:16 (Reels, Shorts) or Landscape 16:9 (YouTube).
- **Match this framing:** sends `public/reference/podcast-set-framing.jpg` with the request as a guide for camera distance,
  so the set is shown wide like a real podcast studio instead of zoomed in on the chair.

All presets and prompts live at the top of `public/app.js`.

### The voice track

The video model receives the voice as audio (`audio_urls`, `@Audio1`), not as a video. The browser decodes the MP4 and
uploads a mono WAV, which works for audio-only MP4s and for any video codec. If a browser cannot decode the file, the
MP4 is converted to MP3 on fal.ai instead.

### Models (all through one fal.ai key)

| Job | fal.ai endpoint |
| --- | --- |
| Character sheet, and studio set with the framing reference | `fal-ai/nano-banana-pro/edit` |
| Studio set without the reference | `fal-ai/nano-banana-pro` |
| Reading the sheet and the set | `openrouter/router/vision` |
| Transcribing the recording | `fal-ai/whisper` |
| Converting audio a browser cannot decode | `fal-ai/ffmpeg-api/merge-audios` |
| Video | `bytedance/seedance-2.5/reference-to-video` |

The files reach the video model in a fixed order, so the prompt tags always line up:
`@Image1` = character sheet, `@Image2` = studio set, `@Audio1` = the voice.

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

- **Real people:** Seedance 2.5 on fal.ai refuses reference images that show a real, identifiable person's face, with
  "The images or videos provided may contain likenesses of real people…". ByteDance only allows real people through its
  own verified-portrait programme (a liveness check and signed authorisation on BytePlus ModelArk), which fal.ai does
  not expose. The app explains this refusal when it happens.
- The recording must be an MP4, 2 to 30 seconds, ideally in a quiet room with no music. It can be a video or audio only.
- If an image cannot be read, the prompt falls back to the chosen preset's description. If the recording
  cannot be transcribed, the cuts are spaced evenly.
- An in-progress video job survives a page reload: the page reconnects to it.
- Uploads, choices and the last clip are remembered in the browser. **Start over** clears them but keeps the key.
