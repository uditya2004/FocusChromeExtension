const STORAGE_KEYS = {
  allowed: "allowedDomains",
  blocking: "isBlocking",
};

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

async function handleNavigation(details) {
  if (details.frameId !== 0) return;
  if (!details.url.startsWith("http")) return;

  const blockedPage = chrome.runtime.getURL("blocked.html");
  if (details.url.startsWith(blockedPage)) return;

  const data = await chrome.storage.sync.get([STORAGE_KEYS.allowed, STORAGE_KEYS.blocking]);
  const allowedDomains = data[STORAGE_KEYS.allowed] ?? [];
  const isBlocking = data[STORAGE_KEYS.blocking] ?? false;

  if (!isBlocking) return;

  let hostname = "";
  try {
    hostname = new URL(details.url).hostname;
  } catch (error) {
    return;
  }

  if (!hostname) return;

  if (!isDomainAllowed(hostname, allowedDomains)) {
    const target = `${blockedPage}?blocked=${encodeURIComponent(hostname)}`;
    chrome.tabs.update(details.tabId, { url: target });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get([STORAGE_KEYS.allowed, STORAGE_KEYS.blocking], (data) => {
    if (!Array.isArray(data[STORAGE_KEYS.allowed])) {
      chrome.storage.sync.set({ [STORAGE_KEYS.allowed]: [] });
    }
    if (typeof data[STORAGE_KEYS.blocking] !== "boolean") {
      chrome.storage.sync.set({ [STORAGE_KEYS.blocking]: false });
    }
  });
});

chrome.webNavigation.onCommitted.addListener(handleNavigation, {
  url: [{ schemes: ["http", "https"] }],
});
