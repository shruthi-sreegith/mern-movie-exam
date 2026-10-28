const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/movieController');

router.post('/', ctrl.addMovie);
router.get('/', ctrl.getMovies);
router.get('/watch-next', ctrl.getWatchNext);
router.get('/stats', ctrl.getStats);
router.put('/:id', ctrl.editMovie);
router.patch('/:id/status', ctrl.updateStatus);
router.delete('/:id', ctrl.deleteMovie);

module.exports = router;