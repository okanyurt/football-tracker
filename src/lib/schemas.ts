import { z } from "zod";

// ── Auth ─────────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  username: z.string().min(1).max(64).trim(),
  password: z.string().min(1).max(128),
});

// ── Players ──────────────────────────────────────────────────────────────────

const phoneRegex = /^[\d\s\-+().]+$/;

export const CreatePlayerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).trim(),
  phone: z
    .string()
    .max(20)
    .regex(phoneRegex, "Invalid phone format")
    .trim()
    .optional()
    .nullable(),
});

export const UpdatePlayerSchema = CreatePlayerSchema;

// ── Matches ───────────────────────────────────────────────────────────────────

export const CreateMatchSchema = z.object({
  date: z.string().min(1, "Date is required"),
  location: z.string().max(200).trim().optional().nullable(),
  totalCost: z.number({ message: "totalCost must be a number" }).nonnegative(),
  notes: z.string().max(1000).trim().optional().nullable(),
  playerIds: z
    .array(z.string().cuid())
    .min(1, "At least one player required")
    .max(50, "Maximum 50 players"),
  goalkeeperFree: z.boolean().optional(),
  goalkeeperPlayerIds: z.array(z.string().cuid()).max(10).optional(),
  perPlayerAmount: z.number().nonnegative().optional().nullable(),
  team1Name: z.string().max(50).trim().optional().nullable(),
  team2Name: z.string().max(50).trim().optional().nullable(),
  playerTeams: z.record(z.string(), z.number().int().min(1).max(2)).optional().nullable(),
});

// ── Match Participants ────────────────────────────────────────────────────────

export const AddParticipantsSchema = z.object({
  playerIds: z
    .array(z.string().cuid())
    .min(1, "At least one player required")
    .max(50, "Maximum 50 players"),
});

export const RemoveParticipantSchema = z.object({
  playerId: z.string().cuid("Invalid player id"),
});

// ── Match Teams ───────────────────────────────────────────────────────────────

export const UpdateTeamsSchema = z.object({
  team1Name: z.string().max(50).trim().optional().nullable(),
  team2Name: z.string().max(50).trim().optional().nullable(),
  playerTeams: z.record(z.string(), z.number().int().min(1).max(2)).optional().nullable(),
});

// ── Payments ──────────────────────────────────────────────────────────────────

export const CreatePaymentSchema = z.object({
  playerId: z.string().cuid("Invalid player id"),
  amount: z.number({ message: "amount must be a number" }),
  notes: z.string().max(500).trim().optional().nullable(),
  date: z.string().optional().nullable(),
  isKasa: z.boolean().optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

export function parseBody<T>(schema: z.ZodType<T>, data: unknown) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const messages = result.error.issues.map((i) => i.message).join(", ");
    return { ok: false as const, error: messages };
  }
  return { ok: true as const, data: result.data };
}
