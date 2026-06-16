const host = () => document.getElementById("toastHost")

export function toast(title, body, opts = {}) {
  const el = document.createElement("div")
  el.className = "toast"
  const t = document.createElement("div")
  t.className = "toast__title"
  t.textContent = title
  const b = document.createElement("div")
  b.className = "toast__body"
  b.textContent = body
  el.appendChild(t)
  el.appendChild(b)
  host().appendChild(el)

  const ms = typeof opts.ms === "number" ? opts.ms : 2200
  window.setTimeout(() => {
    el.style.opacity = "0"
    el.style.transform = "translateY(6px)"
    window.setTimeout(() => el.remove(), 220)
  }, ms)
}

