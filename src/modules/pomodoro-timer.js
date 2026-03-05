export function initPomodoroTimer() {
  const heartRow = document.getElementById('heart-row')
  const timerDisplay = document.getElementById('timer-display')
  const timerToggle = document.getElementById('timer-toggle')
  const hudToggleBtn = document.getElementById('timer-hud-toggle')
  const largeHeartRow = document.getElementById('large-heart-row')
  const largeTimerText = document.getElementById('large-timer-text')
  const timerPhase = document.getElementById('timer-phase')
  const focusInput = document.getElementById('focus-min')
  const breakInput = document.getElementById('break-min')
  const heartCountInput = document.getElementById('heart-count')
  const timerStart = document.getElementById('timer-start')
  const timerReset = document.getElementById('timer-reset')
  const hud = document.getElementById('pomodoro-hud')

  // Input validation limits
  const LIMITS = {
    focus: { min: 1, max: 180 },
    break: { min: 1, max: 60 },
    hearts: { min: 3, max: 20 },
  }

  let state = {
    mode: 'idle', // idle | focus | break
    focusDuration: 25 * 60,
    breakDuration: 5 * 60,
    heartCount: 5,
    timeRemaining: 25 * 60,
    totalTime: 25 * 60,
    interval: null,
  }

  // Clamp input values on change and blur
  function clampInput(input, min, max) {
    function enforce() {
      let val = parseInt(input.value)
      if (isNaN(val)) val = min
      input.value = Math.max(min, Math.min(max, val))
    }
    input.addEventListener('blur', enforce)
    input.addEventListener('change', enforce)
  }

  clampInput(focusInput, LIMITS.focus.min, LIMITS.focus.max)
  clampInput(breakInput, LIMITS.break.min, LIMITS.break.max)
  clampInput(heartCountInput, LIMITS.hearts.min, LIMITS.hearts.max)

  // 8-bit heart as inline SVG (pixel art style)
  function createHeartSVG(filled = true) {
    const pixelSize = 3
    const pixels = [
      [1,0],[2,0],[4,0],[5,0],
      [0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],
      [0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],
      [0,3],[1,3],[2,3],[3,3],[4,3],[5,3],[6,3],
      [1,4],[2,4],[3,4],[4,4],[5,4],
      [2,5],[3,5],[4,5],
      [3,6],
    ]

    const w = 7 * pixelSize
    const h = 7 * pixelSize
    const rects = pixels.map(([x, y]) =>
      `<rect x="${x * pixelSize}" y="${y * pixelSize}" width="${pixelSize}" height="${pixelSize}" />`
    ).join('')

    return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="image-rendering:pixelated">
      <g fill="${filled ? '#e63946' : 'rgba(255,255,255,0.12)'}">${rects}</g>
    </svg>`
  }

  function renderHearts(container, size = 'normal') {
    container.innerHTML = ''
    for (let i = 0; i < state.heartCount; i++) {
      const heart = document.createElement('div')
      heart.className = 'pixel-heart'
      if (size === 'large') {
        heart.style.width = '36px'
        heart.style.height = '32px'
      }
      const emptyLayer = document.createElement('div')
      emptyLayer.className = 'pixel-heart-empty'
      emptyLayer.innerHTML = createHeartSVG(false)

      const fullLayer = document.createElement('div')
      fullLayer.className = 'pixel-heart-full'
      fullLayer.innerHTML = createHeartSVG(true)
      fullLayer.dataset.index = i

      heart.appendChild(emptyLayer)
      heart.appendChild(fullLayer)
      container.appendChild(heart)
    }
  }

  function updateHearts() {
    const elapsed = state.totalTime - state.timeRemaining
    const progress = elapsed / state.totalTime

    const containers = [heartRow, largeHeartRow]
    containers.forEach((container) => {
      const hearts = container.querySelectorAll('.pixel-heart-full')
      hearts.forEach((heart, i) => {
        if (state.mode === 'focus') {
          // Drain right-to-left: rightmost heart empties first
          const heartIndex = state.heartCount - 1 - i
          const heartStart = heartIndex / state.heartCount
          const heartEnd = (heartIndex + 1) / state.heartCount
          const heartProgress = Math.max(0, Math.min(1, (progress - heartStart) / (heartEnd - heartStart)))
          const clipRight = (1 - heartProgress) * 100
          heart.style.clipPath = `inset(0 ${100 - clipRight}% 0 0)`
        } else if (state.mode === 'break') {
          const heartStart = i / state.heartCount
          const heartEnd = (i + 1) / state.heartCount
          const heartProgress = Math.max(0, Math.min(1, (progress - heartStart) / (heartEnd - heartStart)))
          const clipRight = heartProgress * 100
          heart.style.clipPath = `inset(0 ${100 - clipRight}% 0 0)`
        } else {
          heart.style.clipPath = 'inset(0 0 0 0)'
        }
      })
    })
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  function updateDisplay() {
    const text = formatTime(state.timeRemaining)
    timerDisplay.textContent = text
    largeTimerText.textContent = text
    updateHearts()
  }

  let hudVisible = false

  function showHud() {
    hudVisible = true
    hud.classList.add('visible')
    hudToggleBtn.textContent = 'Hide HUD'
  }

  function hideHud() {
    hudVisible = false
    hud.classList.remove('visible')
    hudToggleBtn.textContent = 'Show HUD'
  }

  function toggleHud() {
    if (hudVisible) hideHud()
    else showHud()
  }

  function startFocus() {
    // Clamp values before starting
    focusInput.dispatchEvent(new Event('change'))
    breakInput.dispatchEvent(new Event('change'))
    heartCountInput.dispatchEvent(new Event('change'))

    state.mode = 'focus'
    state.focusDuration = (parseInt(focusInput.value) || 25) * 60
    state.breakDuration = (parseInt(breakInput.value) || 5) * 60
    state.heartCount = parseInt(heartCountInput.value) || 5
    state.totalTime = state.focusDuration
    state.timeRemaining = state.focusDuration

    renderHearts(heartRow)
    renderHearts(largeHeartRow, 'large')
    timerPhase.textContent = 'Focus'
    timerStart.textContent = 'Pause'
    showHud()

    updateToggleIcon(true)
    startInterval()
    updateDisplay()
  }

  function startBreak() {
    state.mode = 'break'
    state.totalTime = state.breakDuration
    state.timeRemaining = state.breakDuration

    const containers = [heartRow, largeHeartRow]
    containers.forEach((container) => {
      container.querySelectorAll('.pixel-heart-full').forEach((h) => {
        h.style.clipPath = 'inset(0 100% 0 0)'
      })
    })

    timerPhase.textContent = 'Break'
    timerStart.textContent = 'Pause'
    startInterval()
    updateDisplay()
  }

  function pauseTimer() {
    clearInterval(state.interval)
    state.interval = null
    timerStart.textContent = 'Resume'
    updateToggleIcon(false)
  }

  function resumeTimer() {
    timerStart.textContent = 'Pause'
    updateToggleIcon(true)
    startInterval()
  }

  function resetTimer() {
    clearInterval(state.interval)
    state.interval = null
    state.mode = 'idle'
    state.timeRemaining = (parseInt(focusInput.value) || 25) * 60
    state.totalTime = state.timeRemaining

    renderHearts(heartRow)
    renderHearts(largeHeartRow, 'large')
    timerPhase.textContent = ''
    timerStart.textContent = 'Begin Quest'
    updateToggleIcon(false)
    hideHud()
    updateDisplay()
  }

  function startInterval() {
    clearInterval(state.interval)
    state.interval = setInterval(() => {
      state.timeRemaining = Math.max(0, state.timeRemaining - 1)
      updateDisplay()

      if (state.timeRemaining <= 0) {
        clearInterval(state.interval)
        state.interval = null
        if (state.mode === 'focus') {
          startBreak()
        } else if (state.mode === 'break') {
          resetTimer()
        }
      }
    }, 1000)
  }

  function updateToggleIcon(playing) {
    const svg = timerToggle.querySelector('svg')
    if (playing) {
      svg.innerHTML = '<rect x="5" y="3" width="4" height="18" /><rect x="15" y="3" width="4" height="18" />'
    } else {
      svg.innerHTML = '<polygon points="5,3 19,12 5,21" />'
    }
  }

  // HUD toggle button
  timerToggle.addEventListener('click', () => {
    if (state.mode === 'idle') startFocus()
    else if (state.interval) pauseTimer()
    else resumeTimer()
  })

  // Show/Hide HUD toggle in timer tab
  hudToggleBtn.addEventListener('click', toggleHud)

  // Timer tab controls
  timerStart.addEventListener('click', () => {
    if (state.mode === 'idle') startFocus()
    else if (state.interval) pauseTimer()
    else resumeTimer()
  })

  timerReset.addEventListener('click', resetTimer)

  // Initialize — HUD hidden until timer starts
  renderHearts(largeHeartRow, 'large')
  updateDisplay()

  return {
    getState() {
      return {
        focusMinutes: parseInt(focusInput.value) || 25,
        breakMinutes: parseInt(breakInput.value) || 5,
        heartCount: parseInt(heartCountInput.value) || 5,
      }
    },
    restore(saved) {
      if (!saved) return
      if (saved.focusMinutes) focusInput.value = saved.focusMinutes
      if (saved.breakMinutes) breakInput.value = saved.breakMinutes
      if (saved.heartCount) heartCountInput.value = saved.heartCount
      state.timeRemaining = (saved.focusMinutes || 25) * 60
      state.totalTime = state.timeRemaining
      state.heartCount = saved.heartCount || 5
      renderHearts(largeHeartRow, 'large')
      updateDisplay()
    },
  }
}
