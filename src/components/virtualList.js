export function createVirtualList(root, opts) {
  const itemHeight = opts.itemHeight
  const overscan = typeof opts.overscan === "number" ? opts.overscan : 8
  const keyOf = opts.keyOf || ((x) => x)
  const renderRow = opts.renderRow

  const viewport = document.createElement("div")
  viewport.className = "vlist"
  const spacer = document.createElement("div")
  spacer.style.position = "relative"
  viewport.appendChild(spacer)
  root.appendChild(viewport)

  let items = []
  let rendered = new Map()
  let raf = 0

  function schedule() {
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = 0
      render()
    })
  }

  function setItems(next) {
    items = next
    rendered.clear()
    spacer.innerHTML = ""
    spacer.style.height = String(items.length * itemHeight) + "px"
    schedule()
  }

  function render() {
    const scrollTop = viewport.scrollTop
    const h = viewport.clientHeight
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const end = Math.min(items.length, Math.ceil((scrollTop + h) / itemHeight) + overscan)

    const keep = new Set()
    for (let i = start; i < end; i += 1) {
      const item = items[i]
      const k = keyOf(item)
      keep.add(k)
      if (rendered.has(k)) continue

      const row = renderRow(item, i)
      row.style.position = "absolute"
      row.style.top = String(i * itemHeight) + "px"
      row.style.left = "0"
      row.style.right = "0"
      spacer.appendChild(row)
      rendered.set(k, row)
    }

    for (const [k, el] of rendered.entries()) {
      if (keep.has(k)) continue
      el.remove()
      rendered.delete(k)
    }
  }

  function destroy() {
    if (raf) cancelAnimationFrame(raf)
    viewport.removeEventListener("scroll", schedule)
    viewport.remove()
    rendered.clear()
    items = []
  }

  function scrollToIndex(i) {
    viewport.scrollTop = i * itemHeight
    schedule()
  }

  viewport.addEventListener("scroll", schedule, { passive: true })

  return { setItems, destroy, scrollToIndex, viewport }
}

