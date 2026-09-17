import { config } from "../config.js";
import { toIcsUtc } from "./time.js";

export type IcsEvent = {
  uid: string;
  dtstamp: string;
  dtstart: string;
  dtend: string;
  summary: string;
  description: string;
  location: string;
  organizer: string;
  status: "CONFIRMED";
  text: string;
};

function fold(line: string): string {
  return line.replace(/\n/g, "\\n");
}

export function buildIcs(input: {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description: string;
  location?: string;
}): IcsEvent {
  const dtstamp = toIcsUtc(new Date());
  const dtstart = toIcsUtc(input.start);
  const dtend = toIcsUtc(input.end);
  const location = input.location ?? "Video call — details follow from Keel";
  const organizer = `mailto:${config.product.organizerEmail}`;

  const text = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Keel//Booking Desk//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${input.uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${fold(input.summary)}`,
    `DESCRIPTION:${fold(input.description)}`,
    `LOCATION:${fold(location)}`,
    `ORGANIZER:${organizer}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");

  return {
    uid: input.uid,
    dtstamp,
    dtstart,
    dtend,
    summary: input.summary,
    description: input.description,
    location,
    organizer,
    status: "CONFIRMED",
    text,
  };
}
