export function createRouter(opts) {
  const setView = opts.setView
  const getView = opts.getView

  function ensureRootState() {
    const s = history.state
    if (s && typeof s.idx === "number" && s.view) return
    history.replaceState({ view: getView(), idx: 0 }, "")
  }

  function canGoBack() {
    const s = history.state
    return !!s && typeof s.idx === "number" && s.idx > 0
  }

  function navigate(view, mode = "push") {
    ensureRootState()
    const cur = history.state
    const nextIdx = (cur?.idx ?? 0) + (mode === "push" ? 1 : 0)
    const state = { view, idx: mode === "push" ? nextIdx : cur?.idx ?? 0 }
    if (mode === "replace") history.replaceState(state, "")
    else history.pushState(state, "")
    setView(view, canGoBack())
  }

  window.addEventListener("popstate", () => {
    ensureRootState()
    const s = history.state
    setView(s.view, canGoBack())
  })

  ensureRootState()
  setView(history.state.view, canGoBack())

  return { navigate, canGoBack }
}

