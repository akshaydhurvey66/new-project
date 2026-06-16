import { loadZipProject } from "../fs/zipLoader.js"
import { loadFolderProject } from "../fs/folderLoader.js"
import { copyToClipboard } from "../utils/clipboard.js"
import { toTreeText } from "../utils/text.js"
import { toast } from "../utils/toast.js"

function el(tag, className) {
  const n = document.createElement(tag)
  if (className) n.className = className
  return n
}

export function mountHome(container, store) {
  const root = el("div", "stack")

  const p1 = el("section", "panel")
  const h1 = el("div", "panel__header")
  const t1 = el("h2", "panel__title")
  t1.textContent = "Upload Area"
  const s1 = el("div", "panel__sub")
  s1.textContent = "Load a project once, then browse and export instantly across sections."
  h1.appendChild(t1)
  h1.appendChild(s1)
  const b1 = el("div", "panel__body")

  const zipInput = document.createElement("input")
  zipInput.type = "file"
  zipInput.accept = ".zip,application/zip"
  zipInput.style.display = "none"

  const buttons = el("div", "btn-row")
  const btnZip = el("button", "btn btn--accent")
  btnZip.type = "button"
  btnZip.textContent = "Upload ZIP"
  const btnFolder = el("button", "btn btn--warn")
  btnFolder.type = "button"
  btnFolder.textContent = "Select Folder"
  buttons.appendChild(btnZip)
  buttons.appendChild(btnFolder)

  const status = el("div", "stack")
  const hint = el("div", "hint")
  hint.textContent =
    "Folder mode uses the File System Access API and requires a secure context (https or localhost). ZIP mode works anywhere but is read-only."

  b1.appendChild(buttons)
  b1.appendChild(zipInput)
  b1.appendChild(hint)
  b1.appendChild(status)
  p1.appendChild(h1)
  p1.appendChild(b1)

  const p2 = el("section", "panel")
  const h2 = el("div", "panel__header")
  const t2 = el("h2", "panel__title")
  t2.textContent = "Project Structure"
  const s2 = el("div", "panel__sub")
  s2.textContent = "Browse the detected folder tree. Copy the whole structure as text."
  h2.appendChild(t2)
  h2.appendChild(s2)
  const b2 = el("div", "panel__body")
  const structurePre = el("pre", "mono-pre")
  structurePre.textContent = "Load a project to see its structure."
  const btnCopy = el("button", "btn btn--ghost")
  btnCopy.type = "button"
  btnCopy.textContent = "Copy Structure"
  btnCopy.disabled = true
  b2.appendChild(structurePre)
  b2.appendChild(el("div", "stack"))
  b2.lastChild.appendChild(btnCopy)
  p2.appendChild(h2)
  p2.appendChild(b2)

  root.appendChild(p1)
  root.appendChild(p2)
  container.appendChild(root)

  function setProgressChip(text, tone) {
    status.innerHTML = ""
    if (!text) return
    const chip = el("div", "pill")
    if (tone) chip.classList.add(tone)
    chip.textContent = text
    status.appendChild(chip)
  }

  function updateStructure() {
    const st = store.getState()
    if (!st.root) {
      structurePre.textContent = "Load a project to see its structure."
      btnCopy.disabled = true
      return
    }
    structurePre.textContent = st.structureText || toTreeText(st.root)
    btnCopy.disabled = !structurePre.textContent.trim()
  }

  const unsub = store.subscribe(() => updateStructure())
  updateStructure()

  btnCopy.addEventListener("click", async () => {
    const text = structurePre.textContent || ""
    if (!text.trim()) return
    try {
      await copyToClipboard(text)
      toast("Copied", "Folder structure copied to clipboard.")
    } catch {
      toast("Copy failed", "Clipboard permissions were denied.", { ms: 2600 })
    }
  })

  btnZip.addEventListener("click", () => zipInput.click())
  zipInput.addEventListener("change", async () => {
    const file = zipInput.files?.[0]
    zipInput.value = ""
    if (!file) return

    setProgressChip("Loading ZIP…", "pill--accent")
    store.setState({ busy: true })

    try {
      const proj = await loadZipProject(file, (p) => {
        if (p.phase === "indexing") setProgressChip(`Indexing ${p.current}/${p.total}…`, "pill--accent")
      })
      const structureText = toTreeText(proj.root)
      store.setState({
        busy: false,
        mode: proj.mode,
        projectName: proj.projectName,
        root: proj.root,
        filesByPath: proj.filesByPath,
        filePaths: proj.filePaths,
        structureText,
        selection: new Set(),
        activePath: null,
        rev: (store.getState().rev || 0) + 1,
      })
      setProgressChip("ZIP loaded (read-only).", "pill--accent")
      toast("Project loaded", "ZIP mode is read-only. Use folder mode to edit and save.")
    } catch {
      store.setState({ busy: false })
      setProgressChip("")
      toast("ZIP error", "Could not read this ZIP file.", { ms: 2800 })
    }
  })

  const folderSupported = typeof window.showDirectoryPicker === "function"
  btnFolder.disabled = !folderSupported
  if (!folderSupported) btnFolder.textContent = "Select Folder (Not Supported)"

  btnFolder.addEventListener("click", async () => {
    if (!folderSupported) {
      toast("Not supported", "Your browser does not support folder access.", { ms: 2800 })
      return
    }

    setProgressChip("Requesting folder access…", "pill--warn")
    store.setState({ busy: true })

    try {
      const dir = await window.showDirectoryPicker({ mode: "readwrite" })
      setProgressChip("Scanning folder…", "pill--warn")
      const proj = await loadFolderProject(dir, (p) => {
        if (p.phase === "scanning") setProgressChip(`Scanning… ${p.current} items`, "pill--warn")
      })
      const structureText = toTreeText(proj.root)
      store.setState({
        busy: false,
        mode: proj.mode,
        projectName: proj.projectName,
        root: proj.root,
        filesByPath: proj.filesByPath,
        filePaths: proj.filePaths,
        structureText,
        selection: new Set(),
        activePath: null,
        rev: (store.getState().rev || 0) + 1,
      })
      setProgressChip("Folder loaded (editable).", "pill--warn")
      toast("Project loaded", "Folder mode lets you edit and save back to disk.")
    } catch {
      store.setState({ busy: false })
      setProgressChip("")
      toast("Folder error", "Folder access was cancelled or denied.", { ms: 2800 })
    }
  })

  return () => {
    unsub()
    root.remove()
  }
}

