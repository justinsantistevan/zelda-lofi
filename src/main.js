import './style.css'
import { initPanel } from './modules/panel.js'
import { initMusicPlayer } from './modules/music-player.js'
import { initAmbientMixer } from './modules/ambient-mixer.js'
import { initPomodoroTimer } from './modules/pomodoro-timer.js'

const STATE_KEY = 'zelda-lofi-state'

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STATE_KEY)) || {}
  } catch {
    return {}
  }
}

function saveState(player, mixer, timer) {
  const state = {
    music: player.getState(),
    ambients: mixer.getState(),
    timer: timer.getState(),
  }
  localStorage.setItem(STATE_KEY, JSON.stringify(state))
}

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('start-overlay')
  const panel = initPanel()
  const timer = initPomodoroTimer()

  let player = null
  let mixer = null

  // Start overlay — gates all audio
  overlay.addEventListener('click', () => {
    overlay.classList.add('hidden')

    // Initialize audio systems
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    player = initMusicPlayer()
    mixer = initAmbientMixer(audioContext)

    // Restore saved state
    const saved = loadState()
    if (saved.music) player.restore(saved.music)
    if (saved.ambients) mixer.restore(saved.ambients)
    if (saved.timer) timer.restore(saved.timer)

    // Auto-play first track
    player.play()

    // Periodically save state
    setInterval(() => saveState(player, mixer, timer), 5000)

    // Save on page unload
    window.addEventListener('beforeunload', () => saveState(player, mixer, timer))

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Don't capture when typing in inputs
      if (e.target.tagName === 'INPUT') return

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault()
          player.togglePlay()
          break
        case 'n':
          player.nextTrack()
          break
        case 'p':
          player.prevTrack()
          break
        case 'm':
          player.setVolume(player.getState().volume > 0 ? 0 : 70)
          break
      }
    })

    // Remove overlay from DOM after transition
    overlay.addEventListener('transitionend', () => {
      overlay.remove()
    })
  })
})
