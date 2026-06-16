import { decodeUtf8, isProbablyBinary } from "./utils/text.js"

export async function readFileText(store, path) {
  const st = store.getState()
  const entry = st.filesByPath?.get(path)
  if (!entry) return { ok: false, reason: "missing" }
  if (typeof entry.text === "string") return { ok: true, text: entry.text, isBinary: !!entry.isBinary }

  const bytes = await entry.readBytes()
  const binary = isProbablyBinary(bytes)
  entry.isBinary = binary
  entry.size = bytes.length
  entry.text = binary ? "" : decodeUtf8(bytes)
  store.setState((s) => ({ rev: s.rev + 1 }))
  return { ok: !binary, text: entry.text, isBinary: binary }
}

export async function saveFileText(store, path, text) {
  const st = store.getState()
  if (st.mode !== "folder") return { ok: false, reason: "readonly" }
  const entry = st.filesByPath?.get(path)
  if (!entry?.handle) return { ok: false, reason: "no_handle" }

  const writable = await entry.handle.createWritable()
  await writable.write(text)
  await writable.close()
  entry.text = text
  entry.isBinary = false
  entry.size = text.length
  store.setState((s) => ({ rev: s.rev + 1 }))
  return { ok: true }
}

