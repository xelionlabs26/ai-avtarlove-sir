# Architect Podcast Studio

A small web app that turns **a character sheet (or a selfie) and a short voice recording** into a lip-synced podcast
clip, set in an architect's studio. Everything between the uploads is automatic.

## How it works

Nothing is generated on its own. Every image and video starts from a **Create** button, so credits are only
spent when the user asks.

| Step | Upload or pick (free) | Or create (uses credits) | Done automatically |
| --- | --- | --- | --- |
| 1. Architect | A ready character sheet (face left, outfit right), and an outfit from the library | From a selfie, with an outfit from the library and optional notes | Puts the chosen outfit in the prompts, or reads the outfit from the sheet |
| 2. Studio set | A preset from the set library, or your own set image (its shape sets the clip format) | From style, chair, light, framing, format and optional notes, or **Add chair and mic** to a library room | Uses the preset's description, or reads the seat, props and light from the set |
| 3. Reference video (optional) | A clip to copy its performance, or to take its script | – | Checks the clip against the video model's limits. For a script, takes out the sound and reads the words |
| 4. Voice | An MP4, 2 to 30 seconds, or a recording made in the app | Typed words spoken by an ElevenLabs voice, on kie.ai or fal.ai | Makes a clean audio track, measures it, and finds natural pauses for the camera cuts |
| 5. Episode clip | – | **Preview the shot** (one image), then **Create episode clip** | Writes the video prompt with your performance choices, sets the clip length to the recording, places the camera cuts on pauses, and shows the cost before you create |
| Result | – | **Upscale this take**, **Retry with fixes** | Checks the finished clip for closed eyes, a moved camera or set, extra people, text and lip-sync |

All three prompts (character sheet, studio set, video) are written automatically and can be opened and edited.

### Costs before you create

Every Create button says what it costs on your provider, for example "Uses about 18 credits (≈ $0.09) on kie.ai". The
Quality buttons show the price of this clip at 480p, 720p and 1080p, and a clip estimated above $3 asks for a second
press. The prices live in `public/library/pricing.json` and can be updated there.

### Performance, preview and the finished clip

- **Performance (step 5):** Gestures (Calm, Natural, Expressive), Expression (Serious, Warm, Smiling) and Looks at
  (the host on the left or right, or the camera). They rewrite the performance part of the prompt.
- **Shot preview (step 5):** one still of the architect sitting in your set (about $0.09 on kie.ai), to check the look
  before spending video credits. While it matches the current inputs, the clip follows it as the approved first frame.
- **Test at 480p, then upscale:** Seedance cannot repeat a take, so a 480p test that came out right is upscaled rather
  than remade (kie.ai doubles it, fal.ai brings it to 1080p). With a fal.ai key, the exact voice track is put back
  onto the upscaled video.
- **Clip check:** with a fal.ai key, each new clip is watched by a video model and its first frame is compared with
  your set (about a cent). Problems are listed with a note, and **Retry with fixes** makes a new take with a prompt
  line for each problem.

### Outfit library

Step 1 shows the outfits from `public/library/outfits.json` as cards, with filters by category and by speaker. The
first card, **Default**, is selected at the start.

| Choice | Character sheet (when created from a selfie) | Video prompt |
| --- | --- | --- |
| **Default** (no outfit chosen) | The library's default outfit | The outfit on the sheet, as it is |
| An outfit, and the sheet was created with it | The outfit's wording, on the right side | The outfit from the right side of the sheet, with the outfit's wording |
| An outfit, and the sheet was uploaded or made with another outfit | – | Only the face comes from the sheet. The outfit's wording is used, and its image, if it has one, is sent as `@Image3` |

When the sheet shows a different outfit from the one chosen, step 1 says so and offers **Recreate sheet with this
outfit** (uses credits, never automatic). "As in my photo" keeps the clothes from the selfie.

### Set library

Step 2 opens on **Library**: the preset backgrounds from `public/library/sets.json`. Each card says **Chair and mic**
(ready to use) or **Room only**. For a room, pick a chair and press **Add chair and mic** (one image edit, uses
credits), or use the room as it is. The scene wording in the video prompt comes from the preset, so it is accurate even
without a fal.ai key. **I have a set image** and **Create a set** work as before.

### Reference video (optional)

Step 3 can guide the clip with another video. It is off by default.

- **Copy the performance:** the clip goes to Seedance as `@Video1`. The architect copies its body movement, gestures,
  head turns, pacing and camera, but keeps the face and outfit from `@Image1`, the set from `@Image2` and the voice from
  `@Audio1`. Nothing else from the clip is used, and the camera choice in step 5 is locked to the clip's. The clip must
  be MP4 or MOV, 2 to 30 seconds, 24 to 60 fps, 480p to 720p (720 × 1280 is fine, 1080 × 1920 is too large) and up to
  90 MB. The app checks this before uploading and says what to change.
- **Use the script:** only the clip's sound is taken out (in the browser) and read with Whisper on fal.ai, so any size
  or frame rate works, up to 3 minutes. The words appear with a copy button, to be recorded in the architect's own voice
  in step 4. This needs a fal.ai key, also when videos are made on kie.ai.

Before adding a clip, tick the box confirming you have the right to use it and its words. Seedance refuses reference
videos that show a real, identifiable face, just as it refuses such character sheets, so use a clip in which no real
face can be recognised.

### Adding your own outfits and backgrounds

The libraries are plain files in `public/library/`, so new entries need no code:

1. Put the image in `public/library/outfits/` (an outfit) or `public/library/sets/` (a background, vertical 9:16),
   with a small copy of each background in `public/library/sets/thumbs/`.
2. Add an entry to `outfits.json` or `sets.json`. For a background, say whether it already shows the chair and the
   mic (`hasChairAndMic`) and describe the room in one sentence (`scene`).
3. Commit and push. The site updates about a minute later.

Every field is explained in [public/library/README.md](public/library/README.md).

### Creating a set

- **Style:** Architect studio (default: plaster walls, tall window, teak bookshelves with white models, drafting table
  with rolled drawings and a brass lamp), Teal velvet, Podcast lounge, Courtyard, Concrete & light.
- **Chair:** Teal velvet (default), Suits the style, Teak & cane, Bouclé, Leather.
- **Light:** Soft daylight (default, from a window on the left), Soft studio, Warm evening, Moody.
- **Framing:** Talking-head (default), Whole room, or a bit closer. Talking-head is a close, chest-height shot like a
  podcast clip: the chair fills the lower half, right of centre, a black broadcast mic on a boom arm comes in from the
  left at mouth height, and the room fills the upper half. No ceiling, people or text.
- **Format:** Vertical 9:16 (Reels, Shorts) or Landscape 16:9 (YouTube).
- **Match this framing:** for the wide framings only, sends `public/reference/podcast-set-framing.jpg` as a guide for
  camera distance.

### The voice track

Step 4 has three ways to add the voice:

- **Upload MP4:** a video or an audio-only MP4, 2 to 30 seconds.
- **Clean-up:** uploads and recordings are brought to an even loudness in the browser (free, can be switched off), and
  **Remove background noise** cleans a recording with ElevenLabs audio isolation, with **Use the original** to undo.
- **Record now:** records with the microphone of the phone or computer. A timer and a level bar show it is
  working, recording stops by itself at 30 seconds, and silence at the start and the end is cut off.
- **Type the words:** an Indian ElevenLabs voice speaks the typed text, in English, Hindi or a mix. It runs on the
  provider you picked, with the key you already added (kie.ai or fal.ai), so no ElevenLabs account or key is needed.
  The voices come from `public/library/voices.json` (male and female; the default follows the Speaker choice), and any
  other ElevenLabs voice ID can be pasted in instead. Pick a style: **Natural** (Multilingual v2, also returns the
  timing of every word, so the camera cuts land on pauses) or **Expressive** (Eleven v3, livelier). The app estimates
  the length as you type and stops a text that cannot fit 30 seconds before any credits are used. For the architect's
  own voice, use **Record now**. A script read from a reference clip in step 3 can be sent here with
  **Use for the voice**.

Whichever way it comes in, the video model receives the voice as audio (`audio_urls`, `@Audio1`), not as a video. The
browser decodes it and uploads a mono WAV, which works for audio-only MP4s and for any video codec. If a browser cannot
decode an MP4, it is converted to MP3 on fal.ai instead.

### Providers: kie.ai (default) or fal.ai

Pick the provider in the key panel (top right). The images and the Seedance 2.5 video run on the chosen provider.

| Job | kie.ai model | fal.ai endpoint |
| --- | --- | --- |
| Character sheet, and set with the framing reference | `nano-banana-pro` (with `image_input`) | `fal-ai/nano-banana-pro/edit` |
| Set without the reference | `nano-banana-pro` | `fal-ai/nano-banana-pro` |
| Video | `bytedance/seedance-2-5` | `bytedance/seedance-2.5/reference-to-video` |
| Typed words, Natural | `elevenlabs/text-to-speech-multilingual-v2` | `fal-ai/elevenlabs/tts/multilingual-v2` |
| Typed words, Expressive | `elevenlabs/text-to-dialogue-v3` | `fal-ai/elevenlabs/tts/eleven-v3` |
| Shot preview | `nano-banana-pro` (with `image_input`, 1K) | `fal-ai/nano-banana-pro/edit` |
| Remove background noise | `elevenlabs/audio-isolation` | `fal-ai/elevenlabs/audio-isolation` |
| Upscale a take | `topaz/video-upscale` | `fal-ai/topaz/upscale/video` |

kie.ai calls go straight from the browser: uploads to `kieai.redpandaai.co/api/file-stream-upload`, jobs to
`api.kie.ai/api/v1/jobs/createTask`, and status from `api.kie.ai/api/v1/jobs/recordInfo`. kie.ai keeps uploaded files
for a limited time, so finish a clip in one session.

A fal.ai key is optional with kie.ai. When present, it is used for extra helpers that kie.ai does not provide:
reading the sheet and the set (`openrouter/router/vision`), transcribing the recording to place cuts on pauses and
reading a reference clip's script (`fal-ai/whisper`), and converting audio a browser cannot decode
(`fal-ai/ffmpeg-api/merge-audios`), checking finished clips (`openrouter/router/video` and
`fal-ai/ffmpeg-api/extract-frame`), and putting the voice back after an upscale (`fal-ai/ffmpeg-api/merge-audio-video`).
Without it, the prompt uses the preset descriptions, the cuts are spaced evenly, and **Use the script** and the clip
check are not available.

The files reach the video model in a fixed order, so the prompt tags always line up. A tag is in the prompt only when
its file is sent.

| Tag | File | When |
| --- | --- | --- |
| `@Image1` | Character sheet, or verified portrait | Always |
| `@Image2` | Studio set | Always |
| `@Image3` | Outfit image | Only when a library outfit replaces the clothes on the sheet |
| next `@Image` | Shot preview | Only when an up-to-date preview guides the clip (`@Image3`, or `@Image4` after an outfit image) |
| `@Video1` | Reference clip | Only when copying a performance |
| `@Audio1` | The voice | Always |

On kie.ai they are sent as `reference_image_urls`, `reference_video_urls` and `reference_audio_urls`, and on fal.ai as
`image_urls`, `video_urls` and `audio_urls`.

### Real people and verified portraits

Seedance 2.5 refuses reference images that show a real, identifiable person's face. ByteDance allows real people
only through its verified-portrait programme: the person completes a liveness check and signs an authorisation, and
the portrait gets an asset ID. kie.ai's Seedance 2.5 accepts these as `asset://<id>`. Enter the ID in step 1, under
**Verified portrait asset ID**, and the video uses it as `@Image1` instead of the character sheet.

### Phones and tablets

The layout works from 360 px wide upwards. On touch screens, fields use 16 px text so iOS does not zoom in, buttons
are at least 42 px tall, and the step bar scrolls sideways.

## Roadmap

Built in phases, each shipped and tested on its own. The full plan, with data formats, prompt rules and checks, is in
[PLAN.md](PLAN.md).

| Phase | Feature | Status |
| --- | --- | --- |
| 0 | Presets moved into data files (`public/library/*.json`) | Done |
| 1 | Outfit library: preset outfits added to the prompts automatically, default when none is chosen | Done |
| 2 | Set library: preset backgrounds, with "Add chair and mic" for plain rooms | Done (2 presets so far, room for 10–12) |
| 3 | Reference video: copy a clip's performance (`@Video1`) or take its script | Done |

## Use it on GitHub Pages (no install)

Once Pages is switched on, the app lives at `https://<github-account>.github.io/<repository>/`.

On first visit it asks for an API key (kie.ai by default, or fal.ai). Keys are kept only in that browser and are
sent only to the service they belong to, so every visitor uses their own. Click the key button at the top right to
change the provider or the keys.

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
- The voice must be 2 to 30 seconds, ideally recorded in a quiet room with no music. An uploaded recording must be an
  MP4 (video or audio only). Recording in the app needs a browser that can record audio (current Chrome, Safari, Edge
  or Firefox) and the microphone permission for the site.
- If an image cannot be read, the prompt falls back to the chosen preset's description. If the recording
  cannot be transcribed, the cuts are spaced evenly.
- An in-progress video job survives a page reload: the page reconnects to it.
- Uploads, choices and the last clip are remembered in the browser. **Start over** clears them but keeps the key.
