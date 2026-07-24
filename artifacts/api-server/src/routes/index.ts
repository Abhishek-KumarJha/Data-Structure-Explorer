import { Router, type IRouter } from "express";
import healthRouter from "./health";
import problemsRouter from "./problems";

const router: IRouter = Router();

router.use(healthRouter);
router.use(problemsRouter);

export default router;
