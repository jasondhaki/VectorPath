import { z } from "zod";

// Evidence and redaction contracts v1 (architecture_astra.md §6.2, I08).

/** Half-open [start, end) offsets into the persisted minimized text. */
export const QuoteSpanSchema = z
  .object({ start: z.number().int().min(0), end: z.number().int().min(0) })
  .refine((s) => s.end > s.start, { message: "end must be greater than start" });

export const EvidenceProvenanceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("extracted"), quote: z.string().min(1), span: QuoteSpanSchema }),
  z.object({ kind: z.literal("occupation-inferred"), fromRoleSoc: z.string().min(1), sourceRequirementId: z.string().min(1) }),
  z.object({ kind: z.literal("self-reported") }),
]);

export const RedactionCategorySchema = z.enum(["email", "phone", "url", "handle", "address"]);

/** Counts only — never the removed content (I07). Redaction is minimization, not anonymization. */
export const RedactionResultSchema = z.object({
  text: z.string(),
  removed: z.array(z.object({ category: RedactionCategorySchema, count: z.number().int().min(1) })),
});

/** Outcome of locating model-proposed quotes; unlocatable items are dropped and only counted. */
export const QuoteVerificationSchema = z.object({
  located: z.array(z.object({ index: z.number().int().min(0), span: QuoteSpanSchema })),
  droppedCount: z.number().int().min(0),
});

export type QuoteSpan = z.infer<typeof QuoteSpanSchema>;
export type EvidenceProvenance = z.infer<typeof EvidenceProvenanceSchema>;
export type RedactionCategory = z.infer<typeof RedactionCategorySchema>;
export type RedactionResult = z.infer<typeof RedactionResultSchema>;
export type QuoteVerification = z.infer<typeof QuoteVerificationSchema>;
