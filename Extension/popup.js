function sendAction(action) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: action,
    });
  });
}

// Adaptive Mode
document.getElementById("adaptive").onclick = () => sendAction("ADAPTIVE");

// Reading Modes
document.getElementById("adhd").onclick = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "ADHD" });
  });
};

document.getElementById("dyslexia").onclick = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "DYSLEXIA" });
  });
};

document.getElementById("focus").onclick = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "FOCUS" });
  });
};

document.getElementById("reading").onclick = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "READ" });
  });
};

// AI Tools
document.getElementById("summarize").onclick = () => sendAction("SUMMARIZE");
document.getElementById("simplify").onclick = () => sendAction("SIMPLIFY");
document.getElementById("rebuild").onclick = () => sendAction("REBUILD");

// Open AI Assistant Sidebar
document.getElementById("assistant").onclick = () => sendAction("ASSISTANT");
