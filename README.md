# Zelda Lofi

A cozy, browser-based lofi music player themed around *The Legend of Zelda* series. Pair ambient soundscapes with 77 lofi remixes (credit to original artists), track your focus sessions with a Pomodoro timer styled after Zelda's heart system, and study or chill in a Sheikah terminal aesthetic.

Live at **[zelda-lofi.vercel.app](https://zelda-lofi.vercel.app)**

---

## Features

### Music Player
- **77 lofi tracks** sourced from talented lofi compliations on YouTube across the Zelda series — Ocarina of Time, Breath of the Wild, Tears of the Kingdom, Majora's Mask, The Wind Waker, Twilight Princess, Skyward Sword, Link's Awakening, A Link to the Past, and more. 77 tracks at launch provide more than 3.5 hours of music.
- Shuffle mode with Fisher-Yates queue (no immediate repeats)
- Seek bar, volume control, prev/next navigation
- **Media Session API** integration — control playback from your OS lock screen or media keys
- Full scrollable playlist with game labels
- Mini-player visible in the collapsed panel handle bar

### Ambient Mixer
- **6 looping ambient sounds**: Rain, Thunderstorm, Campfire, Kokiri Forest, Ocean Waves, Cave Drips
- Mix multiple sounds simultaneously with individual volume sliders
- Web Audio API with smooth fade in/out transitions
- Lazy-loaded audio buffers — only fetched when first activated

### Pomodoro Timer
- Configurable focus (1–180 min) and break (1–60 min) durations
- Heart count configurable from 3–20
- **8-bit pixel art hearts** (inline SVG) drain during focus sessions and refill during breaks
- Compact HUD overlay visible at all times once started
- Settings persist across sessions via `localStorage`

### Keyboard Shortcuts

| Key     | Action                   |
|---------|--------------------------|
| `Space` | Toggle play / pause      |
| `N`     | Next track               |
| `P`     | Previous track           |
| `M`     | Mute / unmute            |

---

## Tech Stack

- **Vanilla JS (ES Modules)** — zero runtime dependencies
- **Vite** — bundler and dev server
- **Web Audio API** — ambient sound mixing
- **CSS Custom Properties** — Sheikah-inspired design system with glassmorphism
- **Google Fonts** — Cinzel, Lora, JetBrains Mono
- **Vercel** — deployment

---

## Project Structure

```
zelda-lofi/
├── index.html
├── vite.config.js
├── src/
│   ├── main.js                  # Entry point, state persistence, keyboard shortcuts
│   ├── style.css                # All styles (~830 lines)
│   ├── data/
│   │   ├── playlist.js          # 77 track definitions {id, title, game, src}
│   │   └── ambients.js          # 6 ambient sound definitions
│   └── modules/
│       ├── music-player.js      # Playback, shuffle, seek, Media Session API
│       ├── ambient-mixer.js     # Web Audio API mixer with fades
│       ├── pomodoro-timer.js    # Timer with pixel heart UI
│       └── panel.js             # Bottom drawer panel, tab switching, swipe gestures
├── public/
│   ├── lofi_girl_zelda.png      # Background artwork
│   └── audio/
│       ├── ambient/             # 6 OGG looping ambients
│       └── music/               # 77 MP3 lofi tracks
└── scripts/
    └── download-tracks.sh       # Utility to download + split tracks from YouTube
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Adding Tracks

The `scripts/download-tracks.sh` utility downloads audio from YouTube and auto-splits by chapter using `yt-dlp` and `ffmpeg`.

**Requirements:** `yt-dlp`, `ffmpeg`, `jq`

```bash
# Download and split a YouTube video into tracks
./scripts/download-tracks.sh "https://youtube.com/watch?v=..." [output-dir]
```

The script will:
1. Download audio-only as MP3
2. Read chapter metadata to split into individual files
3. Sanitize filenames (lowercase, spaces → hyphens)
4. Print ready-to-paste `playlist.js` entry suggestions

Default output directory is `public/audio/music/`. Pass a second argument to change it (e.g., for ambient sounds).

After downloading, add the new entries to `src/data/playlist.js`:

```js
{ id: 'track-id', title: 'Track Title', game: 'Game Name', src: '/audio/music/track-id.mp3' }
```

---

## State Persistence

App state is saved to `localStorage` under the key `zelda-lofi-state` every 5 seconds and on page unload. The persisted shape is:

```json
{
  "music": { "currentIndex": 0, "shuffle": false, "volume": 0.7 },
  "ambients": { "rain": { "active": true, "volume": 0.5 } },
  "timer": { "focusMinutes": 25, "breakMinutes": 5, "heartCount": 5 }
}
```

Timer position (remaining seconds) is not persisted across sessions.

---

## Design System

The UI uses a "dark fantasy meets cozy lofi" Sheikah terminal aesthetic.

| Variable            | Value       | Usage                       |
|---------------------|-------------|-----------------------------|
| `--sheikah-blue`    | `#4a9eff`   | Primary accent, controls    |
| `--rupee-red`       | `#e63946`   | Hearts, destructive actions |
| `--triforce-gold`   | `#d4a843`   | Title, logo                 |
| `--kokiri-green`    | `#2d6a4f`   | Accent green                |
| `--twilight-purple` | `#5e548e`   | Accent purple               |
| `--twilight-deep`   | `#1a1333`   | Background depth            |
| `--panel-bg`        | `rgba(8,4,18,0.55)` | Glassmorphism panel |

---

## License

Personal project. Zelda music and characters are © Nintendo. All lofi remixes belong to their respective creators.

Music track sources:
Zelda's Lofi Kingdom, by GameChops and jokabi: https://www.youtube.com/watch?v=Z3GA0GQCE2M
Zelda & Chill Trilogy, by GameChops: https://www.youtube.com/watch?v=oCaOSz13h_o
Zelda & Jazz, by GameChops: https://www.youtube.com/watch?v=OH69pRR5OfI

Ambient sounds from freesound.org