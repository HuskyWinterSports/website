import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './app/App.jsx'

// BrowserRouter, not HashRouter: URLs are /faq rather than /#/faq, which is
// what makes pages indexable and shareable. GitHub Pages needs dist/404.html
// to serve deep links, which scripts/build/prerender.js writes at build time.

// The site used hash routing for years, so links like /#/faq are sitting in
// old emails, mailing-list blasts and social posts. Without this they would
// silently land on the home page: the server returns index.html and the
// router never looks at the fragment. Rewrite them before the app mounts.
const legacyHashRoute = window.location.hash.match(/^#(\/.*)$/);
if (legacyHashRoute) {
  window.history.replaceState(null, '', legacyHashRoute[1] + window.location.search);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
