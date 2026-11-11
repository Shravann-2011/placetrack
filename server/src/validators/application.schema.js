const { z } = require('zod');
const { STAGES, SOURCES, JOB_TYPES } = require('../constants');

// Accepts "2026-11-20" (from an <input type="date">) or a full ISO timestamp
const dateField = z
  .union([z.iso.datetime({ offset: true }), z.iso.date()], { error: 'Use a date like 2026-11-20' })
  .transform((s) => new Date(s));

// No .default() values here on purpose: defaults come from the Mongoose model.
// (A default in Zod would silently reset fields on every PATCH.)
// Unknown keys like "user" or "_id" are stripped, so nobody can reassign ownership.
const createApplicationSchema = z.object({
  company: z.string().trim().min(1, 'Company is required').max(100),
  role: z.string().trim().min(1, 'Role is required').max(100),
  type: z.enum(JOB_TYPES).optional(),
  stage: z.enum(STAGES).optional(),
  source: z.enum(SOURCES).optional(),
  location: z.string().trim().max(100).optional(),
  ctc: z.number().min(0, 'CTC cannot be negative').max(1000).nullable().optional(), // null clears it
  jobLink: z.union([z.url({ protocol: /^https?$/, error: 'Enter a valid http(s) URL' }), z.literal('')], { error: 'Enter a valid http(s) URL' }).optional(), // '' clears it; only http/https (blocks javascript: links)
  appliedDate: dateField.optional(),
  dueDate: dateField.nullable().optional(), // null clears the deadline
  notes: z.string().max(2000).optional(),
});

const updateApplicationSchema = createApplicationSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { error: 'Send at least one field to update' });

// Used by the Kanban board when a card is dragged to another column
const stageSchema = z.object({ stage: z.enum(STAGES) });

const SORTS = ['-appliedDate', 'appliedDate', '-updatedAt', 'company', '-company', 'dueDate', '-ctc'];

// Query strings are always text, so z.coerce turns "2" into the number 2
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).optional(),
  stage: z.enum(STAGES).optional(),
  source: z.enum(SOURCES).optional(),
  type: z.enum(JOB_TYPES).optional(),
  dueWithinDays: z.coerce.number().int().min(1).max(60).optional(), // "Due Soon" view
  sort: z.enum(SORTS).default('-appliedDate'),
});

module.exports = {
  createApplicationSchema,
  updateApplicationSchema,
  stageSchema,
  listQuerySchema,
};
