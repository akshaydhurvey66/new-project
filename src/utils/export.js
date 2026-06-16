export function formatLineNumbered(text) {
  const lines = text.replaceAll("\r\n", "\n").split("\n")
  const width = String(lines.length).length
  return lines.map((l, i) => String(i + 1).padStart(width, " ") + "  " + l).join("\n")
}

export function sectionText(path, text, opts) {
  const showFileName = !!opts.showFileName
  const showLineNumbers = !!opts.showLineNumbers
  const body = showLineNumbers ? formatLineNumbered(text) : text
  const head = showFileName ? path + "\n\n" : ""
  return head + "---\n\n" + body + "\n\n---\n\n"
}

export function combineSections(sections) {
  return sections.join("").trimEnd() + "\n"
}

export function downloadTextFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function toXml(projectName, sections) {
  const escAttr = (s) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;")
  const title = projectName ? ` name="${escAttr(projectName)}"` : ""
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n<project${title}>` +
    sections
      .map((s) => {
        const p = escAttr(s.path)
        return `\n  <file path="${p}"><![CDATA[${s.text.replaceAll("]]>", "]]]]><![CDATA[>")}]]></file>`
      })
      .join("") +
    "\n</project>\n"
  )
}

