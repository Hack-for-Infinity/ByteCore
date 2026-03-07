# 🏷️ Project Title

*NeuroLens*

## 👥 Team Members

| Name | GitHub Username |
|------|----------------|
| Abdul Nasir  | [AbdulNasir05](https://github.com/AbdulNasir05)             |
| Abdul Muizz  | [AbdulMuizz789](https://github.com/AbdulMuizz789)             |

## ❓ Problem Statement

The modern web is often cluttered with dense, complex, and unstructured information that can be overwhelming for neurodiverse individuals. Traditional reading experiences lack the flexibility to adapt to different cognitive needs, leading to information overload and reduced comprehension for those with ADHD or dyslexia.

## 🏗️ System Architecture / Design

- **Client (Browser Extension):** A Manifest V3 Chrome extension that extracts page content, provides an interactive UI (sidebars, overlays, banners), and handles user actions.
- **Server (Node.js API):** An Express-based backend that processes text, manages AI prompts, and interfaces with the Google Gemini API.
- **AI Engine (Gemini 2.5 Flash):** Generates summaries, simplifies text, and provides contextual answers based on the page content.
- **Data Layer:** Prisma ORM for future persistence and AI response caching for performance.
<img width="2816" height="1536" alt="System architecture" src="https://github.com/user-attachments/assets/0e1180b5-0f25-4dd4-8fad-092d974ceddd" />


## 🛠️ Technologies Used

- **Frontend:** JavaScript, HTML, CSS (Chrome Extension V3)
- **Backend:** Node.js, Express, TypeScript
- **AI:** Google Generative AI (Gemini 2.5 Flash)
- **Database/ORM:** Prisma
- **Environment:** Dotenv for secure API key management

## ⭐ Key Features

- **🧠 AI Difficulty Detection:** Automatically analyzes page complexity and suggests the best reading mode.
- **📝 Smart Summarization:** Condenses long articles into 5 essential bullet points.
- **✨ Text Simplification:** Rewrites jargon-heavy paragraphs into clear, simple language.
- **🎓 Learning Mode:** Rebuilds entire pages into structured guides with "Key Ideas," "Important Terms," and "Micro-learning Steps."
- **💬 AI Reading Assistant:** A persistent sidebar to ask specific questions about the content you're reading.
- **🔍 Instant Contextual Help:** Highlight any text to get an immediate AI-powered explanation.
- **⏳ Reading Time Estimates:** Helps users manage their focus by knowing how long a page will take to read.

## ⚙️ How It Works

1. The extension extracts the main text content from the active browser tab.
2. It sends this data to the backend API, which performs an initial difficulty analysis.
3. Users can then trigger various "Lenses" (Summary, Simplify, Rebuild) from the popup or the on-page banner.
4. The AI processes the request using optimized system prompts tailored for neurodiverse accessibility.
5. The results are streamed or injected back into the page via a clean, distraction-free "Reading Panel."

## 🚀 How to Run

### 1. Backend Setup
```bash
cd Backend
npm install
# Create a .env file with GEMINI_KEY_1=your_api_key
npx prisma migrate dev --name init
npm run dev
```

### 2. Extension Setup
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in the top right).
3. Click **Load unpacked**.
4. Select the `Extension` folder from this repository.

### 3. Usage
- Open any article or blog post.
- Wait for the NeuroLens analysis banner or click the extension icon.
- Select your preferred reading mode or ask the AI assistant for help.
