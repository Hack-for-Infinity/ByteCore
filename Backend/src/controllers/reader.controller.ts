import { Request, Response } from "express"
import { generateText } from "../services/ai.service"

/* ---------------------------
AI Response Cache
--------------------------- */

const aiCache = new Map<string, string>()
const MAX_CACHE = 200

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

        const key = "rebuild_" + text.slice(0, 2000)

        if (aiCache.has(key)) {
            return res.json({ rebuilt: aiCache.get(key) })
        }

        const result = await generateText(`
      Analyze the cognitive difficulty of this text.

      Return ONLY one word:

      LOW
      MEDIUM
      HIGH

      Text:
      ${text}
    `)

        if (aiCache.size >= MAX_CACHE) {
            aiCache.clear()
        }

        aiCache.set(key, result)

        res.json({ level: result.trim() })

    } catch (error) {

        console.error("Difficulty detection error:", error)

        res.status(500).json({
            error: "AI service unavailable"
        })

    }

}


/* ---------------------------
AI Chat with Page
--------------------------- */

export const chatWithPage = async (req: Request, res: Response) => {

    try {

        const { text, question } = req.body

        const key = "chat_" + question + text.slice(0, 1000)

        if (aiCache.has(key)) {
            return res.json({ answer: aiCache.get(key) })
        }

        const result = await generateText(`
      Answer the question using the webpage content.

      Webpage:
      ${text}

      Question:
      ${question}
    `)

        if (aiCache.size >= MAX_CACHE) {
            aiCache.clear()
        }

        aiCache.set(key, result)

        res.json({ answer: result })

    } catch (error) {

        console.error("Chat error:", error)

        res.status(500).json({
            error: "AI service unavailable"
        })

    }

}