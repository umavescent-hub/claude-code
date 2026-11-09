/* Boot runs last, after every module has registered itself. */
;(() => {
  const start = () => {
    try {
      window.LN.boot()
    } catch (e) {
      console.error('[LN] boot failed', e)
      const app = document.getElementById('ln-app')
      if (app) app.textContent = `Kubrick failed to start: ${e && e.message}`
    }
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start)
  else start()
})()
