export const capabilityIds = [
  "intake",
  "slots.propose",
  "bookings.confirm",
  "bookings.get",
] as const;

export type CapabilityId = (typeof capabilityIds)[number];
