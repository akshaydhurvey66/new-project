import { escapeHtml } from "../utils/text.js"

function guessPrismLang(path) {
  const ext = (path.split(".").pop() || "").toLowerCase()
  const map = {
    js: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    ts: "typescript",
    tsx: "tsx",
    jsx: "jsx",
    json: "json",
    md: "markdown",
    html: "markup",
    htm: "markup",
    css: "css",
    scss: "scss",
    yml: "yaml",
    yaml: "yaml",
    xml: "xml",
    py: "python",
    go: "go",
    java: "java",
    rs: "rust",
    sh: "bash",
    txt: "text",
  }
  return map[ext] || "text"
}

function lineNumberGrid(text) {
  const lines = text.replaceAll("\r\n", "\n").split("\n")
  const nums = lines.map((_, i) => String(i + 1)).join("\n")
  return { nums, lines: lines.join("\n") }
}

export function createCodeView(mount) {
  const wrap = document.createElement("div")
  wrap.className = "code-wrap"

  const head = document.createElement("div")
  head.className = "code-head"
  const pathEl = document.createElement("div")
  pathEl.className = "code-path"
  head.appendChild(pathEl)

  const body = document.createElement("div")
  body.className = "code-body"

  wrap.appendChild(head)
  wrap.appendChild(body)
  mount.appendChild(wrap)

  let current = { path: "", text: "", editable: false, showFileName: true, showLineNumbers: false }
  let textarea = null

  function render() {
    body.innerHTML = ""
    pathEl.textContent = current.showFileName ? current.path : ""

    if (current.editable) {
      textarea = document.createElement("textarea")
      textarea.className = "code-edit"
      textarea.value = current.text
      textarea.spellcheck = false
      body.appendChild(textarea)
      return
    }

    textarea = null
    if (current.showLineNumbers) {
      const grid = document.createElement("div")
      grid.className = "ln-grid"
      const ln = document.createElement("pre")
      ln.className = "ln-grid__nums"
      const ct = document.createElement("pre")
      ct.className = "ln-grid__code"
      const { nums, lines } = lineNumberGrid(current.text)
      ln.textContent = nums
      ct.textContent = lines
      grid.appendChild(ln)
      grid.appendChild(ct)
      body.appendChild(grid)
      return
    }

    const pre = document.createElement("pre")
    pre.className = "code-pre"
    const code = document.createElement("code")
    code.className = "language-" + guessPrismLang(current.path)
    code.innerHTML = escapeHtml(current.text)
    pre.appendChild(code)
    body.appendChild(pre)

    const prism = window.Prism
    if (prism?.highlightElement) {
      try {
        prism.highlightElement(code)
      } catch {
        code.textContent = current.text
      }
    }
  }

  function setState(next) {
    current = { ...current, ...next }
    render()
  }

  function getText() {
    if (!current.editable) return current.text
    return textarea ? textarea.value : current.text
  }

  return { setState, getText }
}

