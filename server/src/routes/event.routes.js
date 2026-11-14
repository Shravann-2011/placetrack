const express = require('express');
const protect = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createEventSchema, updateEventSchema, listEventsSchema } = require('../validators/event.schema');
const ctrl = require('../controllers/event.controller');

const router = express.Router();
router.use(protect);

router.route('/').get(validate(listEventsSchema, 'query'), ctrl.listEvents).post(validate(createEventSchema), ctrl.createEvent);
router.route('/:id').patch(validate(updateEventSchema), ctrl.updateEvent).delete(ctrl.deleteEvent);

module.exports = router;
