# AI Avatar Studio

A small web app that turns **one selfie + a podcast background + a short audio clip** into a lip-synced,
30-second "podcast style" AI avatar video. It follows the 3-step workflow from the
*AI Avatar Prompt Guide* by Tushar (@tusharx.ai):

| Step | What happens | Model (fal.ai) |
| --- | --- | --- |
| 1. Character | Upload a selfie → generate a 16:9 character sheet (face left, outfit right), or upload a ready sheet | `fal-ai/nano-banana-pro/edit` |
| 2. Background | Generate an empty podcast studio (9:16), or upload your own | `fal-ai/nano-banana-pro` |
| 3. Audio | Upload your dialogue as an **MP4** (max 30 s) | – |
| 4. Video | Paste/adjust the prompt, pick duration / aspect / resolution, hit **Generate** | `bytedance/seedance-2.5/reference-to-video` |

The files are passed to Seedance in this exact order so the prompt tags line up:
`@Image1` = character sheet, `@Image2` = background, `@Video1` = your audio.

## Run it

```bash
npm install
cp .env.example .env        # then put your fal.ai key in FAL_KEY=
npm start                   # http://localhost:3000
```

Your fal key only lives on the server (`server/index.js`). The browser talks to three small routes:

- `POST /api/upload` – uploads a file to fal storage and returns its URL
- `POST /api/jobs` – submits a job (`image`, `imageEdit` or `video`) to the fal queue
- `GET /api/jobs/:kind/:id` – polls status / logs / result

## Prompts

All three default prompts (character sheet, background, video) are pre-filled from the guide and fully editable in the UI.
When you upload audio shorter than 30 s, the `[0-10s] / [10-20s] / [20-30s]` cut markers are rewritten to match the
clip length (for 8 s: `[0-3s]`, `[3-6s]`, `[6-8s]`). "Fit timings to audio" redoes that at any time.

## Settings

- **Duration** – defaults to the audio length (rounded up, 4–30 s); `auto` lets the model match the references.
- **Aspect ratio** – 9:16 by default (vertical podcast clip).
- **Resolution** – 480p / 720p / 1080p.
- **Model audio** – leave on *Model default* unless Seedance adds unwanted sound; *Off* mutes generated audio.

Model endpoints can be overridden in `.env` (`SEEDANCE_MODEL`, `NANO_BANANA_MODEL`, `NANO_BANANA_EDIT_MODEL`).

## Notes

- Audio must be MP4 (the voice track is used, visuals are ignored). Keep it under 30 seconds, quiet room, no music.
- Uploads, prompts and the last result are remembered in your browser (localStorage). "Reset everything" clears them.
- Generation runs on your fal.ai account and is billed there.
