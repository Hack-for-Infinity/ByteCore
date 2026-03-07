/* =========================
   LOCAL LLAMA CONFIG
========================= */

const LLAMA_URL = "http://localhost:8888/v1/chat/completions"
const LLAMA_MODEL = "llama-3-8b" // Default model name for local server

/* =========================
   SYSTEM PROMPT
========================= */

// This prompt guides the AI to output content specifically optimized for 
// neurodiverse readers (ADHD, Dyslexia), emphasizing structure and simplicity.
const SYSTEM_PROMPT = `
You are an AI accessibility assistant helping ADHD, dyslexia and neurodiverse readers.

Your goal is to make information easier to understand.

Rules:
- Use clear and simple language
- Prefer bullet points instead of long paragraphs
- Break complex ideas into smaller sections
- Use headings when explaining concepts
- Highlight key ideas
- Keep explanations short and structured
- Avoid technical jargon unless necessary

Output Rules:
- Do NOT include greetings
- Do NOT include explanations about the task
- Do NOT say "Here is the answer"
- Return only the formatted content
- Keep responses concise and structured
`

/* =========================
   REQUEST QUEUE (Rate Safety)
========================= */

// The queue prevents overloading the local server by ensuring requests 
// are sent one at a time.
const queue: (() => Promise<void>)[] = []
let running = false

async function processQueue() {

    if (running || queue.length === 0) return

    running = true

    const job = queue.shift()

    if (job) await job()

    running = false

    // Small delay between processing requests for local model stability
    setTimeout(processQueue, 500) 
}

/* =========================
   Non-Streaming Generation
========================= */

/**
 * Sends a prompt to the local Llama model and returns the generated text.
 * Uses standard OpenAI-compatible JSON format.
 */
export const generateText = async (prompt: string): Promise<string> => {

    const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt }
    ]

    return new Promise((resolve, reject) => {

        queue.push(async () => {

            try {

                const response = await fetch(LLAMA_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: LLAMA_MODEL,
                        messages: messages,
                        temperature: 0.4,
                        max_tokens: 2048
                    })
                })

                if (!response.ok) {
                    throw new Error(`Local LLM error: ${response.statusText}`)
                }

                const data = await response.json()
                const text = data.choices[0]?.message?.content || ""

                resolve(text)

            } catch (error: any) {

                console.error("Local LLM Request Failed:", error)
                reject(error)

            }

        })

        processQueue()

    })

}

/* =========================
   Streaming Generation
========================= */

/**
 * Implementation of real-time streaming from the local Llama server.
 * Reads the response body as a stream and parses SSE data chunks.
 */
export const generateTextStream = async (
    prompt: string,
    onChunk: (chunk: string) => void
): Promise<void> => {

    const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt }
    ]

    return new Promise((resolve, reject) => {

        queue.push(async () => {

            try {

                const response = await fetch(LLAMA_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: LLAMA_MODEL,
                        messages: messages,
                        temperature: 0.4,
                        max_tokens: 2048,
                        stream: true // Request streaming from server
                    })
                })

                if (!response.ok) {
                    throw new Error(`Local LLM Streaming error: ${response.statusText}`)
                }

                // Node.js fetch (v18+) response.body is a ReadableStream
                const reader = (response.body as any).getReader()
                const decoder = new TextDecoder()
                let buffer = ""

                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break

                    buffer += decoder.decode(value, { stream: true })

                    // Split buffer into individual SSE lines (data: { ... })
                    const lines = buffer.split("\n")
                    buffer = lines.pop() || "" // Keep incomplete line in buffer

                    for (const line of lines) {
                        const trimmedLine = line.trim()
                        if (!trimmedLine || !trimmedLine.startsWith("data: ")) continue

                        const message = trimmedLine.replace(/^data: /, "")
                        if (message === "[DONE]") continue

                        try {
                            const parsed = JSON.parse(message)
                            const content = parsed.choices[0]?.delta?.content
                            if (content) {
                                onChunk(content)
                            }
                        } catch (e) {
                            // Silently ignore partial/invalid JSON in chunks
                        }
                    }
                }

                resolve()

            } catch (error: any) {
                console.error("Local LLM Streaming Failed:", error)
                reject(error)
            }

        })

        processQueue()

    })

}