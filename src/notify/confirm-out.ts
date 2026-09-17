import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type BookingNotifyPayload = {
  booking_id: string;
  status: "confirmed";
  slot: {
    slot_id: string;
    start: string;
    end: string;
    timezone: string;
  };
  ics: {
    uid: string;
    summary: string;
    dtstart: string;
    dtend: string;
  };
};

export type ConfirmOutOptions = {
  webhookUrl?: string;
  artifactsDir?: string;
  fetchImpl?: typeof fetch;
  smtpUrl?: string;
};

export async function deliverConfirmation(
  payload: BookingNotifyPayload,
  icsText: string,
  options: ConfirmOutOptions,
): Promise<void> {
  const dir = options.artifactsDir ?? process.env.ICS_ARTIFACTS_DIR ?? "artifacts";
  mkdirSync(dir, { recursive: true });
  const icsPath = join(dir, `${payload.booking_id}.ics`);
  writeFileSync(icsPath, icsText, "utf8");
  console.log(`confirm-out ics wrote ${icsPath}`);

  const webhookUrl = options.webhookUrl ?? process.env.BOOKING_WEBHOOK_URL;
  if (webhookUrl) {
    const fetchImpl = options.fetchImpl ?? fetch;
    try {
      const response = await fetchImpl(webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          event: "booking.confirmed",
          booking: payload,
        }),
      });
      console.log(
        `confirm-out webhook ${webhookUrl} status=${response.status} booking=${payload.booking_id}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `confirm-out webhook failed booking=${payload.booking_id}: ${message}`,
      );
    }
  } else {
    console.log("confirm-out webhook skipped (BOOKING_WEBHOOK_URL unset)");
  }

  const smtpUrl = options.smtpUrl ?? process.env.SMTP_URL;
  if (!smtpUrl) {
    console.log("confirm-out smtp skipped (SMTP_URL unset)");
    return;
  }
  console.log(
    "confirm-out smtp configured but send is not wired in this slice. Booking already confirmed.",
  );
}
