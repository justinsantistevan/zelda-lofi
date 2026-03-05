import { playlist } from '../data/playlist.js'

export function initMusicPlayer() {
  const audio = new Audio()
  audio.preload = 'metadata'

  let currentIndex = 0
  let shuffle = false
  let isPlaying = false
  let shuffleQueue = []
  let shufflePos = -1

  // DOM elements
  const trackTitle = document.getElementById('track-title')
  const trackGame = document.getElementById('track-game')
  const timeCurrent = document.getElementById('time-current')
  const timeTotal = document.getElementById('time-total')
  const seekBar = document.getElementById('seek-bar')
  const btnPlayPause = document.getElementById('btn-play-pause')
  const btnPrev = document.getElementById('btn-prev')
  const btnNext = document.getElementById('btn-next')
  const btnShuffle = document.getElementById('btn-shuffle')
  const volumeSlider = document.getElementById('volume-slider')
  const miniPlayPause = document.getElementById('mini-play-pause')
  const miniTrackName = document.getElementById('mini-track-name')
  const miniVolume = document.getElementById('mini-volume')
  const trackList = document.getElementById('track-list')

  function formatTime(s) {
    if (!isFinite(s)) return '0:00'
    const mins = Math.floor(s / 60)
    const secs = Math.floor(s % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  function loadTrack(index) {
    currentIndex = index
    const track = playlist[currentIndex]
    audio.src = track.src
    trackTitle.textContent = track.title
    trackGame.textContent = track.game
    miniTrackName.textContent = track.title

    // Update active state in playlist
    trackList.querySelectorAll('li').forEach((li, i) => {
      li.classList.toggle('active', i === currentIndex)
    })

    updateMediaSession(track)
  }

  function play() {
    audio.play().then(() => {
      isPlaying = true
      updatePlayPauseIcons()
    }).catch(() => {})
  }

  function pause() {
    audio.pause()
    isPlaying = false
    updatePlayPauseIcons()
  }

  function togglePlay() {
    if (isPlaying) pause()
    else play()
  }

  function buildShuffleQueue() {
    shuffleQueue = Array.from({ length: playlist.length }, (_, i) => i)
    for (let i = shuffleQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffleQueue[i], shuffleQueue[j]] = [shuffleQueue[j], shuffleQueue[i]]
    }
    shufflePos = -1
  }

  function nextTrack() {
    if (shuffle) {
      shufflePos++
      if (shufflePos >= shuffleQueue.length) buildShuffleQueue()
      // Skip if we'd repeat the current track at queue boundary
      if (shuffleQueue[shufflePos] === currentIndex && playlist.length > 1) {
        shufflePos++
        if (shufflePos >= shuffleQueue.length) buildShuffleQueue()
      }
      loadTrack(shuffleQueue[shufflePos])
    } else {
      loadTrack((currentIndex + 1) % playlist.length)
    }
    if (isPlaying) play()
  }

  function prevTrack() {
    if (audio.currentTime > 3) {
      audio.currentTime = 0
    } else if (shuffle && shufflePos > 0) {
      shufflePos--
      loadTrack(shuffleQueue[shufflePos])
      if (isPlaying) play()
    } else {
      loadTrack((currentIndex - 1 + playlist.length) % playlist.length)
      if (isPlaying) play()
    }
  }

  function setVolume(val) {
    audio.volume = val / 100
    volumeSlider.value = val
    miniVolume.value = val
  }

  function updatePlayPauseIcons() {
    const elements = [btnPlayPause, miniPlayPause]
    elements.forEach((btn) => {
      const playIcon = btn.querySelector('.icon-play')
      const pauseIcon = btn.querySelector('.icon-pause')
      playIcon.style.display = isPlaying ? 'none' : ''
      pauseIcon.style.display = isPlaying ? '' : 'none'
    })
  }

  function updateMediaSession(track) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: 'Zelda Lofi',
        album: track.game,
      })
      navigator.mediaSession.setActionHandler('play', play)
      navigator.mediaSession.setActionHandler('pause', pause)
      navigator.mediaSession.setActionHandler('previoustrack', prevTrack)
      navigator.mediaSession.setActionHandler('nexttrack', nextTrack)
    }
  }

  // Build playlist UI
  playlist.forEach((track, i) => {
    const li = document.createElement('li')
    li.innerHTML = `
      <span class="track-number">${(i + 1).toString().padStart(2, '0')}</span>
      <span class="track-name">${track.title}</span>
      <span class="track-game-label" style="font-family:var(--font-mono);font-size:0.65rem;color:var(--panel-text-muted)">${track.game}</span>
    `
    li.addEventListener('click', () => {
      loadTrack(i)
      play()
    })
    trackList.appendChild(li)
  })

  // Event listeners
  btnPlayPause.addEventListener('click', togglePlay)
  miniPlayPause.addEventListener('click', (e) => { e.stopPropagation(); togglePlay() })
  btnNext.addEventListener('click', nextTrack)
  btnPrev.addEventListener('click', prevTrack)

  btnShuffle.addEventListener('click', () => {
    shuffle = !shuffle
    btnShuffle.classList.toggle('active', shuffle)
    if (shuffle) buildShuffleQueue()
  })

  volumeSlider.addEventListener('input', (e) => setVolume(e.target.value))
  miniVolume.addEventListener('input', (e) => { e.stopPropagation(); setVolume(e.target.value) })

  // Audio events
  audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return
    timeCurrent.textContent = formatTime(audio.currentTime)
    seekBar.value = (audio.currentTime / audio.duration) * 100
  })

  audio.addEventListener('loadedmetadata', () => {
    timeTotal.textContent = formatTime(audio.duration)
    seekBar.value = 0
  })

  audio.addEventListener('ended', nextTrack)

  seekBar.addEventListener('input', (e) => {
    if (audio.duration) {
      audio.currentTime = (e.target.value / 100) * audio.duration
    }
  })

  // Initialize
  setVolume(70)
  loadTrack(0)

  return {
    play,
    pause,
    togglePlay,
    nextTrack,
    prevTrack,
    setVolume,
    getState() {
      return { currentIndex, shuffle, volume: audio.volume * 100 }
    },
    restore(state) {
      if (state.shuffle !== undefined) {
        shuffle = state.shuffle
        btnShuffle.classList.toggle('active', shuffle)
      }
      if (state.volume !== undefined) setVolume(state.volume)
      if (state.currentIndex !== undefined) loadTrack(state.currentIndex)
    },
  }
}
