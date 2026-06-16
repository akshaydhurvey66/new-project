export function createStore(initialState) {
  let state = initialState
  const listeners = new Set()

  function getState() {
    return state
  }

  function setState(partial) {
    const update =
      typeof partial === "function"
        ? partial(state)
        : partial

    state = {
      ...state,
      ...(update || {})
    }

    for (const fn of listeners) {
      fn(state)
    }
  }

  function subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  }

  return {
    getState,
    setState,
    subscribe
  }
}