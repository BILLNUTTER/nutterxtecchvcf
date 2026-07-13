interface VcfFields {
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  whatsapp: string;
}

/** Escapes characters that are significant in vCard 3.0 text values. */
function escapeVcfText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** Builds a vCard 3.0 payload for the company's official contact card. */
export function buildVcf(settings: VcfFields): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVcfText(settings.contactName)}`,
    `ORG:${escapeVcfText(settings.companyName)}`,
    settings.phone ? `TEL;TYPE=CELL,VOICE:${escapeVcfText(settings.phone)}` : null,
    settings.whatsapp
      ? `item1.TEL:${escapeVcfText(settings.whatsapp)}`
      : null,
    settings.whatsapp ? "item1.X-ABLabel:WhatsApp" : null,
    settings.email ? `EMAIL;TYPE=INTERNET:${escapeVcfText(settings.email)}` : null,
    settings.website ? `URL:${escapeVcfText(settings.website)}` : null,
    settings.address ? `ADR;TYPE=WORK:;;${escapeVcfText(settings.address)};;;;` : null,
    "END:VCARD",
  ].filter((line): line is string => line !== null);

  return lines.join("\r\n");
}
