// Creates (or resets) a demo account with realistic sample applications.
// Run from server/:  npm run seed:demo
// Demo login: demo@placetrack.test / demo12345   (test data only, never a real account)
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Application = require('../src/models/Application');

const DEMO = { name: 'Demo Student', email: 'demo@placetrack.test', password: 'demo12345' };
const day = (n) => new Date(Date.now() + n * 864e5);

const SAMPLE = [
  ['Infosys', 'Systems Engineer', 'Technical', 'Campus', 'Full-time', 3.6, -20, 2, 'Bengaluru'],
  ['TCS', 'Digital Engineer', 'Aptitude/OA', 'Campus', 'Full-time', 7, -12, 1, 'Chennai'],
  ['Zoho', 'Member Technical Staff', 'GD', 'Referral', 'Full-time', 8.4, -9, 4, 'Chennai'],
  ['Accenture', 'Associate Software Engineer', 'Rejected', 'Job Portal', 'Full-time', 4.5, -30, null, 'Hyderabad'],
  ['Razorpay', 'SDE Intern', 'HR', 'LinkedIn', 'Internship', 60, -15, 6, 'Bengaluru'],
  ['Wipro', 'Project Engineer', 'Offer', 'Campus', 'Full-time', 3.5, -40, null, 'Pune'],
  ['Freshworks', 'Software Engineer', 'Applied', 'Company Website', 'Full-time', 12, -3, 11, 'Chennai'],
  ['Deloitte', 'Analyst', 'Aptitude/OA', 'Campus', 'Full-time', 7.6, -6, 3, 'Mumbai'],
  ['Swiggy', 'Backend Intern', 'Applied', 'LinkedIn', 'Internship', 40, -2, 9, 'Remote'],
  ['Cognizant', 'Programmer Analyst', 'Technical', 'Campus', 'Full-time', 4, -18, 0, 'Kolkata'],
  ['PhonePe', 'SDE 1', 'Applied', 'Referral', 'Full-time', 18, -1, 20, 'Bengaluru'],
  ['Capgemini', 'Analyst', 'Rejected', 'Campus', 'Full-time', 4.25, -25, null, 'Mumbai'],
];

// Realistic stage history: every stage up to the current one
const ORDER = ['Applied', 'Aptitude/OA', 'GD', 'Technical', 'HR', 'Offer'];
function historyFor(stage, appliedDaysAgo) {
  const upTo = stage === 'Rejected' ? 2 : ORDER.indexOf(stage) + 1;
  const steps = ORDER.slice(0, upTo).map((s, i) => ({ stage: s, changedAt: day(appliedDaysAgo + i * 3) }));
  if (stage === 'Rejected') steps.push({ stage: 'Rejected', changedAt: day(appliedDaysAgo + 8) });
  return steps;
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const old = await User.findOne({ email: DEMO.email });
  if (old) {
    await Application.deleteMany({ user: old._id });
    await old.deleteOne();
  }
  const user = await User.create(DEMO);
  const docs = SAMPLE.map(([company, role, stage, source, type, ctc, applied, due, location]) => ({
    user: user._id, company, role, stage, source, type, ctc, location,
    appliedDate: day(applied), dueDate: due === null ? null : day(due),
    stageHistory: historyFor(stage, applied),
  }));
  await Application.insertMany(docs); // insertMany skips the save hook, so our history is kept
  console.log(`Demo account ready: ${DEMO.email} / ${DEMO.password} (${docs.length} applications)`);
  await mongoose.disconnect();
})().catch((err) => { console.error(err); process.exit(1); });
