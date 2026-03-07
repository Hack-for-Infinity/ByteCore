import { Request, Response } from "express"
import { generateText, generateTextStream } from "../services/ai.service"

/* ---------------------------
AI Response Cache
--------------------------- */

const aiCache = new Map<string, string>()
const MAX_CACHE = 200

/* ---------------------------
Simplify Paragraph (Streaming)
--------------------------- */

export const simplifyTextStream = async (req: Request, res: Response) => {

    try {

        const { text } = req.body

        res.setHeader("Content-Type", "text/event-stream")
        res.setHeader("Cache-Control", "no-cache")
        res.setHeader("Connection", "keep-alive")

        await generateTextStream(`
      Rewrite the following paragraph using simpler language. Focus on clarity and readability for neurodiverse readers.

      Text:
      ${text}
    `, (chunk) => {
            res.write(`data: ${JSON.stringify({ chunk })}\n\n`)
        })

        res.write("data: [DONE]\n\n")
        res.end()

    } catch (error) {

        console.error("Simplify Stream error:", error)

        res.status(500).json({
            error: "AI service unavailable"
        })

    }

}


/* ---------------------------
Summarize Page
--------------------------- */

export const summarizePage = async (req: Request, res: Response) => {

    try {

        const { text } = req.body

        const key = "summarize_" + text.slice(0, 2000)

        if (aiCache.has(key)) {
            return res.json({ summary: aiCache.get(key) })
        }

        const result = await generateText(`
Summarize this webpage into 5 bullet points.

Text:
${text}
`)

        if (aiCache.size >= MAX_CACHE) {
            aiCache.clear()
        }

        aiCache.set(key, result)

        res.json({ summary: result })

    } catch (error) {

        console.error("Summarize error:", error)

        res.status(500).json({
            error: "AI service unavailable"
        })

    }

}


/* ---------------------------
Simplify Paragraph
--------------------------- */

export const simplifyText = async (req: Request, res: Response) => {

    try {

        const { text } = req.body

        const key = "simplify_" + text.slice(0, 2000)

        if (aiCache.has(key)) {
            return res.json({ simple: aiCache.get(key) })
        }

        const result = await generateText(`
      Rewrite the following paragraph using simpler language.

      Text:
      ${text}
    `)

        if (aiCache.size >= MAX_CACHE) {
            aiCache.clear()
        }

        aiCache.set(key, result)

        res.json({ simple: result })

    } catch (error) {

        console.error("Simplify error:", error)

        res.status(500).json({
            error: "AI service unavailable"
        })

    }

}


/* ---------------------------
Rebuild Page
--------------------------- */

export const rebuildPage = async (req: Request, res: Response) => {

    try {

        const { text } = req.body

        const key = "rebuild_" + text.slice(0, 2000)

        if (aiCache.has(key)) {
            return res.json({ rebuilt: aiCache.get(key) })
        }

        const result = await generateText(`

Rewrite this webpage as an easy learning guide.

Structure:

Key Idea
Short explanation

Important Terms
* term - meaning

Quick Summary
* bullet points

Micro Learning Steps
1. step
2. step
3. step

Text:
${text}


`)

        if (aiCache.size >= MAX_CACHE) {
            aiCache.clear()
        }

        aiCache.set(key, result)

        res.json({ rebuilt: result })

    } catch (error) {

        console.error("Rebuild error:", error)

        res.status(500).json({
            error: "AI service unavailable"
        })

    }

}


/* ---------------------------
Difficulty Detection
--------------------------- */

export const detectDifficulty = async (req: Request, res: Response) => {

    try {

        const { text } = req.body

        const key = "diff_" + text.slice(0, 1000)

        if (aiCache.has(key)) {
            return res.json({ level: aiCache.get(key) })
        }

        const result = await generateText(`
      Analyze the cognitive difficulty of this text for a reader.
      
      CRITICAL RULE: Return ONLY one word from this list: [LOW, MEDIUM, HIGH].
      Do not include any explanation, bullets, or formatting.

      Text:
      ${text.slice(0, 3000)}
    `)

        // Post-process: extract the first valid keyword found in the response
        const match = result.match(/\b(LOW|MEDIUM|HIGH)\b/i)
        const level = match ? match[0].toUpperCase() : "MEDIUM"

        if (aiCache.size >= MAX_CACHE) {
            aiCache.clear()
        }

        aiCache.set(key, level)

        res.json({ level })

    } catch (error) {

        console.error("Difficulty detection error:", error)

        res.status(500).json({
            error: "AI service unavailable"
        })

    }

}


/* ---------------------------
AI Chat with Page (Streaming)
--------------------------- */

export const chatWithPageStream = async (req: Request, res: Response) => {

    try {

        const { text, question } = req.body

        res.setHeader("Content-Type", "text/event-stream")
        res.setHeader("Cache-Control", "no-cache")
        res.setHeader("Connection", "keep-alive")

        await generateTextStream(`
      Answer the question using the webpage content provided. 
      Keep the answer helpful but concise for someone who might have ADHD or dyslexia.

      Webpage Content:
      ${text.slice(0, 3000)}

      Question:
      ${question}
    `, (chunk) => {
            res.write(`data: ${JSON.stringify({ chunk })}\n\n`)
        })

        res.write("data: [DONE]\n\n")
        res.end()

    } catch (error) {

        console.error("Chat Stream error:", error)

        res.status(500).json({
            error: "AI service unavailable"
        })

    }

}