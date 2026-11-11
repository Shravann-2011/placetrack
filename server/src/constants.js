// Shared lists used by the database model AND the request validators,
// so they can never get out of sync.
const STAGES = ['Applied', 'Aptitude/OA', 'GD', 'Technical', 'HR', 'Offer', 'Rejected'];

const SOURCES = ['Campus', 'Referral', 'LinkedIn', 'Company Website', 'Job Portal', 'Other'];

const JOB_TYPES = ['Internship', 'Full-time', 'Internship + Full-time'];

module.exports = { STAGES, SOURCES, JOB_TYPES };
