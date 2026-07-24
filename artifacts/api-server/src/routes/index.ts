import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import problemsRouter from "./problems.js";
import analyticsRouter from "./analytics.js";
import revisionRouter from "./revision.js";
import contestRouter from "./contest.js";
import searchRouter from "./search.js";
import notesRouter from "./notes.js";
import importExportRouter from "./import-export.js";
import settingsRouter from "./settings.js";

const router: IRouter = Router();

// Health (public)
router.use(healthRouter);

// Auth (public)
router.use(authRouter);

// Protected routes
router.use(problemsRouter);
router.use(analyticsRouter);
router.use(revisionRouter);
router.use(contestRouter);
router.use(searchRouter);
router.use(notesRouter);
router.use(importExportRouter);
router.use(settingsRouter);

export default router;
