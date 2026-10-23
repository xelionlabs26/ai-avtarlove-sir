# Library: outfits and preset sets

The app reads two files from this folder when it starts:

- `outfits.json` lists the outfits shown in step 1.
- `sets.json` lists the preset backgrounds shown in step 2.

To add an entry, add its image to the right folder, add a block to the JSON file, then commit and push. The site
updates about a minute later. If a file is missing or has a mistake, the app still works: the outfit list falls back to
one default outfit, and the set library is simply empty.

Each block goes inside the list in its file (`"outfits": [ … ]` or `"sets": [ … ]`), with a comma between blocks. On
the GitHub website, open the folder (`public/library/outfits/` or `public/library/sets/`) and use **Add file → Upload
files** to add images.

## Outfits (`outfits.json`)

```json
{
  "id": "nehru-charcoal",
  "name": "Charcoal Nehru jacket",
  "hint": "Nehru jacket, kurta",
  "category": "Indo-western",
  "for": ["man", "woman", "person"],
  "default": false,
  "prompt": "charcoal-grey Nehru jacket over an off-white linen kurta, slim charcoal trousers, tan leather loafers, steel wristwatch",
  "image": "outfits/nehru-charcoal.jpg",
  "colors": ["#3a3d42", "#efe8da"]
}
```

| Field | Required | What it does |
| --- | --- | --- |
| `id` | Yes | Unique name, letters, numbers and dashes. Do not change it once used. |
| `name` | Yes | Shown on the outfit card. |
| `hint` | No | Short line under the name. |
| `category` | No | Groups outfits under filter chips (for example "Indo-western", "Smart casual"). |
| `for` | No | Which Speaker choices show it: `man`, `woman`, `person`. Leave it out to show it for everyone. |
| `default` | No | `true` on exactly one outfit: used when no outfit is chosen. |
| `prompt` | Yes* | The exact garment wording put into the prompts, top to bottom, with colours and materials. |
| `fromPhoto` | No | `true` for "keep the clothes in my photo". Then `prompt` can be `null`. |
| `image` | No | A photo of the outfit (front view, plain background, no person's face). Shown on the card and sent to the models as an outfit reference. Put the file in `outfits/`. |
| `colors` | No | Up to four hex colours, shown on the card when there is no image. |

Outfit images: JPG or PNG, about 1000 px tall, a front view of the full outfit on a plain background, ideally on a
ghost mannequin or laid flat. Do not use photos that show a real person's face.

## Preset sets (`sets.json`)

```json
{
  "id": "architect-studio-window",
  "name": "Architect studio",
  "image": "sets/architect-studio-window.jpg",
  "thumb": "sets/thumbs/architect-studio-window.jpg",
  "aspect": "9:16",
  "hasChairAndMic": true,
  "scene": "an architect's working studio with ochre plaster walls, a tall window on the left, teak bookshelves with white models and a drafting table with rolled drawings",
  "seat": "deep teal velvet armchair with rolled arms",
  "microphone": true,
  "light": "day"
}
```

| Field | Required | What it does |
| --- | --- | --- |
| `id` | Yes | Unique name. |
| `name` | Yes | Shown on the card. |
| `image` | Yes | The full image, in `sets/`. Vertical 9:16, at least 768 × 1376 px. |
| `thumb` | No | A small copy (about 240 px wide) in `sets/thumbs/`, so the grid loads fast on phones. |
| `aspect` | No | `9:16` (default), `16:9`, `3:4`, `4:3`, `1:1` or `21:9`. Sets the shape of the video. |
| `hasChairAndMic` | No | `true` if the image already shows the podcast chair and the boom-arm mic. `false` for a plain room: the app then offers "Add chair and mic". |
| `scene` | Yes* | One sentence describing the room, its walls, furniture and props. It goes into the video prompt as written. |
| `seat` | No | The chair as it should be named in the prompt. For a plain room, the chair chosen in the app is used instead. |
| `microphone` | No | `false` if there is no microphone in the picture. |
| `light` | No | `day`, `soft`, `warm` or `moody`. Picks the lighting words in the video prompt. |

Set images: no people, no text or captions, no watermarks. The talking-head framing works best: the chair in the lower
half, slightly right of centre, the mic on a boom arm from the left, the room behind.
