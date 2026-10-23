# Plan: outfit library, set library, reference video

This plan adds three features to Architect Podcast Studio. Each phase ships on its own, is tested before the next one
starts, and changes only the parts named in it.

**Status: all four phases are built, tested and pushed.** What is left is content only: your outfit images and your
backgrounds (see [What you add next](#what-you-add-next)).

| Phase | Feature | Depends on | Status | Needs from you |
| --- | --- | --- | --- | --- |
| 0 | Move presets into data files | – | Done | Nothing |
| 1 | Outfit library | Phase 0 | Done | Your outfit images and names |
| 2 | Set (background) library | Phase 0 | Done | Your 10–12 background images |
| 3 | Reference video | Phases 1–2 | Done | One real reference clip, to try it |

### Where the build differs from the plan

- **Phase 1:** the four "Looks" are now library outfits (Charcoal Nehru jacket is the default), plus Black knit polo
  from your template prompt and "As in my photo" (keep the selfie's clothes).
- **Phase 2:** Library is the first tab in step 2. It starts with two presets made from your images: Architect studio
  and Teal velvet.
- **Phase 3:** the reference video is its own step, step 3, so Voice is now step 4 and Episode clip step 5. The video
  limits apply only to **Copy the performance**. **Use the script** takes out only the clip's sound in the browser, so
  any size and frame rate works, up to 3 minutes, and the clip itself is never uploaded to the video provider. While a
  reference performance is used, the camera choice is locked to the clip's camera.

---

## Starting point (before Phase 0)

- **Step 1, Architect:** upload a character sheet, or create one from a selfie with a "Look" (4 fixed outfits) and
  free-text notes. An optional verified portrait asset ID (kie.ai) can replace the sheet's face.
- **Step 2, Studio set:** upload a set image, or create one from style, chair, light, framing and format chips.
- **Step 3, Voice:** an MP4, 2–30 s, converted to a WAV voice track.
- **Step 4, Episode clip:** Seedance 2.5 on kie.ai (default) or fal.ai. The video prompt is written automatically in
  the house template: who, scene, voice, performance, look, camera (still or three cuts), closing lines.
- **Reference tags sent to Seedance today:** `@Image1` = character sheet (or `asset://` portrait), `@Image2` = set,
  `@Audio1` = voice.

---

## Phase 0: move presets into data files

**Goal:** presets live in JSON files instead of inside `app.js`, so outfits and sets can be added without touching code.

**Files**

```
public/library/
  outfits.json          list of outfits
  outfits/<id>.jpg      outfit images (optional per outfit)
  sets.json             list of preset sets
  sets/<id>.jpg         set images
```

**Work**

1. Load both JSON files at start-up. If a file is missing or broken, the app keeps working with no library.
2. Move today's four "Look" presets into `outfits.json` as the first entries.
3. No visible change for users.

**Done when:** the app behaves exactly as now, and adding an entry to a JSON file shows it in the app after a reload.

---

## Phase 1: outfit library

**Goal:** a wardrobe of preset outfits. Choosing one puts it in the prompts automatically. Choosing none keeps the
current default.

### Outfit entry (`outfits.json`)

```json
{
  "id": "nehru-charcoal",
  "name": "Charcoal Nehru jacket",
  "category": "Indo-western",
  "for": ["man", "woman", "person"],
  "prompt": "charcoal-grey Nehru jacket over an off-white linen kurta, slim charcoal trousers, tan leather loafers, steel wristwatch",
  "image": "outfits/nehru-charcoal.jpg"
}
```

- `prompt` is the exact garment wording that goes into the prompts, top to bottom.
- `image` is optional. It shows the outfit in the picker and is sent as a reference image when it helps the model.
- `for` filters the list by the Speaker choice (man, woman, person).

### Screen

- Step 1 gets an **Outfit** section: a scrollable grid of outfit cards (image, name, category), with category filter
  chips, and a first card **"Default (no outfit chosen)"** that is selected at start.
- The "Look" chips become part of this grid, so there is one place to choose clothes.
- On phones the grid is two columns and scrolls inside the step.

### Prompt rules

| Situation | Character sheet prompt (when creating from a selfie) | Video prompt, `@Image1` paragraph |
| --- | --- | --- |
| No outfit chosen | Uses today's default outfit | Outfit read from the sheet, or the default wording |
| Outfit chosen, sheet created in the app with it | RIGHT side shows the chosen outfit's `prompt` | "outfit from the right side: `<prompt>`" |
| Outfit chosen, sheet uploaded or made with a different outfit | Not used | "wearing `<prompt>`", and the outfit image goes in as `@Image3` with "the outfit from `@Image3`" |

- The step 1 card warns when the sheet was made with a different outfit than the one now chosen, with a one-tap
  **Recreate sheet with this outfit** button (uses credits, never automatic).
- The "Anything to add or change" notes still apply on top of any outfit.

**Done when:** for each row of the table, the prompts sent to the image and video models contain the right outfit text
and images, checked in a mocked browser test and on a phone-width screen.

---

## Phase 2: set (background) library

**Goal:** 10–12 of your own backgrounds to pick from. Choosing one fills the scene part of the video prompt
automatically. Choosing none keeps today's upload-or-create flow.

### Set entry (`sets.json`)

```json
{
  "id": "architect-studio-window",
  "name": "Studio with window",
  "image": "sets/architect-studio-window.jpg",
  "aspect": "9:16",
  "hasChairAndMic": true,
  "scene": "an architect's working studio with ochre plaster walls, a tall window on the left, teak bookshelves with white models and a drafting table with rolled drawings",
  "seat": "deep teal velvet armchair with rolled arms",
  "microphone": true,
  "light": "day"
}
```

- `scene`, `seat`, `microphone` and `light` are written once per image, by looking at it. The video prompt uses them
  directly, so it is accurate even without a fal.ai key.
- `hasChairAndMic` says whether the image already shows the podcast chair and the boom-arm mic.

### Images with no chair or mic

For backgrounds that are only a room, step 2 offers **Add chair and mic**. It runs one image edit (uses credits, never
automatic). The edit places the chosen chair (step 2 chair chips) and a black boom-arm mic in the talking-head framing,
and keeps the room unchanged. The result becomes the set for this browser, and the scene text from `sets.json` still
applies.

### Screen

- Step 2 gets a third tab: **Library** (next to "I have a set image" and "Create a set"). It shows the preset images in
  a grid. Tapping one selects it and shows it large in the preview.
- A badge on each card says "Chair and mic included" or "Room only".

### Prompt rules

| Situation | `@Image2` sent to the video model | Scene paragraph |
| --- | --- | --- |
| Library set with chair and mic | The library image | `scene`, `seat`, `microphone`, `light` from `sets.json` |
| Library room plus "Add chair and mic" | The edited image | Same fields, seat from the chosen chair |
| No library set chosen | Uploaded or generated set, as today | As today |

Library images are uploaded to the chosen provider (kie.ai or fal.ai) when picked, because the video model needs a
public link. Uploading is free.

**Done when:** each row of the table produces the right `@Image2` and scene text in a mocked browser test, "Add chair
and mic" sends one edit request with the right prompt, and the grid works at 360 px.

---

## Phase 3: reference video

**Goal:** upload a reference clip and use it in one of two ways.

| Mode | What it means | How it reaches Seedance |
| --- | --- | --- |
| **Copy the performance** | Keep the clip's body movement, gestures, pacing and camera framing, but replace the person with your architect and the room with your set | Clip sent as `@Video1` in `reference_video_urls`. The prompt says: follow the movement, gestures, timing and camera of `@Video1`; take the person only from `@Image1` and the scene only from `@Image2`; use no face, clothing or background from `@Video1` |
| **Use the script** | Take the words spoken in the clip | The clip is transcribed (needs a fal.ai key). The script is shown with a copy button so the architect can record it in their own voice for the Voice step (step 4 since Phase 3) |

### Limits the app checks before upload

Seedance 2.5 on kie.ai accepts reference videos that are:

- MP4 or MOV
- 2–30 seconds long
- 24–60 frames per second
- 480p or 720p, with 409,600–927,408 pixels in total (720 × 1280 is fine, 1080 × 1920 is too large)
- under 200 MB

The app reads length and size in the browser. A clip that is too large or too long gets a clear message on how to
export it (720p, 30 s or less). Automatic downscaling is not in scope for the first version.

These limits are for **Copy the performance**. For **Use the script**, only the sound is used, so any size and frame
rate works, up to 3 minutes.

### Important limits

- **Real faces:** Seedance refuses reference videos that show a real, identifiable person, just as it refuses
  character sheets. "Copy the performance" works only with clips without identifiable faces, or through the verified
  portrait route.
- **Rights:** a reference clip is someone's footage, and its words are their script. The upload screen asks the user to
  confirm they have the right to use the clip and its script. The app does not reuse another person's voice: "Use the
  script" only gives the words, to be recorded by the architect.

**Done when:** both modes produce the right request in a mocked browser test (`reference_video_urls` and `@Video1`
wording for "Copy the performance", script text for "Use the script"), the limit checks reject a 1080p clip and a 40 s
clip with clear messages, and the screen works at 360 px.

---

## Reference tags after all phases

| Tag | Content | When |
| --- | --- | --- |
| `@Image1` | Character sheet, or verified portrait `asset://` | Always |
| `@Image2` | Set: library, uploaded or generated | Always |
| `@Image3` | Outfit image | Only when Phase 1's third row applies |
| `@Video1` | Reference clip for performance | Only in "Copy the performance" mode |
| `@Audio1` | Voice track | Always |

The prompt builder adds a tag's paragraph only when that tag is sent, so the text and the files always line up.

---

## How each phase is checked

1. A mocked browser test of the new behaviour, plus the existing flow, so nothing else breaks.
2. Layout checks at 360, 390 and 768 px with touch, with no sideways scrolling.
3. The prompt text for each case is printed and checked against the tables above.
4. Each phase is committed and pushed on its own, and you try it before the next phase starts.

---

## Open questions, and the defaults used for now

Each of these can be changed later by editing the library files or asking for a change.

| # | Question | Default used for now |
| --- | --- | --- |
| 1 | Outfit images, names and wording | Five outfits without images (colour swatches instead). Add your own as described below |
| 2 | Which speakers each outfit is for | All outfits show for man, woman and person |
| 3 | Keep the four "Looks" or replace them | Kept, as the first library outfits |
| 4 | The 10–12 background images | Two presets so far: Architect studio and Teal velvet |
| 5 | Do the backgrounds show the chair and mic | Both presets do. "Room only" images get **Add chair and mic** |
| 6 | Library as the default tab in step 2 | Yes |
| 7 | Which reference mode first | Both are built |
| 8 | A sample reference clip | Tested with generated test clips. Please try one real clip |

## What you add next

1. **Outfits:** for each outfit, a front-view image on a plain background (no person's face), saved in
   `public/library/outfits/`, and an entry in `public/library/outfits.json` with its name, category and exact wording.
2. **Backgrounds:** 10–12 vertical (9:16) images with no people, text or watermarks, saved in `public/library/sets/`
   with a small copy in `public/library/sets/thumbs/`, and an entry in `public/library/sets.json` for each. Set
   `hasChairAndMic` to `true` if the image already shows the podcast chair and the boom-arm mic, or `false` for a plain
   room, and describe the room in one sentence in `scene`.

Every field is explained in [public/library/README.md](public/library/README.md). Nothing in the code needs to change.
