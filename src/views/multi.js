import { createVirtualList } from "../components/virtualList.js"
import { copyToClipboard } from "../utils/clipboard.js"
import { toast } from "../utils/toast.js"
import { readFileText } from "../projectOps.js"
import { combineSections, sectionText } from "../utils/export.js"

function el(tag, className) {
  const n = document.createElement(tag)
  if (className) n.className = className
  return n
}

export function mountMulti(container, store) {
  const root = el("div", "stack")

  const p = el("section", "panel")
  const ph = el("div", "panel__header")
  const pt = el("h2", "panel__title")
  pt.textContent = "Multi File"
  const ps = el("div", "panel__sub")
  ps.textContent = "Select multiple files to build one combined script output."
  ph.appendChild(pt)
  ph.appendChild(ps)
  const pb = el("div", "panel__body")
  p.appendChild(ph)
  p.appendChild(pb)

  const split = el("div", "split")
  const left = el("div", "stack")
  const right = el("div", "stack")

  const searchField = el("div", "field")
  const searchLabel = el("div", "label")
  searchLabel.textContent = "Filter files"
  const search = document.createElement("input")
  search.className = "input"
  search.type = "search"
  search.placeholder = "Type to filter…"
  searchField.appendChild(searchLabel)
  searchField.appendChild(search)
  left.appendChild(searchField)

  const listMount = el("div")
  left.appendChild(listMount)

  const controls = el("div", "controls")
  const row1 = el("div", "controls-row")
  const btnCopy = el("button", "btn btn--accent")
  btnCopy.type = "button"
  btnCopy.textContent = "Copy All"
  row1.appendChild(btnCopy)

  const row2 = el("div", "controls-row")
  const tLn = el("label", "toggle")
  const cLn = document.createElement("input")
  cLn.type = "checkbox"
  const sLn = el("span")
  sLn.textContent = "Show Line Numbers"
  tLn.appendChild(cLn)
  tLn.appendChild(sLn)

  const tFn = el("label", "toggle")
  const cFn = document.createElement("input")
  cFn.type = "checkbox"
  cFn.checked = true
  const sFn = el("span")
  sFn.textContent = "Show File Name"
  tFn.appendChild(cFn)
  tFn.appendChild(sFn)
  row2.appendChild(tLn)
  row2.appendChild(tFn)

  const status = el("div", "hint")
  status.textContent = "Select files to build output."

  controls.appendChild(row1)
  controls.appendChild(row2)
  controls.appendChild(status)

  const outWrap = el("div", "code-wrap")
  const outHead = el("div", "code-head")
  const outPath = el("div", "code-path")
  outPath.textContent = "Combined Output"
  outHead.appendChild(outPath)
  const outBody = el("div", "code-body")
  const out = document.createElement("textarea")
  out.className = "code-edit"
  out.readOnly = true
  out.spellcheck = false
  out.value = ""
  outBody.appendChild(out)
  outWrap.appendChild(outHead)
  outWrap.appendChild(outBody)

  right.appendChild(controls)
  right.appendChild(outWrap)

  split.appendChild(left)
  split.appendChild(right)
  pb.appendChild(split)
  root.appendChild(p)
  container.appendChild(root)

  const vlist = createVirtualList(listMount, {
    itemHeight: 74,
    keyOf: (p) => p,
    renderRow: (path) => {
      const row = el("div", "list-row")
      const wrap = el("div")
      const label = document.createElement("label")
      label.className = "toggle"
      const cb = document.createElement("input")
      cb.type = "checkbox"
      const txt = el("span")
      txt.textContent = path
      label.appendChild(cb)
      label.appendChild(txt)
      wrap.appendChild(label)
      row.appendChild(wrap)

      cb.addEventListener("change", () => {
        store.setState((s) => {
          const next = new Set(s.selection || [])
          if (cb.checked) next.add(path)
          else next.delete(path)
          return { selection: next }
        })
      })

      return row
    },
  })

  let filter = ""
  let buildToken = 0
  let prev = { mode: null, selectionRef: null, optsRef: null, filePathsRef: null }

  function filteredPaths(st) {
    const all = st.filePaths || []
    if (!filter.trim()) return all
    const q = filter.trim().toLowerCase()
    return all.filter((p) => p.toLowerCase().includes(q))
  }

  function syncToggles(st) {
    const opts = st.viewerOptions || { showLineNumbers: false, showFileName: true }
    cLn.checked = !!opts.showLineNumbers
    cFn.checked = !!opts.showFileName
  }

  function paintCheckboxes(st) {
    const selected = st.selection || new Set()
    const rows = root.querySelectorAll(".vlist input[type=checkbox]")
    rows.forEach((cb) => {
      const path = cb.parentElement?.querySelector("span")?.textContent || ""
      cb.checked = selected.has(path)
    })
  }

  async function rebuildOutput(st) {
    if (!st.mode) {
      out.value = ""
      status.textContent = "Load a project on Home to select files."
      return
    }

    const selected = Array.from(st.selection || []).sort((a, b) => a.localeCompare(b))
    if (selected.length === 0) {
      out.value = ""
      status.textContent = "Select files to build output."
      return
    }

    const token = (buildToken += 1)
    const opts = st.viewerOptions || { showLineNumbers: false, showFileName: true }
    const sections = []

    status.textContent = `Building… 0/${selected.length}`
    for (let i = 0; i < selected.length; i += 1) {
      if (token !== buildToken) return
      const path = selected[i]
      const res = await readFileText(store, path)
      if (res.ok) {
        sections.push(sectionText(path, res.text, opts))
      }
      status.textContent = `Building… ${i + 1}/${selected.length}`
      if (i % 10 === 0) await new Promise((r) => setTimeout(r, 0))
    }

    if (token !== buildToken) return
    out.value = combineSections(sections)
    status.textContent = `${selected.length} file(s) combined.`
  }

  function syncList(st) {
    vlist.setItems(filteredPaths(st))
    paintCheckboxes(st)
  }

  const unsub = store.subscribe(() => {
    const st = store.getState()
    if (!st.mode) {
      pb.innerHTML = ""
      const msg = el("div", "hint")
      msg.textContent = "Load a project on Home to use Multi File."
      pb.appendChild(msg)
      prev = { mode: null, selectionRef: null, optsRef: null, filePathsRef: null }
      return
    }

    if (!pb.contains(split)) {
      pb.innerHTML = ""
      pb.appendChild(split)
    }

    syncToggles(st)

    const selectionChanged = prev.selectionRef !== st.selection
    const optsChanged = prev.optsRef !== st.viewerOptions
    const modeChanged = prev.mode !== st.mode
    const filesChanged = prev.filePathsRef !== st.filePaths

    if (filesChanged || modeChanged) syncList(st)
    else if (selectionChanged) paintCheckboxes(st)

    if (selectionChanged || optsChanged || modeChanged) rebuildOutput(st)

    prev = { mode: st.mode, selectionRef: st.selection, optsRef: st.viewerOptions, filePathsRef: st.filePaths }
  })

  const init = store.getState()
  if (!init.mode) {
    pb.innerHTML = ""
    const msg = el("div", "hint")
    msg.textContent = "Load a project on Home to use Multi File."
    pb.appendChild(msg)
  } else {
    syncToggles(init)
    syncList(init)
    rebuildOutput(init)
    prev = { mode: init.mode, selectionRef: init.selection, optsRef: init.viewerOptions, filePathsRef: init.filePaths }
  }

  search.addEventListener("input", () => {
    filter = search.value
    syncList(store.getState())
  })

  cLn.addEventListener("change", () => {
    store.setState((s) => ({ viewerOptions: { ...(s.viewerOptions || {}), showLineNumbers: cLn.checked } }))
  })

  cFn.addEventListener("change", () => {
    store.setState((s) => ({ viewerOptions: { ...(s.viewerOptions || {}), showFileName: cFn.checked } }))
  })

  btnCopy.addEventListener("click", async () => {
    const text = out.value || ""
    if (!text.trim()) return
    try {
      await copyToClipboard(text)
      toast("Copied", "Combined output copied to clipboard.")
    } catch {
      toast("Copy failed", "Clipboard permissions were denied.", { ms: 2600 })
    }
  })

  return () => {
    unsub()
    vlist.destroy()
    root.remove()
  }
}
