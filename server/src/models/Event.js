const mongoose = require('mongoose');
const { EVENT_TYPES, EVENT_MODES } = require('../constants');

// One dated step of an application: a registration deadline, an OA, an interview round...
const eventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
    type: { type: String, enum: EVENT_TYPES, required: true },
    title: { type: String, trim: true, maxlength: 120 },
    start: { type: Date, required: true },
    end: { type: Date, required: true }, // deadlines use end = start
    allDay: { type: Boolean, default: false },
    mode: { type: String, enum: EVENT_MODES, default: 'Online' },
    location: { type: String, trim: true, maxlength: 300 }, // venue or meeting link
    notes: { type: String, maxlength: 2000 },
    done: { type: Boolean, default: false },
    // Prep checklist for this round ("Revise DBMS joins", "Carry 3 resume copies")
    checklist: {
      type: [{ text: { type: String, required: true, trim: true, maxlength: 200 }, done: { type: Boolean, default: false } }],
      validate: [(v) => v.length <= 30, 'At most 30 checklist items'],
      default: [],
    },
    // Written after the round: what was asked, how it went
    debrief: { type: String, maxlength: 4000 },
    // When the reminder email went out (null = not yet). Reset if the date changes.
    remindedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Calendar queries: one user's events in a date range, in time order
eventSchema.index({ user: 1, start: 1 });
eventSchema.index({ application: 1, start: 1 });
// Reminder job: upcoming events that haven't been reminded yet
eventSchema.index({ remindedAt: 1, start: 1 });

eventSchema.set('toJSON', { transform: (doc, ret) => { delete ret.__v; return ret; } });

module.exports = mongoose.model('Event', eventSchema);
