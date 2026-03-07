let neurolensAnalyzed = false;
let lastPageHash = null;
let simplifiedCache = null;
let adhdMode = false;
let dyslexiaMode = false;
let focusMode = false;
let speech = null;
let readingMode = false;
let speaking = false;

function extractText() {
  let text = "";

  document.querySelectorAll("p, article p, main p").forEach((el) => {
    text += el.innerText + " ";
  });

  text = text.trim();

  // Prevent sending huge pages to AI
  if (text.length > 6000) {
    text = text.slice(0, 6000);
  }

  return text;
}

function formatAI(text) {
  if (!text) return "";

  return text
    .replace(/### (.*?)/g, "<h3 style='margin-top:16px'>$1</h3>")
    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
    .replace(/\n\d+\.\s/g, "<br><br>$&")
    .replace(/\n\* /g, "<br>• ")
    .replace(
      /\b(Key Idea|Important|Summary|Definition|Warning)\b/g,
      "<span style='background:#fff3cd;padding:2px 6px;border-radius:4px;font-weight:bold'>$1</span>",
    )
    .replace(
      /\b(Photosynthesis|Chlorophyll|Carbon Dioxide|ATP|NADPH)\b/g,
      "<span style='color:#6366f1;font-weight:bold'>$1</span>",
    )
    .replace(/\n/g, "<br>");
}

function getCacheKey(text) {
  return "neurolens_" + text.slice(0, 50);
}

const AI_LOADING = `
<i>AI is analyzing this page...</i>
<div style="margin-top:8px;font-size:12px;color:#888;">🧠 NeuroLens processing...</div>
`;

/* ===============================
   NeuroLens Smart Page Analysis
   Prevents Gemini quota waste
================================= */

// Block AI analysis on useless sites
const blockedSites = [
  "google.com",
  "youtube.com",
  "gmail.com",
  "twitter.com",
  "x.com",
  "facebook.com",
  "instagram.com",
];

// Check if current site should be skipped
const isBlocked = blockedSites.some((site) => location.hostname.includes(site));

if (isBlocked) {
  console.log("NeuroLens: Skipping AI analysis on this site");
} else {
  // Wait for page to fully load
  setTimeout(() => {
    if (document.visibilityState !== "visible") return;

    const text = extractText();

    const pageHash = text.slice(0, 500);

    if (pageHash === lastPageHash) {
      console.log("NeuroLens: duplicate page skipped");
      return;
    }

    lastPageHash = pageHash;

    if (!text || text.length < 2000) {
      console.log("NeuroLens: Page too small for AI analysis");
      return;
    }

    analyzePage();
  }, 4000);
}

/* ================================
   ACCESSIBILITY MODES HANDLER
================================ */

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "ADHD") {
    enableADHDMode();
  }

  if (request.action === "DYSLEXIA") {
    enableDyslexiaMode();
  }

  if (request.action === "FOCUS") {
    enableFocusMode();
  }

  if (request.action === "READ") {
    enableReadingMode();
  }
});

/* ================================
   MESSAGE HANDLER (Popup actions)
================================ */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "SUMMARIZE") summarizePage();
  if (request.action === "SIMPLIFY") simplifyPage();
  if (request.action === "REBUILD") rebuildPage();
  if (request.action === "ASSISTANT") openAssistant();
});

/* ================================
   PAGE ANALYSIS
================================ */

//window.addEventListener("load", analyzePage)

async function analyzePage() {
  if (document.getElementById("neurolens-panel")) return;

  if (neurolensAnalyzed) return;
  neurolensAnalyzed = true;

  try {
    // show AI animation
    showOverlay("🧠 NeuroLens analyzing page...");

    const text = extractText();

    const minutes = estimateReadingTime(text);

    console.log("NeuroLens AI analyzing page...");

    const res = await fetch("http://localhost:5000/api/reader/difficulty", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      showOverlay("AI service temporarily unavailable");
      return;
    }

    const data = await res.json();

    showSuggestionBanner(data.level, minutes);
  } catch (error) {
    console.error("NeuroLens AI error:", error);

    showOverlay("AI analysis failed");
  }
}

/* ================================
   READING TIME
================================ */

function estimateReadingTime(text) {
  const words = text.split(/\s+/).length;

  const minutes = Math.ceil(words / 200);

  return minutes;
}

/* ================================
   SUGGESTION BANNER
================================ */

function showSuggestionBanner(level, minutes) {
  const banner = document.createElement("div");

  banner.style.position = "fixed";
  banner.style.top = "20px";
  banner.style.right = "20px";
  banner.style.background = "white";
  banner.style.padding = "16px";
  banner.style.boxShadow = "0 5px 20px rgba(0,0,0,0.15)";
  banner.style.borderRadius = "10px";
  banner.style.zIndex = "999999";
  banner.style.width = "280px";
  banner.style.fontFamily = "Arial";

  banner.innerHTML = `
  
  <b>AI Page Analysis</b><br><br>

  Difficulty: <b>${level}</b><br>
  Reading Time: <b>${minutes} min</b><br><br>

  This page looks complex.<br><br>

  <button id="learn">Learning Mode</button>
  <button id="sum">Summarize</button>
  <button id="simp">Simplify</button>
  <button id="ignore">Ignore</button>

  `;

  document.body.appendChild(banner);

  document.getElementById("learn").onclick = rebuildPage;
  document.getElementById("sum").onclick = summarizePage;
  document.getElementById("simp").onclick = simplifyPage;
  document.getElementById("ignore").onclick = () => banner.remove();
}

/* ================================
   SUMMARIZE PAGE
================================ */

async function summarizePage() {
  showReadingPanel(AI_LOADING);

  try {
    const text = extractText();

    const res = await fetch("http://localhost:5000/api/reader/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    const data = await res.json();

    showReadingPanel(`
            <h2>📄 Page Summary</h2>
            ${formatAI(data.summary)}
        `);
  } catch (error) {
    console.error("Summary error:", error);

    showOverlay("AI summary failed.");
  }
}

/* ================================
   SIMPLIFY PAGE
================================ */

async function simplifyPage() {
  if (simplifiedCache) {
    showReadingPanel(formatAI(simplifiedCache));
    return;
  }

  showReadingPanel(AI_LOADING);

  try {
    const text = extractText();

    const res = await fetch("http://localhost:5000/api/reader/simplify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, 4000) }),
    });

    const data = await res.json();

    if (!data.simple) {
      showOverlay("AI simplification unavailable.");
      return;
    }

    simplifiedCache = data.simple;

    showReadingPanel(formatAI(data.simple));
  } catch (error) {
    console.error("Simplify error:", error);
    showOverlay("AI simplify failed.");
  }
}

/* ================================
   LEARNING MODE (REBUILD PAGE)
================================ */

async function rebuildPage() {
  showReadingPanel(AI_LOADING);

  try {
    const text = extractText();

    const res = await fetch("http://localhost:5000/api/reader/rebuild", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    const data = await res.json();

    if (!data.rebuilt) {
      showOverlay("AI learning mode unavailable.");
      return;
    }

    showReadingPanel(`
            <h2>🎓 Learning Mode</h2>
            ${formatAI(data.rebuilt)}
        `);
  } catch (error) {
    console.error("Learning mode error:", error);
    showOverlay("AI learning mode failed.");
  }
}

/* ================================
   SCROLL ASSISTANT
================================ */

let scrollTriggered = false;

window.addEventListener("scroll", () => {
  if (scrollTriggered) return;

  if (window.scrollY > 800) {
    scrollTriggered = true;

    showOverlay(
      "🧠 Section Insight: This part explains the main concept of the article.",
    );
  }
});

/* ================================
   AI ASSISTANT SIDEBAR
================================ */

function openAssistant() {
  if (document.getElementById("ai-sidebar")) return;

  const sidebar = document.createElement("div");

  sidebar.id = "ai-sidebar";

  sidebar.style.position = "fixed";
  sidebar.style.top = "0";
  sidebar.style.right = "0";
  sidebar.style.width = "350px";
  sidebar.style.height = "100%";
  sidebar.style.background = "white";
  sidebar.style.boxShadow = "-2px 0 10px rgba(0,0,0,0.2)";
  sidebar.style.zIndex = "999999";
  sidebar.style.display = "flex";
  sidebar.style.flexDirection = "column";

  sidebar.innerHTML = `

    <div style="background:#6366f1;color:white;padding:12px;font-weight:bold;display:flex;justify-content:space-between;">
        <span>AI Reading Assistant</span>
        <span id="closeAssistant" style="cursor:pointer;">✕</span>
    </div>

    <div id="ai-messages" style="flex:1;padding:10px;overflow-y:auto;line-height:1.5;"></div>

    <div id="ai-suggestions" style="padding:10px;border-top:1px solid #eee;font-size:12px;">
        <b>Suggested Questions</b>
        <div class="suggestion">What is the main idea of this page?</div>
        <div class="suggestion">Explain this topic in simple terms</div>
        <div class="suggestion">What are the key takeaways?</div>
    </div>

    <input id="ai-input"
        placeholder="Ask about this page..."
        style="border:none;border-top:1px solid #ddd;padding:10px;" />

    `;

  document.body.appendChild(sidebar);

  document.getElementById("closeAssistant").onclick = () => {
    sidebar.remove();
  };

  /* =========================
       Style suggestion buttons
    ========================= */

  document.querySelectorAll(".suggestion").forEach((btn) => {
    btn.style.marginTop = "6px";
    btn.style.padding = "6px";
    btn.style.background = "#f3f4f6";
    btn.style.borderRadius = "6px";
    btn.style.cursor = "pointer";
  });

  /* =========================
       Make suggestions clickable
    ========================= */

  document.querySelectorAll(".suggestion").forEach((btn) => {
    btn.onclick = () => {
      const input = document.getElementById("ai-input");

      input.value = btn.innerText;

      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    };
  });

  const input = document.getElementById("ai-input");

  input.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      const question = input.value.trim();

      if (!question) return;

      input.value = "";

      addMessage("You", question);

      /* Hide suggestions after first interaction */

      const suggestions = document.getElementById("ai-suggestions");
      if (suggestions) suggestions.remove();

      const text = extractText();

      const limitedText = extractText().slice(0, 5000);

      const thinking = addMessage("AI", "🧠 NeuroLens is thinking...");

      const res = await fetch("http://localhost:5000/api/reader/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          question,
          text: limitedText,
        }),
      });

      const data = await res.json();

      setTimeout(() => {
        thinking.innerHTML = formatAI(data.answer);
      }, 400);
    }
  });
}

/* ================================
   CHAT MESSAGES
================================ */

function addMessage(sender, text) {
  const container = document.getElementById("ai-messages");

  const wrapper = document.createElement("div");

  wrapper.style.display = "flex";
  wrapper.style.marginBottom = "10px";

  const bubble = document.createElement("div");

  bubble.style.maxWidth = "80%";
  bubble.style.padding = "8px 10px";
  bubble.style.borderRadius = "10px";
  bubble.style.fontSize = "13px";
  bubble.style.lineHeight = "1.5";
  bubble.style.transition = "all 0.2s ease";

  if (sender === "You") {
    wrapper.style.justifyContent = "flex-end";

    bubble.style.background = "#6366f1";
    bubble.style.color = "white";

    bubble.innerHTML = text;
  } else {
    wrapper.style.justifyContent = "flex-start";

    bubble.style.background = "#f3f4f6";
    bubble.style.color = "#111827";

    bubble.innerHTML = formatAI(text);
  }

  bubble.style.opacity = "0";
  bubble.style.transform = "translateY(6px)";

  wrapper.appendChild(bubble);
  container.appendChild(wrapper);

  setTimeout(() => {
    bubble.style.opacity = "1";
    bubble.style.transform = "translateY(0)";
  }, 10);

  container.scrollTop = container.scrollHeight;

  return bubble;
}

/* ================================
   ShowReading Panel
================================ */

function showReadingPanel(html) {
  const existing = document.getElementById("neurolens-panel");
  if (existing) existing.remove();

  const panel = document.createElement("div");
  panel.id = "neurolens-panel";

  panel.style.position = "fixed";
  panel.style.top = "0";
  panel.style.right = "0";
  panel.style.width = "420px";
  panel.style.height = "100%";
  panel.style.background = "white";
  panel.style.boxShadow = "-3px 0 20px rgba(0,0,0,0.2)";
  panel.style.zIndex = "999999";
  panel.style.overflowY = "auto";
  panel.style.fontFamily = "Arial";
  panel.style.lineHeight = "1.6";
  panel.style.padding = "20px";

  panel.style.transform = "translateX(100%)";
  panel.style.transition = "transform 0.3s ease";

  panel.innerHTML = `
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">

<div style="display:flex;align-items:center;gap:8px;font-weight:bold;">
🧠 NeuroLens AI
</div>

<div style="display:flex;gap:12px;align-items:center;">
<span id="read-panel" style="cursor:pointer;">🔊</span>
<span id="read-along" style="cursor:pointer;">📖</span>
<span id="close-neurolens" style="cursor:pointer;font-size:18px;">✕</span>
</div>

</div>

${html}
`;

  document.body.appendChild(panel);

  document.body.style.marginRight = "420px";
  document.body.style.transition = "margin-right 0.3s ease";

  document.getElementById("close-neurolens").onclick = () => {
    panel.remove();
    document.body.style.marginRight = "0";
  };

  document.getElementById("read-panel").onclick = enableReadingMode;
  document.getElementById("read-along").onclick = enableReadAlong;

  setTimeout(() => {
    panel.style.transform = "translateX(0)";
  }, 10);
}

/* ================================
   OVERLAY UI
================================ */

function showOverlay(text) {
  const existing = document.getElementById("neurolens-overlay");
  if (existing) existing.remove();

  const box = document.createElement("div");
  box.id = "neurolens-overlay";

  box.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;">
  <span>${text}</span>
  <span id="closeOverlay" style="cursor:pointer;margin-left:10px;">✕</span>
</div>
`;

  box.style.position = "fixed";
  box.style.bottom = "20px";
  box.style.right = "20px";
  box.style.width = "320px";
  box.style.padding = "15px";
  box.style.background = "white";
  box.style.boxShadow = "0 5px 20px rgba(0,0,0,0.2)";
  box.style.borderRadius = "10px";
  box.style.zIndex = "999999";
  box.style.opacity = "0";
  box.style.transform = "translateY(10px)";
  box.style.transition = "all 0.25s ease";

  document.body.appendChild(box);
  box.querySelector("#closeOverlay").onclick = () => box.remove();

  setTimeout(() => {
    box.style.opacity = "1";
    box.style.transform = "translateY(0)";
  }, 10);

  // auto close after 3 seconds
  setTimeout(() => {
    box.remove();
  }, 3000);
}

/* ================================
   HIGHLIGHT → AI EXPLAIN
================================ */

document.addEventListener("mouseup", async () => {
  const selectedText = window.getSelection().toString().trim();

  if (selectedText.length < 10) return;

  const key = getCacheKey(selectedText);

  const cached = localStorage.getItem(key);

  // Use cached AI result if available
  if (cached) {
    showAIExplanation(cached);
    return;
  }

  try {
    const res = await fetch("http://localhost:5000/api/reader/simplify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: selectedText }),
    });

    const data = await res.json();

    const result = data.simple || "AI explanation unavailable.";

    // Save result to cache
    localStorage.setItem(key, result);

    showAIExplanation(formatAI(result));
  } catch (error) {
    console.error("AI explanation error:", error);
  }
});

document.addEventListener("mouseup", () => {
  const selectedText = window.getSelection().toString().trim();

  if (selectedText.length < 10) return;

  const btn = document.createElement("div");

  btn.innerText = "✨ Explain";

  btn.style.position = "fixed";
  btn.style.bottom = "90px";
  btn.style.right = "20px";
  btn.style.background = "#6366f1";
  btn.style.color = "white";
  btn.style.padding = "8px 12px";
  btn.style.borderRadius = "20px";
  btn.style.cursor = "pointer";
  btn.style.zIndex = "999999";

  document.body.appendChild(btn);

  setTimeout(() => btn.remove(), 4000);
});

/* =================================
   Floating AI Explanation Card
================================= */

function showAIExplanation(text) {
  // remove existing card if already open
  const existing = document.getElementById("neurolens-ai-card");
  if (existing) existing.remove();

  const card = document.createElement("div");
  card.id = "neurolens-ai-card";

  card.style.position = "fixed";
  card.style.bottom = "30px";
  card.style.right = "30px";
  card.style.width = "300px";
  card.style.background = "white";
  card.style.borderRadius = "10px";
  card.style.boxShadow = "0 10px 25px rgba(0,0,0,0.2)";
  card.style.padding = "15px";
  card.style.zIndex = "999999";
  card.style.fontFamily = "Arial, sans-serif";

  card.innerHTML = `
  
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
    <strong>🧠 AI Explanation</strong>
    <span id="close-ai-card" style="cursor:pointer;font-size:14px;">✕</span>
  </div>

  <div style="font-size:13px;line-height:1.5;color:#374151;">
    ${text}
  </div>

  `;

  document.body.appendChild(card);

  document.getElementById("close-ai-card").onclick = () => {
    card.remove();
  };
}

/* =========================
   Floating AI Button
========================= */

const aiButton = document.createElement("div");

aiButton.innerText = "🧠 Ask AI";

aiButton.style.position = "fixed";
aiButton.style.bottom = "20px";
aiButton.style.right = "20px";
aiButton.style.background = "#6366f1";
aiButton.style.color = "white";
aiButton.style.padding = "10px 14px";
aiButton.style.borderRadius = "20px";
aiButton.style.cursor = "pointer";
aiButton.style.zIndex = "999999";
aiButton.style.fontSize = "13px";
aiButton.style.boxShadow = "0 6px 15px rgba(0,0,0,0.2)";

document.body.appendChild(aiButton);

aiButton.onclick = openAssistant;

// Adhd Mode (Bionic Reading)

// ADHD Mode (Bionic Reading)

function enableADHDMode() {
  adhdMode = !adhdMode;

  const elements = document.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li");

  elements.forEach((el) => {
    if (!adhdMode) {
      if (el.dataset.original) {
        el.innerHTML = el.dataset.original;
      }

      return;
    }

    if (!el.dataset.original) {
      el.dataset.original = el.innerHTML;
    }

    const words = el.innerText.split(" ");

    const bionic = words
      .map((word) => {
        const mid = Math.ceil(word.length / 2);

        return "<b>" + word.slice(0, mid) + "</b>" + word.slice(mid);
      })
      .join(" ");

    el.innerHTML = bionic;
  });

  showOverlay(adhdMode ? "🧠 ADHD Mode Enabled" : "ADHD Mode Disabled");
}

// Dyslexia Mode

// Dyslexia Mode

function enableDyslexiaMode() {
  dyslexiaMode = !dyslexiaMode;

  if (!dyslexiaMode) {
    document.body.style.fontFamily = "";
    document.body.style.lineHeight = "";
    document.body.style.letterSpacing = "";
    document.body.style.wordSpacing = "";
    document.body.style.backgroundColor = "";

    document.body.style.maxWidth = "";
    document.body.style.marginLeft = "";
    document.body.style.marginRight = "";
    document.body.style.margin = "";
    document.body.style.width = "";

    showOverlay("📖 Dyslexia Mode Disabled");
    return;
  }

  document.body.style.fontFamily = "Arial, Helvetica, sans-serif";
  document.body.style.lineHeight = "1.8";
  document.body.style.letterSpacing = "0.05em";
  document.body.style.wordSpacing = "0.15em";
  document.body.style.backgroundColor = "#f8fafc";
  document.body.style.padding = "20px";
  document.body.style.maxWidth = "1100px";
  document.body.style.marginLeft = "auto";
  document.body.style.marginRight = "auto";

  showOverlay("📖 Dyslexia Mode Enabled");
}
// Focus Mode

// Focus Mode (Reader Style)

function enableFocusMode() {
  focusMode = !focusMode;

  const existing = document.getElementById("neurolens-focus");

  if (!focusMode) {
    if (existing) existing.remove();
    document.body.style.marginRight = "";
    showOverlay("Focus Mode Disabled");
    return;
  }

  let article = "";

  const elements = document.querySelectorAll(
    "article p, main p, p, h1, h2, h3",
  );

  elements.forEach((el) => {
    if (el.innerText.length > 60) {
      article += `<${el.tagName.toLowerCase()}>${el.innerText}</${el.tagName.toLowerCase()}>`;
    }
  });

  const panel = document.createElement("div");
  panel.id = "neurolens-focus";

  panel.style.position = "fixed";
  panel.style.top = "0";
  panel.style.right = "0";
  panel.style.width = "520px";
  panel.style.height = "100%";
  panel.style.background = "white";
  panel.style.padding = "40px";
  panel.style.overflowY = "auto";
  panel.style.boxShadow = "-4px 0 20px rgba(0,0,0,0.2)";
  panel.style.zIndex = "999999";
  panel.style.fontSize = "18px";
  panel.style.lineHeight = "1.8";
  panel.style.fontFamily = "Georgia, serif";

  panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;margin-bottom:20px;">
            <strong>🎯 Focus Mode</strong>
            <span id="closeFocus" style="cursor:pointer;font-size:20px;">✕</span>
        </div>
        ${article}
    `;

  panel.style.transform = "translateX(100%)";
  panel.style.transition = "transform 0.3s ease";

  document.body.appendChild(panel);

  setTimeout(() => {
    panel.style.transform = "translateX(0)";
  }, 10);

  document.body.style.marginRight = "520px";

  document.getElementById("closeFocus").onclick = enableFocusMode;

  showOverlay("🎯 Focus Mode Enabled");
}

const style = document.createElement("style");

style.innerHTML = `
.read-word{
 padding:2px;
 border-radius:3px;
}
`;

document.head.appendChild(style);

// Reading Mode (Text to Speech)

function enableReadingMode() {
  const panel = document.getElementById("neurolens-panel");
  if (!panel) return;

  const text = panel.innerText;

  if (!speech) {
    speech = new SpeechSynthesisUtterance(text);

    const voices = speechSynthesis.getVoices();

    const preferredVoices = voices.filter(
      (v) =>
        v.lang.includes("en") &&
        (v.name.toLowerCase().includes("google") ||
          v.name.toLowerCase().includes("female") ||
          v.name.toLowerCase().includes("male")),
    );

    speech.voice = preferredVoices[0] || voices[0];

    if (voices.length) {
      speech.voice = voices.find((v) => v.lang.includes("en")) || voices[0];
    }

    speech.rate = 1;
    speech.pitch = 1;
    speech.volume = 1;
  }

  if (!speaking) {
    speechSynthesis.speak(speech);
    speaking = true;
    showOverlay("🔊 Reading started");
  } else {
    speechSynthesis.pause();
    speaking = false;
    showOverlay("⏸ Reading paused");
  }
}

function enableReadAlong() {
  const panel = document.getElementById("neurolens-panel");
  if (!panel) return;

  const textNodes = panel.querySelectorAll("p, li");

  let words = [];

  textNodes.forEach((el) => {
    const parts = el.innerText.split(" ");

    el.innerHTML = parts
      .map((w) => `<span class="read-word">${w}</span>`)
      .join(" ");

    words.push(...el.querySelectorAll(".read-word"));
  });

  const utter = new SpeechSynthesisUtterance(panel.innerText);

  utter.onboundary = (event) => {
    let charCount = 0;
    let index = 0;

    for (let i = 0; i < words.length; i++) {
      charCount += words[i].innerText.length + 1;
      if (event.charIndex <= charCount) {
        index = i;
        break;
      }
    }

    words.forEach((w) => (w.style.background = ""));

    if (words[index]) {
      words[index].style.background = "#fde68a";

      words[index].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  speechSynthesis.speak(utter);
}
