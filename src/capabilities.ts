export const capabilities = [
  {
    id: "intake",
    method: "POST" as const,
    path: "/v1/intake",
    description: "Send structured intake so the desk knows who is asking and why.",
  },
  {
    id: "propose-slots",
    method: "POST" as const,
    path: "/v1/slots/propose",
    description: "Ask for open times that match the intake duration and timezone.",
  },
  {
    id: "confirm-booking",
    method: "POST" as const,
    path: "/v1/bookings/confirm",
    description: "Lock one proposed slot and receive a booking id plus ICS payload.",
  },
  {
    id: "booking-status",
    method: "GET" as const,
    path: "/v1/bookings/{id}",
    description: "Read the status of a confirmed booking.",
  },
];
