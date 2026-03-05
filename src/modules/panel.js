export function initPanel() {
  const panel = document.getElementById('control-panel')
  const toggle = document.getElementById('panel-toggle')
  const handle = document.getElementById('panel-handle')
  const backdrop = document.getElementById('panel-backdrop')
  const tabs = document.querySelectorAll('#panel-tabs [role="tab"]')
  const tabContents = document.querySelectorAll('.tab-content')
  const miniVolume = document.getElementById('mini-volume')

  function setExpanded(expanded) {
    panel.dataset.state = expanded ? 'expanded' : 'collapsed'
    backdrop.classList.toggle('visible', expanded)
  }

  function isExpanded() {
    return panel.dataset.state === 'expanded'
  }

  toggle.addEventListener('click', (e) => {
    e.stopPropagation()
    setExpanded(!isExpanded())
  })

  // Prevent volume slider interactions from opening the drawer
  miniVolume.addEventListener('click', (e) => e.stopPropagation())
  miniVolume.addEventListener('mousedown', (e) => e.stopPropagation())
  miniVolume.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true })

  handle.addEventListener('click', () => {
    if (!isExpanded()) setExpanded(true)
  })

  // Click backdrop (outside panel) to close
  backdrop.addEventListener('click', () => {
    if (isExpanded()) setExpanded(false)
  })

  // Tab switching
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => {
        t.classList.remove('active')
        t.setAttribute('aria-selected', 'false')
      })
      tab.classList.add('active')
      tab.setAttribute('aria-selected', 'true')

      const targetId = `tab-${tab.dataset.tab}`
      tabContents.forEach((content) => {
        content.hidden = content.id !== targetId
      })
    })
  })

  // Swipe to expand/collapse on mobile
  let touchStartY = 0
  handle.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY
  }, { passive: true })

  handle.addEventListener('touchend', (e) => {
    const deltaY = touchStartY - e.changedTouches[0].clientY
    if (Math.abs(deltaY) > 30) {
      setExpanded(deltaY > 0)
    }
  }, { passive: true })

  return { setExpanded, isExpanded }
}
