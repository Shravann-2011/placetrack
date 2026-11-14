const { z } = require('zod');
const { EVENT_TYPES, EVENT_MODES } = require('../constants');

const dateTime = z
  .union([z.iso.datetime({ offset: true }), z.iso.date()], { error: 'Use a date like 2026-11-20 or a full date-time' })
  .transform((s) => new Date(s));
const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

const base = {
  application: objectId,
  type: z.enum(EVENT_TYPES),
  title: z.string().trim().max(120).optional(),
  start: dateTime,
  end: dateTime.optional(),
  allDay: z.boolean().optional(),
  mode: z.enum(EVENT_MODES).optional(),
  location: z.string().trim().max(300).optional(),
  notes: z.string().max(2000).optional(),
  done: z.boolean().optional(),
  checklist: z.array(z.object({
    text: z.string().trim().min(1, 'Checklist item cannot be empty').max(200),
    done: z.boolean().optional(),
  })).max(30, 'At most 30 checklist items').optional(),
  debrief: z.string().max(4000).optional(),
};

const endAfterStart = (d) => !d.start || !d.end || d.end >= d.start;

const createEventSchema = z.object(base).refine(endAfterStart, { error: 'End must be after start', path: ['end'] });

const updateEventSchema = z
  .object(base)
  .partial()
  .omit({ application: true }) // an event stays with its application
  .refine((d) => Object.keys(d).length > 0, { error: 'Send at least one field to update' })
  .refine(endAfterStart, { error: 'End must be after start', path: ['end'] });

// A range is required so the calendar never loads a whole year by accident
const listEventsSchema = z
  .object({
    from: dateTime,
    to: dateTime,
    application: objectId.optional(),
  })
  .refine((q) => q.to > q.from, { error: '"to" must be after "from"', path: ['to'] })
  .refine((q) => q.to - q.from <= 100 * 864e5, { error: 'Range can be at most 100 days', path: ['to'] });

module.exports = { createEventSchema, updateEventSchema, listEventsSchema };
