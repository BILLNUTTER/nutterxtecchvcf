import { Router, type IRouter, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { connectMongo } from "../lib/mongoose";
import { RegistrationModel } from "../models/Registration";
import { getOrCreateSettings } from "../models/VcfSettings";
import { normalizeAndValidatePhone } from "../lib/phone";
import { buildVcf } from "../lib/vcf";
import { syncExternalRegistrations } from "../lib/syncExternalRegistrations";
import {
  RegisterPhoneBody,
  RegisterPhoneResponse,
  GetCommunityProgressResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Limit registration attempts to prevent abuse of the public endpoint.
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many registration attempts. Please try again later." },
});

router.post(
  "/register",
  registerLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = RegisterPhoneBody.safeParse(req.body);
    if (!parsed.success) {
      req.log.warn({ errors: parsed.error.message }, "Invalid registration input");
      res.status(400).json({ error: "Full name and phone number are required." });
      return;
    }

    const name = parsed.data.name.trim();
    if (!name) {
      res.status(400).json({ error: "Full name is required." });
      return;
    }

    const phone = normalizeAndValidatePhone(parsed.data.phone);
    if (!phone) {
      res.status(400).json({
        error:
          "Enter a valid phone number in E.164 format with a country code, e.g. +254712345678.",
      });
      return;
    }

    await connectMongo();

    const existing = await RegistrationModel.findOne({ phone });
    if (existing) {
      res.status(409).json({ error: "This phone number is already registered." });
      return;
    }

    try {
      const registration = await RegistrationModel.create({ name, phone });
      res.status(201).json(
        RegisterPhoneResponse.parse({
          id: registration._id.toString(),
          name: registration.name,
          phone: registration.phone,
          createdAt: registration.createdAt,
        }),
      );
    } catch (err: unknown) {
      // Handles the rare race where two requests pass the findOne check
      // concurrently; the unique index rejects the second insert.
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code?: number }).code === 11000
      ) {
        res.status(409).json({ error: "This phone number is already registered." });
        return;
      }
      throw err;
    }
  },
);

router.get(
  "/download-vcf",
  async (_req: Request, res: Response): Promise<void> => {
    await connectMongo();
    await syncExternalRegistrations();
    const settings = await getOrCreateSettings();
    const total = await RegistrationModel.countDocuments();

    if (total < settings.registrationTarget) {
      res.status(403).json({
        error: `The contact card unlocks once ${settings.registrationTarget} people have registered. ${settings.registrationTarget - total} to go.`,
      });
      return;
    }

    const vcf = buildVcf(settings);

    res.setHeader("Content-Type", "text/vcard; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="NUTTERX.vcf"');
    res.send(vcf);
  },
);

router.get(
  "/progress",
  async (_req: Request, res: Response): Promise<void> => {
    await connectMongo();
    await syncExternalRegistrations();
    const settings = await getOrCreateSettings();
    const total = await RegistrationModel.countDocuments();

    res.json(
      GetCommunityProgressResponse.parse({
        total,
        target: settings.registrationTarget,
        unlocked: total >= settings.registrationTarget,
      }),
    );
  },
);

export default router;
