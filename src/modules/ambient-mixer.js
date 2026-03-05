import { ambients } from '../data/ambients.js'

export function initAmbientMixer() {
  const grid = document.getElementById('ambient-grid')
  const sounds = new Map()

  // Build UI and initialize state for each ambient sound
  ambients.forEach((def) => {
    const card = document.createElement('div')
    card.className = 'ambient-card'
    card.dataset.sound = def.id
    card.innerHTML = `
      <span class="ambient-icon">${def.icon}</span>
      <span class="ambient-label">${def.label}</span>
      <input type="range" class="ambient-volume" min="0" max="100" value="40" aria-label="${def.label} volume" />
    `
    grid.appendChild(card)

    const slider = card.querySelector('.ambient-volume')

    // Use a standard <audio> element so playback routes through AirPlay,
    // Bluetooth, and persists on mobile lock screens.
    const audio = new Audio(def.src)
    audio.loop = true
    audio.preload = 'none'
    audio.volume = 0

    const state = { active: false, volume: 0.4, audio }
    sounds.set(def.id, { def, state, card, slider })

    // Toggle on card click (but not on slider interaction)
    card.addEventListener('click', (e) => {
      if (e.target === slider) return
      toggleSound(def.id)
    })

    slider.addEventListener('input', (e) => {
      e.stopPropagation()
      const vol = e.target.value / 100
      state.volume = vol
      if (state.active) {
        audio.volume = vol
      }
    })
  })

  function toggleSound(id) {
    const entry = sounds.get(id)
    if (!entry) return

    const { state, card } = entry

    if (state.active) {
      state.active = false
      card.classList.remove('active')
      // Fade out then pause
      fadeVolume(state.audio, 0, 200, () => {
        state.audio.pause()
      })
    } else {
      state.active = true
      card.classList.add('active')
      state.audio.volume = 0
      state.audio.play().then(() => {
        fadeVolume(state.audio, state.volume, 200)
      }).catch(() => {})
    }
  }

  function fadeVolume(audio, target, durationMs, onDone) {
    const start = audio.volume
    const diff = target - start
    if (Math.abs(diff) < 0.01) {
      audio.volume = target
      if (onDone) onDone()
      return
    }
    const steps = 10
    const stepMs = durationMs / steps
    let step = 0
    const interval = setInterval(() => {
      step++
      if (step >= steps) {
        clearInterval(interval)
        audio.volume = target
        if (onDone) onDone()
      } else {
        audio.volume = start + diff * (step / steps)
      }
    }, stepMs)
  }

  return {
    getState() {
      const result = {}
      sounds.forEach(({ state }, id) => {
        result[id] = { active: state.active, volume: state.volume }
      })
      return result
    },
    restore(saved) {
      if (!saved) return
      sounds.forEach(({ state, slider }, id) => {
        if (saved[id]) {
          state.volume = saved[id].volume ?? 0.4
          slider.value = state.volume * 100
          if (saved[id].active) toggleSound(id)
        }
      })
    },
  }
}
