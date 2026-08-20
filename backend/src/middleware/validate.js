// validate.js — Measure 14: validate all input before it touches business logic or the DB.
import { z } from "zod";

export const schemas = {
  register: z.object({
    name: z.string().trim().min(2).max(80),
    phoneNumber: z.string().regex(/^\+233\d{9}$/, "Use Ghana format +233XXXXXXXXX"),
    password: z.string().min(10).max(128),
    role: z.enum(["driver", "passenger"]),
    captchaToken: z.string(),
  }),

  login: z.object({
    phoneNumber: z.string().regex(/^\+233\d{9}$/),
    password: z.string().min(1).max(128),
    captchaToken: z.string(),
  }),

  bookSeat: z.object({
    vehicleId: z.string().uuid(),
    pickupLat: z.number().min(-90).max(90),
    pickupLng: z.number().min(-180).max(180),
    destinationLat: z.number().min(-90).max(90),
    destinationLng: z.number().min(-180).max(180),
    travelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),

  vehicleLocationUpdate: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
};

export function validate(schemaName) {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Invalid input.",
        details: result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      });
    }
    req.body = result.data; // replace with the parsed, coerced, trimmed version
    next();
  };
}
