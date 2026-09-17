import { randomBytes } from "node:crypto";

const prefixes = {
  session: "ses",
  intake: "int",
  slot: "slt",
  booking: "bkg",
} as const;

export type IdKind = keyof typeof prefixes;

export function createId(kind: IdKind): string {
  return `${prefixes[kind]}_${randomBytes(8).toString("hex")}`;
}
