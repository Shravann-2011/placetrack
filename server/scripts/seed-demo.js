// Creates (or resets) a demo account with realistic sample applications.
// Run from server/:  npm run seed:demo
// Demo login: demo@placetrack.test / demo12345   (test data only, never a real account)
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Application = require('../src/models/Application');
const Event = require('../src/models/Event');

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
  ['Accolite', 'Associate Software Engineer', 'Offer', 'Campus', 'Full-time', 9, -28, null, 'Hyderabad'],
  ['Mindtree', 'Graduate Engineer Trainee', 'Applied', 'Job Portal', 'Full-time', 4.5, -26, null, 'Bengaluru'],   // gone quiet
  ['Hexaware', 'Software Engineer', 'Aptitude/OA', 'Company Website', 'Full-time', 4, -24, null, 'Chennai'],      // gone quiet
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
    await Event.deleteMany({ user: old._id });
    await Application.deleteMany({ user: old._id });
    await old.deleteOne();
  }
  const user = await User.create(DEMO);
  const docs = SAMPLE.map(([company, role, stage, source, type, ctc, applied, due, location]) => ({
    user: user._id, company, role, stage, source, type, ctc, location,
    appliedDate: day(applied), dueDate: due === null ? null : day(due),
    stageHistory: historyFor(stage, applied),
  }));
  // Offer details for the two offers, so the comparison page has something to compare
  const OFFERS = {
    Wipro: { fixedLpa: 3.5, variableLpa: 0, joiningBonus: 0, bondMonths: 12, bondPenalty: 75000, location: 'Pune', joiningDate: day(240), acceptBy: day(5), notes: 'Elite NTH track. Training in Mysuru.' },
    Accolite: { fixedLpa: 8, variableLpa: 1, joiningBonus: 50000, bondMonths: 0, location: 'Hyderabad', joiningDate: day(230), acceptBy: day(12), notes: 'Product engineering team, Java + React.' },
  };
  docs.forEach((d) => { if (OFFERS[d.company]) d.offer = OFFERS[d.company]; });
  const apps = await Application.insertMany(docs); // insertMany skips the save hook, so our history is kept
  const byCompany = Object.fromEntries(apps.map((a) => [a.company, a._id]));

  // Calendar events, relative to today (IST times written as UTC offsets)
  const at = (dayOffset, h, m = 0) => { const d = new Date(); d.setUTCHours(h - 5, m - 30, 0, 0); return new Date(+d + dayOffset * 864e5); };
  const EVENTS = [
    ['Cognizant', 'Technical interview', 0, 14, 15, 'Online', 'Teams link in email'],
    ['TCS', 'Online assessment', 1, 10, 12, 'Online', 'TCS iON, slot B'],
    ['Infosys', 'Technical interview', 2, 11, 12, 'On campus', 'Placement cell, Room 204'],
    ['Deloitte', 'Online assessment', 3, 10, 11.5, 'Online', 'HirePro link'],
    ['Zoho', 'Group discussion', 4, 14, 15, 'On campus', 'Seminar Hall 2'],
    ['Zoho', 'Technical interview', 4, 14.5, 15.5, 'On campus', 'Interview Room 3'], // clashes with the GD on purpose
    ['Razorpay', 'HR interview', 6, 16, 16.5, 'Online', 'Google Meet'],
    ['Swiggy', 'Registration deadline', 9, 23.98, null, 'Online', 'Careers portal'],
    ['Freshworks', 'Pre-placement talk', 11, 15, 16, 'On campus', 'Main Auditorium'],
    ['Freshworks', 'Online assessment', 13, 10, 11, 'Online', 'HackerRank'],
    ['PhonePe', 'Registration deadline', 20, 17, null, 'Online', 'Referral form'],
    ['Wipro', 'Offer deadline', 5, 18, null, 'Online', 'Accept on the offer portal'],
  ];
  const events = EVENTS.map(([company, type, day, h, endH, mode, location]) => {
    const start = at(day, Math.floor(h), Math.round((h % 1) * 60));
    const end = endH === null ? start : at(day, Math.floor(endH), Math.round((endH % 1) * 60));
    return { user: user._id, application: byCompany[company], type, start, end, mode, location };
  });
  const prep = {
    'TCS|Online assessment': [['Test laptop, webcam and internet', true], ['Practise 2 timed aptitude sets', true], ['Revise arrays, strings and DP', false], ['Keep ID and admit card ready', false]],
    'Zoho|Technical interview': [['Revise DBMS, OS and CN basics', true], ['Re-read my resume projects', false], ['Solve 3 medium DSA problems', false]],
    'Razorpay|HR interview': [['Prepare "Tell me about yourself"', true], ['Research the company and its products', true]],
  };
  events.forEach((e) => {
    const company = Object.keys(byCompany).find((c) => String(byCompany[c]) === String(e.application));
    const items = prep[`${company}|${e.type}`];
    if (items) e.checklist = items.map(([text, done]) => ({ text, done }));
  });
  await Event.insertMany(events);
  console.log(`Demo account ready: ${DEMO.email} / ${DEMO.password} (${docs.length} applications, ${events.length} events)`);
  await mongoose.disconnect();
})().catch((err) => { console.error(err); process.exit(1); });
