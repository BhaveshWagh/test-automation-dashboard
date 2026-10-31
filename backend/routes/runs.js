const express = require('express');
const router = express.Router();
const runController = require('../controllers/runController');

router.post('/', runController.create);
router.get('/', runController.list);
router.get('/:id', runController.getOne);

module.exports = router;
