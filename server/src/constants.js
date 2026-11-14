// Shared lists used by the database model AND the request validators,
// so they can never get out of sync.
const STAGES = ['Applied', 'Aptitude/OA', 'GD', 'Technical', 'HR', 'Offer', 'Rejected'];

const SOURCES = ['Campus', 'Referral', 'LinkedIn', 'Company Website', 'Job Portal', 'Other'];

const JOB_TYPES = ['Internship', 'Full-time', 'Internship + Full-time'];

// Calendar event types: the dated steps of a campus placement drive
const EVENT_TYPES = [
  'Registration deadline', 'Pre-placement talk', 'Online assessment', 'Group discussion',
  'Technical interview', 'HR interview', 'Offer deadline', 'Other',
];
const EVENT_MODES = ['Online', 'On campus', 'Off campus'];

module.exports = { STAGES, SOURCES, JOB_TYPES, EVENT_TYPES, EVENT_MODES };
