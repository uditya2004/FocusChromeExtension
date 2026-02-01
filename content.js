// Focus Mode Content Script - Overlay blocked websites

const STORAGE_KEYS = {
  allowed: "allowedDomains",
  blocking: "isBlocking",
};

let overlayElement = null;

function normalizeDomain(hostname) {
  return hostname.replace(/^www\./, "").toLowerCase();
}

function isDomainAllowed(hostname, allowedDomains) {
  const normalized = normalizeDomain(hostname);
  return allowedDomains.some((domain) => {
    const normalizedDomain = normalizeDomain(domain);
    return normalized === normalizedDomain || normalized.endsWith(`.${normalizedDomain}`);
  });
}

function createOverlay(hostname) {
  if (overlayElement) return;

  overlayElement = document.createElement("div");
  overlayElement.id = "focus-mode-overlay";
  overlayElement.innerHTML = `
    <div class="focus-overlay-backdrop"></div>
    <div class="focus-overlay-content">
      <div class="focus-overlay-icon">🚫</div>
      <h1 class="focus-overlay-title">Website Blocked</h1>
      <p class="focus-overlay-message"><strong>${hostname}</strong> is blocked while focus mode is active.</p>
      <p class="focus-overlay-hint">Stay focused! You can manage allowed websites in the extension popup.</p>
      <button class="focus-overlay-btn" id="focus-close-tab">Close Tab</button>
    </div>
  `;

  const style = document.createElement("style");
  style.id = "focus-mode-styles";
  style.textContent = `
    #focus-mode-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    .focus-overlay-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(10, 10, 15, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }

    .focus-overlay-content {
      position: relative;
      z-index: 1;
      text-align: center;
      padding: 48px;
      max-width: 480px;
      background: linear-gradient(135deg, rgba(30, 30, 40, 0.95) 0%, rgba(20, 20, 28, 0.95) 100%);
      border-radius: 24px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
    }

    .focus-overlay-icon {
      font-size: 64px;
      margin-bottom: 16px;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    .focus-overlay-title {
      font-size: 28px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 16px 0;
      background: linear-gradient(135deg, #ffffff 0%, #ef4444 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .focus-overlay-message {
      font-size: 16px;
      color: rgba(255, 255, 255, 0.9);
      margin: 0 0 8px 0;
      line-height: 1.5;
    }

    .focus-overlay-message strong {
      color: #ef4444;
    }

    .focus-overlay-hint {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.5);
      margin: 0 0 24px 0;
    }

    .focus-overlay-btn {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: #ffffff;
      border: none;
      padding: 12px 32px;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s ease;
    }

    .focus-overlay-btn:hover {
      opacity: 0.9;
    }
  `;

  document.documentElement.appendChild(style);
  document.documentElement.appendChild(overlayElement);

  document.getElementById("focus-close-tab").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "closeTab" });
  });

  // Prevent scrolling on the page
  if (document.body) {
    document.body.style.overflow = "hidden";
  }
}

function removeOverlay() {
  if (overlayElement) {
    overlayElement.remove();
    overlayElement = null;
  }
  const style = document.getElementById("focus-mode-styles");
  if (style) {
    style.remove();
  }
  if (document.body) {
    document.body.style.overflow = "";
  }
}

async function checkAndApplyBlock() {
  const hostname = window.location.hostname;
  if (!hostname) return;

  const data = await chrome.storage.sync.get([STORAGE_KEYS.allowed, STORAGE_KEYS.blocking]);
  const allowedDomains = data[STORAGE_KEYS.allowed] ?? [];
  const isBlocking = data[STORAGE_KEYS.blocking] ?? false;

  if (isBlocking && !isDomainAllowed(hostname, allowedDomains)) {
    createOverlay(hostname);
  } else {
    removeOverlay();
  }
}

// Initial check
checkAndApplyBlock();

// Listen for storage changes (when user starts/stops blocking or updates allowed list)
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "sync") {
    if (changes[STORAGE_KEYS.blocking] || changes[STORAGE_KEYS.allowed]) {
      checkAndApplyBlock();
    }
  }
});
