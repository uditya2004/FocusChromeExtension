const allowedListEl = document.getElementById("allowedList");
const domainInput = document.getElementById("domainInput");
const addDomainButton = document.getElementById("addDomain");
const domainError = document.getElementById("domainError");
const tabList = document.getElementById("tabList");
const addTabsButton = document.getElementById("addTabs");
const statusEl = document.getElementById("status");
const startBlockButton = document.getElementById("startBlock");
const stopBlockButton = document.getElementById("stopBlock");

const STORAGE_KEYS = {
  allowed: "allowedDomains",
  blocking: "isBlocking",
};

function normalizeDomain(value) {
  if (!value) return "";
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "";

  try {
    const url = trimmed.includes("//") ? trimmed : `https://${trimmed}`;
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (error) {
    return "";
  }
}

function renderStatus(isBlocking) {
  const indicator = statusEl.querySelector(".status-indicator");
  indicator.textContent = isBlocking ? "Active" : "Inactive";
  indicator.dataset.state = isBlocking ? "active" : "inactive";
}

function renderAllowedList(domains) {
  allowedListEl.innerHTML = "";

  if (!domains.length) {
    const empty = document.createElement("li");
    empty.className = "list-item";
    empty.textContent = "No domains added yet.";
    allowedListEl.appendChild(empty);
    return;
  }

  domains.forEach((domain) => {
    const item = document.createElement("li");
    item.className = "list-item";

    const text = document.createElement("span");
    text.textContent = domain;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "×";
    remove.addEventListener("click", () => removeDomain(domain));

    item.append(text, remove);
    allowedListEl.appendChild(item);
  });
}

function setError(message) {
  domainError.textContent = message;
}

async function getStoredState() {
  const data = await chrome.storage.sync.get([STORAGE_KEYS.allowed, STORAGE_KEYS.blocking]);
  return {
    allowedDomains: data[STORAGE_KEYS.allowed] ?? [],
    isBlocking: data[STORAGE_KEYS.blocking] ?? false,
  };
}

async function saveAllowedDomains(domains) {
  await chrome.storage.sync.set({ [STORAGE_KEYS.allowed]: domains });
}

async function saveBlockingState(isBlocking) {
  await chrome.storage.sync.set({ [STORAGE_KEYS.blocking]: isBlocking });
}

async function addDomain() {
  const domain = normalizeDomain(domainInput.value);
  if (!domain) {
    setError("Enter a valid domain (example: wikipedia.org)");
    return;
  }

  const { allowedDomains } = await getStoredState();
  if (allowedDomains.includes(domain)) {
    setError("Domain already in the list.");
    return;
  }

  const updated = [...allowedDomains, domain].sort();
  await saveAllowedDomains(updated);
  domainInput.value = "";
  setError("");
  renderAllowedList(updated);
}

async function removeDomain(domain) {
  const { allowedDomains } = await getStoredState();
  const updated = allowedDomains.filter((item) => item !== domain);
  await saveAllowedDomains(updated);
  renderAllowedList(updated);
}

async function loadTabs() {
  tabList.innerHTML = "";
  const tabs = await chrome.tabs.query({});
  const filteredTabs = tabs.filter((tab) => tab.url && tab.url.startsWith("http"));

  if (!filteredTabs.length) {
    const empty = document.createElement("p");
    empty.className = "hint";
    empty.textContent = "No active tabs found.";
    tabList.appendChild(empty);
    addTabsButton.disabled = true;
    return;
  }

  addTabsButton.disabled = false;

  filteredTabs.forEach((tab) => {
    const domain = normalizeDomain(tab.url);
    if (!domain) return;

    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = domain;

    const text = document.createElement("span");
    text.textContent = `${tab.title || "Untitled"} — ${domain}`;

    label.append(checkbox, text);
    tabList.appendChild(label);
  });
}

async function addSelectedTabs() {
  const checkboxes = tabList.querySelectorAll("input[type='checkbox']:checked");
  const selected = Array.from(new Set([...checkboxes].map((checkbox) => checkbox.value)));

  if (!selected.length) {
    setError("Select at least one tab to add.");
    return;
  }

  const { allowedDomains } = await getStoredState();
  const updated = Array.from(new Set([...allowedDomains, ...selected])).sort();
  await saveAllowedDomains(updated);
  setError("");
  renderAllowedList(updated);
  checkboxes.forEach((checkbox) => (checkbox.checked = false));
}

async function updateBlockingState(isBlocking) {
  await saveBlockingState(isBlocking);
  renderStatus(isBlocking);
}

async function initialize() {
  const { allowedDomains, isBlocking } = await getStoredState();
  renderAllowedList(allowedDomains);
  renderStatus(isBlocking);
  await loadTabs();
}

addDomainButton.addEventListener("click", addDomain);
domainInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    addDomain();
  }
});

addTabsButton.addEventListener("click", addSelectedTabs);
startBlockButton.addEventListener("click", () => updateBlockingState(true));
stopBlockButton.addEventListener("click", () => updateBlockingState(false));

initialize();
