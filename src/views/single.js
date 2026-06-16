import { createVirtualList } from "../components/virtualList.js"
import { createCodeView } from "../components/codeView.js"
import { copyToClipboard } from "../utils/clipboard.js"
import { toast } from "../utils/toast.js"
import { readFileText, saveFileText } from "../projectOps.js"
import { sectionText } from "../utils/export.js"

function el(tag, className) {
  const n = document.createElement(tag)
  if (className) n.className = className
  return n
}

export function mountSingle(container, store) {
  const root = el("div", "stack")

  const guard = el("section", "panel")
  const gh = el("div", "panel__header")
  const gt = el("h2", "panel__title")
  gt.textContent = "Single Script"
  const gs = el("div", "panel__sub")
  gs.textContent = "Pick a file, view content, copy it, and save edits in folder mode."
  gh.appendChild(gt)
  gh.appendChild(gs)
  const gb = el("div", "panel__body")
  guard.appendChild(gh)
  guard.appendChild(gb)

  const split = el("div", "split")

  const left = el("div", "stack")
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

  const right = el("div", "stack")
  const controls = el("div", "controls")
  const row1 = el("div", "controls-row")
  const btnCopy = el("button", "btn btn--ghost")
  btnCopy.type = "button"
  btnCopy.textContent = "Copy"
  const btnSave = el("button", "btn btn--accent")
  btnSave.type = "button"
  btnSave.textContent = "Save"
  row1.appendChild(btnCopy)
  row1.appendChild(btnSave)

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

  controls.appendChild(row1)
  controls.appendChild(row2)

  const codeMount = el("div", "stack")
  right.appendChild(controls)
  right.appendChild(codeMount)

  split.appendChild(left)
  split.appendChild(right)
  gb.appendChild(split)

  root.appendChild(guard)
  container.appendChild(root)

  const codeView = createCodeView(codeMount)

  const vlist = createVirtualList(listMount, {
    itemHeight: 68,
    keyOf: (p) => p,
    renderRow: (path) => {
      const row = el("div", "list-row")
      const btn = el("button", "row-btn")
      btn.type = "button"
      const main = el("div", "list-row__main")
      main.textContent = path
      btn.appendChild(main)
      row.appendChild(btn)
      btn.addEventListener("click", () => {
        store.setState({ activePath: path })
      })
      return row
    },
  })

  let filter = ""
  let lastShownPath = null

  function filteredPaths(st) {
    const all = st.filePaths || []
    if (!filter.trim()) return all
    const q = filter.trim().toLowerCase()
    return all.filter((p) => p.toLowerCase().includes(q))
  }

  function syncControls(st) {
    const opts = st.viewerOptions || { showLineNumbers: false, showFileName: true }
    cLn.checked = !!opts.showLineNumbers
    cFn.checked = !!opts.showFileName
    btnSave.style.display = st.mode === "folder" ? "inline-flex" : "none"
  }

  async function showActive(st) {
    const path = st.activePath
    if (!path) {
      codeView.setState({ path: "", text: "Select a file to view its content.", editable: false, showFileName: false })
      btnCopy.disabled = true
      btnSave.disabled = true
      lastShownPath = null
      return
    }

    btnCopy.disabled = true
    btnSave.disabled = st.mode !== "folder"
    const opts = st.viewerOptions || { showLineNumbers: false, showFileName: true }
    const editable = st.mode === "folder"

    if (lastShownPath !== path) {
      lastShownPath = path
      codeView.setState({
        path,
        text: "Loading…",
        editable: false,
        showFileName: opts.showFileName,
        showLineNumbers: opts.showLineNumbers,
      })
    }

    const res = await readFileText(store, path)
    if (!res.ok && res.isBinary) {
      codeView.setState({
        path,
        text: "Binary or unsupported file. Skipping text view.",
        editable: false,
        showFileName: opts.showFileName,
        showLineNumbers: false,
      })
      btnCopy.disabled = true
      btnSave.disabled = true
      return
    }

    codeView.setState({
      path,
      text: res.ok ? res.text : "",
      editable,
      showFileName: opts.showFileName,
      showLineNumbers: opts.showLineNumbers,
    })
    btnCopy.disabled = false
    btnSave.disabled = st.mode !== "folder"
  }

  function rerenderList(st) {
    const items = filteredPaths(st)
    vlist.setItems(items)
    window.setTimeout(() => {
      const vp = vlist.viewport
      const active = st.activePath
      if (!active) return
      const idx = items.indexOf(active)
      if (idx >= 0) vlist.scrollToIndex(idx)
    }, 0)
  }

  function paintActiveRow(st) {
    const rows = root.querySelectorAll(".vlist .list-row")
    rows.forEach((row) => {
      const path = row.querySelector(".list-row__main")?.textContent || ""
      row.classList.toggle("is-active", path === st.activePath)
    })
  }

  function syncAll() {
    const st = store.getState()
    if (!st.mode) {
      gb.innerHTML = ""
      const msg = el("div", "hint")
      msg.textContent = "Load a project on Home to browse files."
      gb.appendChild(msg)
      return
    }
    if (!gb.contains(split)) {
      gb.innerHTML = ""
      gb.appendChild(split)
    }
    syncControls(st)
    rerenderList(st)
    paintActiveRow(st)
    showActive(st)
  }

  const unsub = store.subscribe(() => syncAll())
  syncAll()

  search.addEventListener("input", () => {
    filter = search.value
    const st = store.getState()
    rerenderList(st)
    paintActiveRow(st)
  })

  cLn.addEventListener("change", () => {
    store.setState((s) => ({ viewerOptions: { ...(s.viewerOptions || {}), showLineNumbers: cLn.checked } }))
  })

  cFn.addEventListener("change", () => {
    store.setState((s) => ({ viewerOptions: { ...(s.viewerOptions || {}), showFileName: cFn.checked } }))
  })

  btnCopy.addEventListener("click", async () => {
    const st = store.getState()
    const path = st.activePath
    if (!path) return
    const opts = st.viewerOptions || { showLineNumbers: false, showFileName: true }
    const text = sectionText(path, codeView.getText(), opts).trimEnd() + "\n"
    try {
      await copyToClipboard(text)
      toast("Copied", "File content copied to clipboard.")
    } catch {
      toast("Copy failed", "Clipboard permissions were denied.", { ms: 2600 })
    }
  })

  btnSave.addEventListener("click", async () => {
    const st = store.getState()
    const path = st.activePath
    if (st.mode !== "folder" || !path) return
    const text = codeView.getText()
    try {
      const res = await saveFileText(store, path, text)
      if (!res.ok) {
        toast("Save failed", "Could not write to this file.", { ms: 2800 })
        return
      }
      toast("Saved", "Changes written to disk.")
    } catch {
      toast("Save failed", "Write permission was denied or interrupted.", { ms: 2800 })
    }
  })

  return () => {
    unsub()
    vlist.destroy()
    root.remove()
  }
}
