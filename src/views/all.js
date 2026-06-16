import { copyToClipboard } from "../utils/clipboard.js"
import { toast } from "../utils/toast.js"
import { readFileText } from "../projectOps.js"
import { combineSections, downloadTextFile, sectionText, toXml } from "../utils/export.js"

function el(tag, className) {
  const n = document.createElement(tag)
  if (className) n.className = className
  return n
}

export function mountAll(container, store) {
  const root = el("div", "stack")

  const p = el("section", "panel")
  const ph = el("div", "panel__header")
  const pt = el("h2", "panel__title")
  pt.textContent = "All Files"
  const ps = el("div", "panel__sub")
  ps.textContent = "Automatically combines every readable file in this project."
  ph.appendChild(pt)
  ph.appendChild(ps)
  const pb = el("div", "panel__body")
  p.appendChild(ph)
  p.appendChild(pb)

  const controls = el("div", "controls")
  const row1 = el("div", "controls-row")
  const btnCopy = el("button", "btn btn--ghost")
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

  const row3 = el("div", "controls-row")
  const btnMd = el("button", "btn btn--accent")
  btnMd.type = "button"
  btnMd.textContent = "Download Markdown (.md)"
  const btnTxt = el("button", "btn btn--ghost")
  btnTxt.type = "button"
  btnTxt.textContent = "Download Text (.txt)"
  const btnXml = el("button", "btn btn--ghost")
  btnXml.type = "button"
  btnXml.textContent = "Download XML (.xml)"
  row3.appendChild(btnMd)
  row3.appendChild(btnTxt)
  row3.appendChild(btnXml)

  const status = el("div", "hint")
  status.textContent = "Ready."

  controls.appendChild(row1)
  controls.appendChild(row2)
  controls.appendChild(row3)
  controls.appendChild(status)

  const outWrap = el("div", "code-wrap")
  const outHead = el("div", "code-head")
  const outPath = el("div", "code-path")
  outPath.textContent = "All Scripts Output"
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

  pb.appendChild(controls)
  pb.appendChild(outWrap)
  root.appendChild(p)
  container.appendChild(root)

  let buildToken = 0
  let last = { text: "", sections: [] }
  let prev = { mode: null, optsRef: null, filePathsRef: null }

  function syncToggles(st) {
    const opts = st.viewerOptions || { showLineNumbers: false, showFileName: true }
    cLn.checked = !!opts.showLineNumbers
    cFn.checked = !!opts.showFileName
  }

  async function rebuild(st) {
    if (!st.mode) {
      out.value = ""
      status.textContent = "Load a project on Home to export all files."
      last = { text: "", sections: [] }
      return
    }

    const paths = st.filePaths || []
    const token = (buildToken += 1)
    const opts = st.viewerOptions || { showLineNumbers: false, showFileName: true }
    const sections = []
    const rawSections = []

    status.textContent = `Building… 0/${paths.length}`
    for (let i = 0; i < paths.length; i += 1) {
      if (token !== buildToken) return
      const path = paths[i]
      const res = await readFileText(store, path)
      if (res.ok) {
        rawSections.push({ path, text: res.text })
        sections.push(sectionText(path, res.text, opts))
      }
      status.textContent = `Building… ${i + 1}/${paths.length}`
      if (i % 12 === 0) await new Promise((r) => setTimeout(r, 0))
    }

    if (token !== buildToken) return
    const text = combineSections(sections)
    out.value = text
    last = { text, sections: rawSections }
    status.textContent = `${rawSections.length} readable file(s) combined.`
  }

  function refresh() {
    const st = store.getState()
    syncToggles(st)

    const modeChanged = prev.mode !== st.mode
    const optsChanged = prev.optsRef !== st.viewerOptions
    const filesChanged = prev.filePathsRef !== st.filePaths

    if (modeChanged || optsChanged || filesChanged) rebuild(st)

    prev = { mode: st.mode, optsRef: st.viewerOptions, filePathsRef: st.filePaths }
  }

  const unsub = store.subscribe(() => refresh())
  refresh()

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
      toast("Copied", "All-files output copied to clipboard.")
    } catch {
      toast("Copy failed", "Clipboard permissions were denied.", { ms: 2600 })
    }
  })

  function baseName(st) {
    const n = st.projectName || "project"
    return n.replaceAll(/[^\w.-]+/g, "_")
  }

  btnMd.addEventListener("click", () => {
    const st = store.getState()
    if (!last.text.trim()) return
    downloadTextFile(baseName(st) + "_all.md", last.text, "text/markdown;charset=utf-8")
  })

  btnTxt.addEventListener("click", () => {
    const st = store.getState()
    if (!last.text.trim()) return
    downloadTextFile(baseName(st) + "_all.txt", last.text, "text/plain;charset=utf-8")
  })

  btnXml.addEventListener("click", () => {
    const st = store.getState()
    if (!last.sections.length) return
    const xml = toXml(st.projectName || "", last.sections)
    downloadTextFile(baseName(st) + "_all.xml", xml, "application/xml;charset=utf-8")
  })

  return () => {
    unsub()
    root.remove()
  }
}

