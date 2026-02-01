const STORAGE_KEYS = {
  allowed: "allowedDomains",
  blocking: "isBlocking",
};

const ICONS = {
  default: {
    16: "icons/icon16.png",
    48: "icons/icon48.png",
    128: "icons/icon128.png",
  },
  active: {
    16: "icons/icon16-active.png",
    48: "icons/icon48-active.png",
    128: "icons/icon128-active.png",
  },
};

function updateIcon(isBlocking) {
  chrome.action.setIcon({
    path: isBlocking ? ICONS.active : ICONS.default,
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get([STORAGE_KEYS.allowed, STORAGE_KEYS.blocking], (data) => {
    if (!Array.isArray(data[STORAGE_KEYS.allowed])) {
      chrome.storage.sync.set({ [STORAGE_KEYS.allowed]: [] });
    }
    if (typeof data[STORAGE_KEYS.blocking] !== "boolean") {
      chrome.storage.sync.set({ [STORAGE_KEYS.blocking]: false });
    }
    // Set initial icon state
    updateIcon(data[STORAGE_KEYS.blocking] ?? false);
  });
});

// Listen for storage changes to update icon
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "sync" && changes[STORAGE_KEYS.blocking]) {
    updateIcon(changes[STORAGE_KEYS.blocking].newValue);
  }
});
