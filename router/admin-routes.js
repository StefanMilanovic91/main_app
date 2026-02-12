const TaskController = require('../controllers/admin/TaskController.js');
const PostController = require('../controllers/admin/PostController.js');
const uploadPostMedia = require('../middlewares/uploadPostMedia');
const express = require('express');
const router = express.Router();

router.get('/dashboard', require('../controllers/admin/DashboardController.js'))
router.get('/task', TaskController.index)
router.get('/task/create',TaskController.create)
router.post('/task', TaskController.store)
router.delete('/task/:id', TaskController.destroy)

router.get('/social', PostController.index)
router.get('/social/create', PostController.create)
router.post('/social', uploadPostMedia.fields([{ name: 'images', maxCount: 10 }]), PostController.store)
router.delete('/social/:id', PostController.destroyPost)
router.post('/social/:id/favorite', PostController.toggleFavorite)
router.post('/social/:id/reaction', PostController.addReaction)
router.post('/social/:id/comment', PostController.addComment)
router.delete('/social/comment/:id', PostController.destroyComment)
router.post('/social/comment/:id/reaction', PostController.addCommentReaction)

module.exports = router;