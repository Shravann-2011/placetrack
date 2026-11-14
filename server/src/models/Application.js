const mongoose = require('mongoose');
const { STAGES, SOURCES, JOB_TYPES } = require('../constants');

const applicationSchema = new mongoose.Schema(
  {
    // Owner: every query filters by this, so users only ever see their own data
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    company: { type: String, required: true, trim: true, maxlength: 100 },
    role: { type: String, required: true, trim: true, maxlength: 100 },
    type: { type: String, enum: JOB_TYPES, default: 'Full-time' },
    stage: { type: String, enum: STAGES, default: 'Applied' },
    source: { type: String, enum: SOURCES, default: 'Campus' },

    location: { type: String, trim: true, maxlength: 100 },
    ctc: { type: Number, min: 0 }, // package in LPA (or monthly stipend for internships)
    jobLink: { type: String, trim: true },
    appliedDate: { type: Date, default: Date.now },
    dueDate: { type: Date, default: null }, // next deadline: OA date, interview, etc.
    notes: { type: String, maxlength: 2000 },
    // Last time the student chased the company (resets the "no update in 14 days" nudge)
    followedUpAt: { type: Date, default: null },

    // Offer details, filled in once the student has an offer (used for side-by-side comparison)
    offer: {
      fixedLpa: { type: Number, min: 0 },        // fixed pay, ₹ lakh per year
      variableLpa: { type: Number, min: 0 },     // variable / performance pay, ₹ lakh per year
      joiningBonus: { type: Number, min: 0 },    // one-time, ₹
      bondMonths: { type: Number, min: 0 },      // service agreement length
      bondPenalty: { type: Number, min: 0 },     // amount payable if leaving early, ₹
      location: { type: String, trim: true, maxlength: 100 },
      joiningDate: { type: Date },
      acceptBy: { type: Date },                  // deadline to accept the offer
      notes: { type: String, maxlength: 1000 },
    },

    // Every stage change is recorded; the dashboard funnel uses this later
    stageHistory: [
      {
        _id: false,
        stage: { type: String, enum: STAGES, required: true },
        changedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Speeds up the most common queries (per-user lists filtered by stage / due date)
applicationSchema.index({ user: 1, stage: 1 });
applicationSchema.index({ user: 1, dueDate: 1 });
applicationSchema.index({ user: 1, appliedDate: -1 });

// Record the stage when an application is created or its stage changes
applicationSchema.pre('save', function () {
  if (this.isNew || this.isModified('stage')) {
    this.stageHistory.push({ stage: this.stage, changedAt: new Date() });
  }
});

applicationSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Application', applicationSchema);
