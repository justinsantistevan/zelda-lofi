import { ambients } from '../data/ambients.js'

export function initAmbientMixer(audioContext) {
  const grid = document.getElementById('ambient-grid')
  const sounds = new Map()

  // Route Web Audio output through a hidden <audio> element so ambient sounds
  // continue playing on mobile lock screens and through AirPlay/remote speakers.
  const streamDest = audioContext.createMediaStreamDestination()
  const carrierAudio = document.createElement('audio')
  carrierAudio.srcObject = streamDest.stream
  carrierAudio.setAttribute('playsinline', '')

  function updateCarrier() {
    const anyActive = [...sounds.values()].some(({ state }) => state.active)
    if (anyActive) {
      carrierAudio.play().catch(() => {})
    } else {
      carrierAudio.pause()
    }
  }

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
    const state = {
      active: false,
      volume: 0.4,
      buffer: null,
      source: null,
      gainNode: audioContext.createGain(),
    }
    state.gainNode.gain.value = 0
    state.gainNode.connect(streamDest)
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
        state.gainNode.gain.setTargetAtTime(vol, audioContext.currentTime, 0.05)
      }
    })
  })

  async function loadBuffer(def) {
    const response = await fetch(def.src)
    const arrayBuffer = await response.arrayBuffer()
    return audioContext.decodeAudioData(arrayBuffer)
  }

  async function toggleSound(id) {
    const entry = sounds.get(id)
    if (!entry) return

    const { def, state, card, slider } = entry

    if (state.active) {
      // Fade out and stop
      state.active = false
      card.classList.remove('active')
      state.gainNode.gain.setTargetAtTime(0, audioContext.currentTime, 0.08)
      updateCarrier()
      // Stop source after fade
      const src = state.source
      if (src) {
        setTimeout(() => {
          try { src.stop() } catch {}
          state.source = null
        }, 300)
      }
    } else {
      // Load buffer if needed
      if (!state.buffer) {
        try {
          state.buffer = await loadBuffer(def)
        } catch {
          return // audio file not available
        }
      }

      // Create and start looping source
      const source = audioContext.createBufferSource()
      source.buffer = state.buffer
      source.loop = true
      source.connect(state.gainNode)
      source.start()
      state.source = source

      state.active = true
      card.classList.add('active')
      state.gainNode.gain.setTargetAtTime(state.volume, audioContext.currentTime, 0.05)
      updateCarrier()
    }
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
