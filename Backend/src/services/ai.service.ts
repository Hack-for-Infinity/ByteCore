import { GoogleGenerativeAI } from "@google/generative-ai"

/* =========================
   API KEYS (Rotation)
========================= */

const keys = [
    process.env.GEMINI_KEY_1,
    process.env.GEMINI_KEY_2,
    process.env.GEMINI_KEY_3,
    process.env.GEMINI_KEY_4,
    process.env.GEMINI_KEY_5
].filter(Boolean)

if (keys.length === 0) {
    throw new Error("No Gemini API keys found in environment variables.")
}

let keyIndex = 0

function getKey() {
    const key = keys[keyIndex]
    keyIndex = (keyIndex + 1) % keys.length
    return key as string
}

/* =========================
   GEMINI CLIENT
========================= */

const genAI = new GoogleGenerativeAI(getKey())

const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2048
    }
})

/* =========================
   SYSTEM PROMPT
========================= */

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

const queue: (() => Promise<void>)[] = []
let running = false

async function processQueue() {

    if (running || queue.length === 0) return

    running = true

    const job = queue.shift()

    if (job) await job()

    running = false

    setTimeout(processQueue, 1500) // delay between Gemini calls
}

/* =========================
   Non-Streaming Generation
========================= */

export const generateText = async (prompt: string): Promise<string> => {

    const finalPrompt = `
${SYSTEM_PROMPT}

${prompt}
`

    return new Promise((resolve, reject) => {

        queue.push(async () => {

            try {

                const result = await model.generateContent(finalPrompt)
                const response = await result.response

                resolve(response.text())

            } catch (error: any) {

                if (error?.status === 429) {

                    console.log("Quota hit → switching Gemini API key")

                    try {

                        const newGenAI = new GoogleGenerativeAI(getKey())

                        const newModel = newGenAI.getGenerativeModel({
                            model: "gemini-2.5-flash",
                            generationConfig: {
                                temperature: 0.4,
                                maxOutputTokens: 2048
                            }
                        })

                        const retry = await newModel.generateContent(finalPrompt)
                        const retryRes = await retry.response

                        resolve(retryRes.text())

                    } catch (retryError) {

                        console.error("Retry with new API key failed:", retryError)
                        reject(retryError)

                    }

                } else {

                    console.error("Gemini API Error:", error)
                    reject(error)

                }

            }

        })

        processQueue()

    })

}

/* =========================
   Streaming Generation
========================= */

export const generateTextStream = async (
    prompt: string,
    onChunk: (chunk: string) => void
) => {

    const finalPrompt = `
${SYSTEM_PROMPT}

${prompt}
`

    const result = await model.generateContentStream(finalPrompt)

    for await (const chunk of result.stream) {

        const text = chunk.text()

        if (text) {
            onChunk(text)
        }

    }

}