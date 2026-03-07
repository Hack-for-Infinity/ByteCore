import { Router } from "express"
import {
    summarizePage,
    simplifyText,
    simplifyTextStream,
    rebuildPage,
    detectDifficulty,
    chatWithPageStream
} from "../controllers/reader.controller"

const router = Router()

router.post("/summarize", summarizePage)

router.post("/simplify", simplifyText)

router.post("/simplify/stream", simplifyTextStream)

router.post("/rebuild", rebuildPage)

router.post("/difficulty", detectDifficulty)

router.post("/chat", chatWithPageStream)

export default router