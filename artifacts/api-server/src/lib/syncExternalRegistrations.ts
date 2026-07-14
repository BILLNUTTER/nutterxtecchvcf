import mongoose from "mongoose";
import { logger } from "./logger";
import { RegistrationModel } from "../models/Registration";

// A sibling app (separate codebase, same MongoDB Atlas cluster) collects its
// own registrations independently, in database `nxvcfapp`, collection
// `contacts` (fields: name, phone_number [digits only, no leading +], link,
// created_at). Those sign-ups should count toward this app's community
// progress too, so on every read we pull in anything new from there that
// isn't in our own `registrations` collection yet, deduped by phone number.
//
// This runs opportunistically before any count that's shown to users (see
// routes/register.ts). It's throttled so we don't hit the sibling
// collection on every single request.
const EXTERNAL_DB_NAME = "nxvcfapp";
const EXTERNAL_COLLECTION = "contacts";
const MIN_SYNC_INTERVAL_MS = 15_000;

interface ExternalContact {
  _id: unknown;
  name?: string;
  phone_number?: string;
  created_at?: string | Date;
}

let lastSyncAt = 0;
let syncInFlight: Promise<void> | null = null;

function toE164(rawPhoneNumber: string): string | null {
  const digits = rawPhoneNumber.replace(/\D/g, "");
  if (!digits) return null;
  return `+${digits}`;
}

async function doSync(): Promise<void> {
  const externalDb = mongoose.connection.useDb(EXTERNAL_DB_NAME, {
    useCache: true,
  });
  const externalContacts = await externalDb
    .collection<ExternalContact>(EXTERNAL_COLLECTION)
    .find({})
    .toArray();

  if (externalContacts.length === 0) return;

  const existingPhones = new Set(
    (await RegistrationModel.find({}, { phone: 1 }).lean()).map(
      (doc) => doc.phone,
    ),
  );

  const toInsert: { name: string; phone: string; createdAt: Date }[] = [];
  const seenThisBatch = new Set<string>();

  for (const contact of externalContacts) {
    const name = contact.name?.trim();
    if (!name || !contact.phone_number) continue;

    const phone = toE164(contact.phone_number);
    if (!phone || existingPhones.has(phone) || seenThisBatch.has(phone)) {
      continue;
    }

    seenThisBatch.add(phone);
    toInsert.push({
      name,
      phone,
      createdAt: contact.created_at ? new Date(contact.created_at) : new Date(),
    });
  }

  if (toInsert.length === 0) return;

  try {
    await RegistrationModel.insertMany(toInsert, { ordered: false });
    logger.info(
      { count: toInsert.length },
      "Synced new registrations from sibling app's database",
    );
  } catch (err) {
    // Duplicate-key races (e.g. two warm invocations syncing at once) are
    // expected here and not worth failing the request over.
    logger.warn({ err }, "Some registrations failed to sync from sibling app");
  }
}

/**
 * Best-effort, throttled sync of the sibling app's sign-ups into this app's
 * `registrations` collection. Never throws — a failure here should not
 * break the community-progress or download endpoints, since the sibling
 * database is an external dependency outside this app's control.
 */
export async function syncExternalRegistrations(): Promise<void> {
  const now = Date.now();
  if (now - lastSyncAt < MIN_SYNC_INTERVAL_MS) return;

  if (!syncInFlight) {
    lastSyncAt = now;
    syncInFlight = doSync()
      .catch((err) => {
        logger.warn(
          { err },
          "Failed to sync registrations from sibling app's database",
        );
      })
      .finally(() => {
        syncInFlight = null;
      });
  }

  await syncInFlight;
}
