let neurolensAnalyzed = false;

let simplifiedCache = null;

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

    if (!text || text.length < 2000) {
      console.log("NeuroLens: Page too small for AI analysis");
      return;
    }

    analyzePage();
  }, 4000);
}

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
  const text = extractText();

  const res = await fetch("http://localhost:5000/api/reader/summarize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({ text }),
  });

  const data = await res.json();

  showReadingPanel(formatAI(data.summary));
}

/* ================================
   SIMPLIFY PAGE
================================ */

async function simplifyPage() {
  if (simplifiedCache) {
    document.body.innerHTML = simplifiedCache;
    return;
  }

  try {
    const text = extractText();

    const res = await fetch("http://localhost:5000/api/reader/simplify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        text: text.slice(0, 4000), // prevent huge pages
      }),
    });

    const data = await res.json();

    if (!data.simple) {
      showOverlay("AI simplification unavailable.");
      return;
    }

    const formatted = formatAI(data.simple);

    showReadingPanel(formatted);

    simplifiedCache = formatted;
  } catch (error) {
    console.error("Simplify error:", error);

    showOverlay("AI simplify failed.");
  }
}

/* ================================
   LEARNING MODE (REBUILD PAGE)
================================ */

async function rebuildPage() {
  const text = extractText();

  const res = await fetch("http://localhost:5000/api/reader/rebuild", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({ text }),
  });

  const data = await res.json();

  showReadingPanel(formatAI(data.rebuilt));
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

  <input id="ai-input"
  placeholder="Ask about this page..."
  style="border:none;border-top:1px solid #ddd;padding:10px;" />

  `;

  document.body.appendChild(sidebar);

  document.getElementById("closeAssistant").onclick = () => {
    sidebar.remove();
  };

  const input = document.getElementById("ai-input");

  input.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      const question = input.value;

      input.value = "";

      addMessage("You", question);

      const text = extractText();

      // limit page text sent to AI
      const limitedText = text.slice(0, 2000);

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

      const thinking = addMessage("AI", "AI is thinking...");

      setTimeout(() => {
        thinking.innerHTML = "<b>AI:</b> " + formatAI(data.answer);
      }, 400);
    }
  });
}

/* ================================
   CHAT MESSAGES
================================ */

function addMessage(sender, text) {
  const container = document.getElementById("ai-messages");

  const div = document.createElement("div");

  div.innerHTML = "<b>" + sender + ":</b> " + text;

  div.style.marginBottom = "10px";

  container.appendChild(div);

  container.scrollTop = container.scrollHeight;

  return div;
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
            <b>✨ Simplified Version</b>
            <span id="close-neurolens" style="cursor:pointer;font-size:18px;">✕</span>
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
