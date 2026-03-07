import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import { PrismaClient } from "@prisma/client"

/* =========================
   ROUTE IMPORTS
========================= */

import readerRoutes from "./routes/reader.routes"

dotenv.config()

const app = express()
const prisma = new PrismaClient()

/* =========================
   MIDDLEWARE
========================= */

app.use(cors())
app.use(express.json())

/* =========================
   HEALTH CHECK
========================= */

app.get("/api/health", async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`

        res.json({
            status: "Backend running",
            database: "Connected",
        })

    } catch (error) {

        res.status(500).json({
            status: "Backend running",
            database: "Disconnected",
        })

    }
})

/* =========================
   API ROUTES
========================= */

app.use("/api/reader", readerRoutes)


/* =========================
   GLOBAL ERROR HANDLER
========================= */

app.use((err: any, req: any, res: any, next: any) => {

    console.error(err)

    res.status(500).json({
        error: "Internal server error",
    })

})

/* =========================
   SERVER START
========================= */

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {

    console.log(`🚀 Server running on http://localhost:${PORT}`)

})