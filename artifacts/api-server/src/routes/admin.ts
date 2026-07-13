import { Router, type IRouter, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { connectMongo } from "../lib/mongoose";
import { RegistrationModel } from "../models/Registration";
import { getOrCreateSettings, VcfSettingsModel, SETTINGS_ID } from "../models/VcfSettings";
import { requireAdmin } from "../middlewares/adminAuth";
import {
  AdminLoginBody,
  GetAdminSessionResponse,
  ListRegistrationsQueryParams,
  ListRegistrationsResponse,
  DeleteRegistrationParams,
  GetStatsResponse,
  GetVcfSettingsResponse,
  UpdateVcfSettingsBody,
  UpdateVcfSettingsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
});

router.post(
  "/admin/login",
  loginLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = AdminLoginBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Username and password are required." });
      return;
    }

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminUsername || !adminPassword) {
      req.log.error("ADMIN_USERNAME / ADMIN_PASSWORD are not configured");
      res.status(500).json({ error: "Admin login is not configured." });
      return;
    }

    if (
      parsed.data.username !== adminUsername ||
      parsed.data.password !== adminPassword
    ) {
      res.status(401).json({ error: "Invalid username or password." });
      return;
    }

    req.session.isAdmin = true;
    req.session.adminUsername = parsed.data.username;

    res.json(
      GetAdminSessionResponse.parse({
        authenticated: true,
        username: parsed.data.username,
      }),
    );
  },
);

router.post("/admin/logout", (req: Request, res: Response): void => {
  req.session.destroy((err) => {
    if (err) {
      req.log.error({ err }, "Failed to destroy session");
    }
    res.status(204).send();
  });
});

router.get("/admin/session", (req: Request, res: Response): void => {
  res.json(
    GetAdminSessionResponse.parse({
      authenticated: Boolean(req.session.isAdmin),
      username: req.session.adminUsername ?? null,
    }),
  );
});

router.get(
  "/admin/registrations",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = ListRegistrationsQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    await connectMongo();

    const page = parsed.data.page ?? 1;
    const limit = parsed.data.limit ?? 20;
    const filter = parsed.data.search
      ? {
          $or: [
            { name: { $regex: parsed.data.search, $options: "i" } },
            { phone: { $regex: parsed.data.search, $options: "i" } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      RegistrationModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      RegistrationModel.countDocuments(filter),
    ]);

    res.json(
      ListRegistrationsResponse.parse({
        items: items.map((item) => ({
          id: item._id.toString(),
          name: item.name,
          phone: item.phone,
          createdAt: item.createdAt,
        })),
        total,
      }),
    );
  },
);

router.get(
  "/admin/registrations/export",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    await connectMongo();
    const items = await RegistrationModel.find().sort({ createdAt: -1 });

    const escapeCsv = (value: string): string => {
      if (/[",\n]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const rows = [
      ["Name", "Phone", "Registered At"].join(","),
      ...items.map((item) =>
        [
          escapeCsv(item.name),
          escapeCsv(item.phone),
          escapeCsv(item.createdAt.toISOString()),
        ].join(","),
      ),
    ];

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="registrations.csv"',
    );
    res.send(rows.join("\r\n"));
  },
);

router.delete(
  "/admin/registrations/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const params = DeleteRegistrationParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    await connectMongo();
    const deleted = await RegistrationModel.findByIdAndDelete(params.data.id);
    if (!deleted) {
      res.status(404).json({ error: "Registration not found." });
      return;
    }

    res.status(204).send();
  },
);

router.get(
  "/admin/stats",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    await connectMongo();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 7);

    const [totalRegistrations, todayRegistrations, weekRegistrations] =
      await Promise.all([
        RegistrationModel.countDocuments(),
        RegistrationModel.countDocuments({ createdAt: { $gte: startOfToday } }),
        RegistrationModel.countDocuments({ createdAt: { $gte: startOfWeek } }),
      ]);

    res.json(
      GetStatsResponse.parse({
        totalRegistrations,
        todayRegistrations,
        weekRegistrations,
      }),
    );
  },
);

router.get(
  "/admin/settings",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    await connectMongo();
    const settings = await getOrCreateSettings();
    res.json(
      GetVcfSettingsResponse.parse({
        companyName: settings.companyName,
        contactName: settings.contactName,
        phone: settings.phone,
        email: settings.email,
        website: settings.website,
        address: settings.address,
        whatsapp: settings.whatsapp,
        logoDataUrl: settings.logoDataUrl ?? null,
        registrationTarget: settings.registrationTarget,
      }),
    );
  },
);

router.put(
  "/admin/settings",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = UpdateVcfSettingsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    await connectMongo();
    await getOrCreateSettings();

    const updated = await VcfSettingsModel.findByIdAndUpdate(
      SETTINGS_ID,
      { $set: parsed.data },
      { new: true },
    );

    if (!updated) {
      res.status(500).json({ error: "Failed to update settings." });
      return;
    }

    res.json(
      UpdateVcfSettingsResponse.parse({
        companyName: updated.companyName,
        contactName: updated.contactName,
        phone: updated.phone,
        email: updated.email,
        website: updated.website,
        address: updated.address,
        whatsapp: updated.whatsapp,
        logoDataUrl: updated.logoDataUrl ?? null,
        registrationTarget: updated.registrationTarget,
      }),
    );
  },
);

export default router;
