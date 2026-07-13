import { Schema, model } from "mongoose";

// Singleton document (single row) holding the current company VCF settings.
const vcfSettingsSchema = new Schema({
  _id: { type: String },
  companyName: { type: String, default: "Nutterx Technologies" },
  contactName: { type: String, default: "Nutterx Technologies" },
  phone: { type: String, default: "" },
  email: { type: String, default: "" },
  website: { type: String, default: "" },
  address: { type: String, default: "" },
  whatsapp: { type: String, default: "" },
  logoDataUrl: { type: String, default: null },
  registrationTarget: { type: Number, default: 500, min: 1 },
});

export const VcfSettingsModel = model("VcfSettings", vcfSettingsSchema);

const SETTINGS_ID = "singleton-settings";

/** Fetches the singleton settings document, creating it with defaults if absent. */
export async function getOrCreateSettings() {
  let settings = await VcfSettingsModel.findById(SETTINGS_ID);
  if (!settings) {
    settings = await VcfSettingsModel.create({ _id: SETTINGS_ID });
  }
  return settings;
}

export { SETTINGS_ID };
