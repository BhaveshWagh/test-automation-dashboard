const express = require('express');
const router = express.Router();
const testCaseController = require('../controllers/testCaseController');

router.post('/', testCaseController.create);
router.post('/bulk', testCaseController.createBulk);
router.post('/validate-gherkin', testCaseController.validateGherkinEndpoint);
router.get('/', testCaseController.list);
router.get('/:id', testCaseController.getOne);
router.put('/:id', testCaseController.replace);
router.patch('/:id', testCaseController.patch);
router.delete('/:id', testCaseController.remove);

module.exports = router;
