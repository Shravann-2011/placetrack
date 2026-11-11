const express = require('express');
const protect = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createApplicationSchema,
  updateApplicationSchema,
  stageSchema,
  listQuerySchema,
} = require('../validators/application.schema');
const ctrl = require('../controllers/application.controller');
const { getStats } = require('../controllers/stats.controller');

const router = express.Router();

router.use(protect); // every route below requires a logged-in user

// Must come before '/:id', otherwise Express would treat "stats" as an id
router.get('/stats', getStats);

router
  .route('/')
  .get(validate(listQuerySchema, 'query'), ctrl.listApplications)
  .post(validate(createApplicationSchema), ctrl.createApplication);

router
  .route('/:id')
  .get(ctrl.getApplication)
  .patch(validate(updateApplicationSchema), ctrl.updateApplication)
  .delete(ctrl.deleteApplication);

router.patch('/:id/stage', validate(stageSchema), ctrl.updateStage);

module.exports = router;
