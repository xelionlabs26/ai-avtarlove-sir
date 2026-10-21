# Architect Podcast Studio

A small web app that turns **a selfie and a short voice recording** into a lip-synced podcast clip,
set in an architect's studio. Everything between the two uploads is automatic.

## How it works

Nothing is generated on its own. Every image and video starts from a **Create** button, so credits are only
spent when the user asks.

| Step | Upload (free) | Or create (uses credits) |
| --- | --- | --- |
| 1. Architect | A ready character sheet (face left, outfit right) | From a selfie, with a look and optional notes |
| 2. Studio set | A set image (its shape sets the clip format) | From style, chair, light, framing, format and optional notes |
| 3. On set | Your own photo of the architect seated in the set | The sheet and the set combined into one seated photo |
| 4. Voice | An MP4, 2 to 30 seconds | – |
| 5. Episode clip | – | A talking-avatar model animates the step 3 photo with the step 4 voice |

All prompts are written automatically and can be opened and edited. Before creating a clip, the user confirms
they have the consent of the person shown.

### Why a talking-avatar model

ByteDance's Seedance 2.x models refuse input images that show a real, identifiable face. They return
"The images or videos provided may contain likenesses of real people…". ByteDance only allows real people through
its own identity-verification programme, which fal.ai does not expose. Since this app animates a real architect,
the video step uses talking-avatar models that accept a real person's photo:

| Choice in the app | fal.ai endpoint | Notes |
| --- | --- | --- |
| Best lip-sync (default) | `fal-ai/kling-video/ai-avatar/v2/pro` | Takes a prompt; slower |
| Natural gestures | `fal-ai/creatify/aurora` | Takes a prompt; 720p |
| Most expressive | `fal-ai/bytedance/omnihuman/v1.5` | Takes a prompt; 720p |
| Fastest | `veed/fabric-1.0` | No prompt; mostly head and face; 720p |

If a model refuses the photo, the app says so and suggests another model. Each model makes one continuous shot,
as long as the recording, in the shape of the step 3 photo.

### Studio set options

- **Style:** Design studio, Podcast lounge, Courtyard, Concrete & light.
- **Chair:** Suits the style, Teak & cane, Bouclé, Leather.
- **Light:** Warm evening, Soft daylight, Moody.
- **Framing:** Whole room (recommended) or a bit closer. Both keep the whole chair in view.
- **Format:** Vertical 9:16 (Reels, Shorts) or Landscape 16:9 (YouTube).
- **Match this framing:** sends `public/reference/podcast-set-framing.jpg` with the request as a guide for camera distance,
  so the set is shown wide like a real podcast studio instead of zoomed in on the chair.

### The voice track

The browser decodes the MP4 and uploads a mono WAV, which works for audio-only MP4s and for any video codec. If a
browser cannot decode the file, the MP4 is converted to MP3 on fal.ai (`fal-ai/ffmpeg-api/merge-audios`) instead.

### Image models

| Job | fal.ai endpoint |
| --- | --- |
| Character sheet, on-set photo, and set with the framing reference | `fal-ai/nano-banana-pro/edit` |
| Set without the reference | `fal-ai/nano-banana-pro` |

All presets and prompts live at the top of `public/app.js`.

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

- The recording must be an MP4, 2 to 30 seconds, ideally in a quiet room with no music. It can be a video or audio only.
- An in-progress video job survives a page reload: the page reconnects to it.
- Uploads, choices and the last clip are remembered in the browser. **Start over** clears them but keeps the key.
