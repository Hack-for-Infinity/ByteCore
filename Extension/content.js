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
   PAGE ANALYSIS
================================ */

// window.addEventListener("load", analyzePage);

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

    const words = text.split(/\s+/).length

    const minutes = Math.ceil(words / 200)

    return minutes

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

  //TODO: Add button functionality
  document.getElementById("learn").onclick = rebuildPage;
  document.getElementById("sum").onclick = summarizePage;
  document.getElementById("simp").onclick = simplifyPage;
  document.getElementById("ignore").onclick = () => banner.remove();
}

/* ================================
   SUMMARIZE PAGE
================================ */

async function summarizePage() {

    const text = extractText()

    const res = await fetch("http://localhost:5000/api/reader/summarize", {

        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({ text })

    })

    const data = await res.json()

    showReadingPanel(formatAI(data.summary))

}

/* ================================
   SIMPLIFY PAGE
================================ */

async function simplifyPage() {

    if (simplifiedCache) {
        document.body.innerHTML = simplifiedCache
        return
    }

    try {

        const text = extractText()

        const res = await fetch("http://localhost:5000/api/reader/simplify", {

            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                text: text.slice(0, 4000) // prevent huge pages
            })

        })

        const data = await res.json()

        if (!data.simple) {
            showOverlay("AI simplification unavailable.")
            return
        }

        const formatted = formatAI(data.simple)

        showReadingPanel(formatted)

        simplifiedCache = formatted

    } catch (error) {

        console.error("Simplify error:", error)

        showOverlay("AI simplify failed.")

    }

}
