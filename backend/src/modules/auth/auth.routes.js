import { Router } from "express";
import { googleLogin } from "./googleAuth.controller.js";

const router = Router();

/**
 * POST /auth/google
 */
router.post("/google", googleLogin);

export default router;
