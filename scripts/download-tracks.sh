#!/usr/bin/env bash
set -euo pipefail

# Download audio from YouTube and split by chapters into individual MP3 tracks.
# Usage:
#   ./scripts/download-tracks.sh "URL"                      # -> public/audio/music/
#   ./scripts/download-tracks.sh "URL" public/audio/ambient  # -> custom output dir

URL="${1:?Usage: $0 <youtube-url> [output-dir]}"
OUTPUT_DIR="${2:-public/audio/music}"
TMPDIR_BASE="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_BASE"' EXIT

# Ensure dependencies
for cmd in yt-dlp ffmpeg jq; do
  command -v "$cmd" &>/dev/null || { echo "Error: $cmd is required. Install via: brew install $cmd"; exit 1; }
done

mkdir -p "$OUTPUT_DIR"

# Sanitize a string into a clean filename
sanitize() {
  local name="$1"
  name=$(echo "$name" | tr '[:upper:]' '[:lower:]')  # lowercase
  name=$(echo "$name" | sed 's/[^a-z0-9 -]//g')      # strip special chars
  name=$(echo "$name" | sed 's/  */ /g; s/^ //; s/ $//')  # collapse spaces
  name=$(echo "$name" | sed 's/ /-/g')                # spaces to hyphens
  name=$(echo "$name" | cut -c1-60)                   # truncate to 60 chars
  echo "$name"
}

# Resolve duplicate filenames by appending -2, -3, etc.
unique_path() {
  local dir="$1" base="$2" ext="$3"
  local candidate="$dir/$base.$ext"
  local n=2
  while [[ -f "$candidate" ]]; do
    candidate="$dir/$base-$n.$ext"
    ((n++))
  done
  echo "$candidate"
}

# Process a single downloaded video + its JSON sidecar
process_video() {
  local mp3_file="$1" json_file="$2"
  local suggestions=()

  # Check for chapters in the JSON metadata
  local chapter_count
  chapter_count=$(jq '.chapters // [] | length' "$json_file")

  if [[ "$chapter_count" -gt 0 ]]; then
    echo "  Found $chapter_count chapters — splitting..."
    for i in $(seq 0 $((chapter_count - 1))); do
      local start end title
      start=$(jq -r ".chapters[$i].start_time" "$json_file")
      end=$(jq -r ".chapters[$i].end_time" "$json_file")
      title=$(jq -r ".chapters[$i].title" "$json_file")

      local clean
      clean=$(sanitize "$title")
      [[ -z "$clean" ]] && clean="track-$((i + 1))"

      local dest
      dest=$(unique_path "$OUTPUT_DIR" "$clean" "mp3")
      local basename
      basename=$(basename "$dest")

      echo "    [$((i + 1))/$chapter_count] $title -> $basename"
      ffmpeg -nostdin -v quiet -i "$mp3_file" -ss "$start" -to "$end" -c copy "$dest"
      suggestions+=("$basename|$title")
    done
  else
    echo "  No chapters found — keeping as single track."
    local video_title
    video_title=$(jq -r '.title // "unknown"' "$json_file")
    local clean
    clean=$(sanitize "$video_title")
    [[ -z "$clean" ]] && clean="unknown-track"

    local dest
    dest=$(unique_path "$OUTPUT_DIR" "$clean" "mp3")
    local basename
    basename=$(basename "$dest")

    cp "$mp3_file" "$dest"
    suggestions+=("$basename|$video_title")
  fi

  # Print playlist.js suggestions
  if [[ ${#suggestions[@]} -gt 0 ]]; then
    echo ""
    echo "  Suggested playlist.js entries:"
    echo "  --------------------------------"
    for entry in "${suggestions[@]}"; do
      local file title id
      file="${entry%%|*}"
      title="${entry##*|}"
      id="${file%.mp3}"
      cat <<ENTRY
  {
    id: '$id',
    title: '$title',
    game: 'FILL_IN',
    src: '/audio/music/$file',
  },
ENTRY
    done
    echo "  --------------------------------"
  fi
}

echo "Downloading from: $URL"
echo "Output directory: $OUTPUT_DIR"
echo ""

# Download audio-only + metadata JSON to temp dir
yt-dlp \
  -x --audio-format mp3 --audio-quality 0 \
  --write-info-json \
  --output "$TMPDIR_BASE/%(id)s.%(ext)s" \
  --no-playlist-reverse \
  "$URL"

# Process each downloaded video
for json_file in "$TMPDIR_BASE"/*.info.json; do
  [[ -f "$json_file" ]] || continue

  local_id=$(basename "$json_file" .info.json)
  mp3_file="$TMPDIR_BASE/$local_id.mp3"

  if [[ ! -f "$mp3_file" ]]; then
    echo "Warning: no MP3 found for $local_id, skipping."
    continue
  fi

  video_title=$(jq -r '.title // "unknown"' "$json_file")
  echo "Processing: $video_title"
  process_video "$mp3_file" "$json_file"
  echo ""
done

echo "Done! Files saved to $OUTPUT_DIR"
