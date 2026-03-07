import { Router } from "express"
import {
  summarizePage,
  simplifyText,
  rebuildPage,
  detectDifficulty,
  chatWithPage
} from "../controllers/reader.controller"

const router = Router()

router.post("/summarize", summarizePage)

router.post("/simplify", simplifyText)

router.post("/rebuild", rebuildPage)

router.post("/difficulty", detectDifficulty)

router.post("/chat", chatWithPage)

export default router