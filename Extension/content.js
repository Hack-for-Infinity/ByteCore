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

/* ================================
   PAGE ANALYSIS
================================ */

window.addEventListener("load", analyzePage);

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
