import { Router, type IRouter } from "express";
import healthRouter from "./health";
import registerRouter from "./register";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(registerRouter);
router.use(adminRouter);

export default router;
