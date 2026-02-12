const User = require('../../models/User');
const Post = require('../../models/Post');
const Comment = require('../../models/Comment');

const index = async (req, res) => {
    const tab = req.query.tab || 'all';
    const currentUser = await User.findById(req.session.user._id).select('favoritePosts');
    const favoriteIds = (currentUser.favoritePosts || []).map(id => id.toString());
    let posts;
    if (tab === 'favorites') {
        posts = await Post.find({_id: {$in: currentUser.favoritePosts || []}})
            .populate('author', 'username')
            .populate('reactions.userId', 'username')
            .sort({createdAt: -1});
    } else if (tab === 'my-posts') {
        posts = await Post.find({author: req.session.user._id})
            .populate('author', 'username')
            .populate('reactions.userId', 'username')
            .sort({createdAt: -1});
    } else {
        posts = await Post.find({})
            .populate('author', 'username')
            .populate('reactions.userId', 'username')
            .sort({createdAt: -1});
    }
    const postIds = posts.map(p => p._id);
    const comments = await Comment.find({post: {$in: postIds}})
        .populate('author', 'username')
        .populate('reactions.userId', 'username')
        .sort({createdAt: 1});
    const commentsByPost = {};
    postIds.forEach(id => { commentsByPost[id.toString()] = []; });
    comments.forEach(c => {
        const pid = (c.post && c.post._id) ? c.post._id.toString() : c.post.toString();
        if (commentsByPost[pid]) commentsByPost[pid].push(c);
    });
    const buildCommentTree = (flatList) => {
        const top = (flatList || []).filter(c => !c.parent);
        const withReplies = top.map(t => {
            const obj = t.toObject ? t.toObject() : { ...t };
            obj.replies = (flatList || []).filter(c => c.parent && String(c.parent) === String(t._id));
            return obj;
        });
        return withReplies;
    };
    const postsWithComments = posts.map(p => ({
        ...p.toObject(),
        comments: commentsByPost[p._id.toString()] || [],
        commentsTopLevel: buildCommentTree(commentsByPost[p._id.toString()] || [])
    }));
    res.render('admin/social/index', {
        posts: postsWithComments,
        favoriteIds,
        tab,
        title: 'Social',
        user: req.session.user
    });
};

const create = async (req, res) => {
    res.render('admin/social/create', {
        title: 'New Post',
        user: req.session.user
    });
};

const store = async (req, res) => {
    const description = req.body.description || '';
    const images = (req.files && req.files.images)
        ? req.files.images.map(f => '/uploads/posts/' + f.filename)
        : [];
    await Post.create({
        text: description,
        description,
        author: req.session.user._id,
        images
    });
    res.redirect('/admin/social');
};

const toggleFavorite = async (req, res) => {
    try {
        const postId = req.params.id;
        const user = await User.findById(req.session.user._id);
        const idx = (user.favoritePosts || []).map(id => id.toString()).indexOf(postId);
        if (idx >= 0) {
            user.favoritePosts.splice(idx, 1);
        } else {
            user.favoritePosts = user.favoritePosts || [];
            user.favoritePosts.push(postId);
        }
        await user.save();
        res.status(200).json({favorite: idx < 0});
    } catch (e) {
        res.status(500).json({msg: 'Something went wrong'});
    }
};

const addReaction = async (req, res) => {
    try {
        const postId = req.params.id;
        const {type} = req.body;
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({msg: 'Post not found'});
        const existing = post.reactions.find(
            r => String(r.userId) === String(req.session.user._id)
        );
        if (existing) {
            existing.type = type;
        } else {
            post.reactions.push({userId: req.session.user._id, type: type || 'like'});
        }
        await post.save();
        const updated = await Post.findById(postId)
            .populate('reactions.userId', 'username');
        res.status(200).json({reactions: updated.reactions});
    } catch (e) {
        res.status(500).json({msg: 'Something went wrong'});
    }
};

const addComment = async (req, res) => {
    try {
        const postId = req.params.id;
        const {text, parent} = req.body;
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({msg: 'Post not found'});
        const comment = await Comment.create({
            post: postId,
            author: req.session.user._id,
            text,
            parent: parent || null
        });
        const populated = await Comment.findById(comment._id).populate('author', 'username');
        const commentData = {
            _id: populated._id,
            parent: populated.parent,
            author: populated.author,
            text: populated.text,
            createdAt: populated.createdAt,
            reactions: populated.reactions || []
        };
        res.status(200).json({comment: commentData});
    } catch (e) {
        res.status(500).json({msg: 'Something went wrong'});
    }
};

const destroyPost = async (req, res) => {
    try {
        const id = req.params.id;
        const post = await Post.findById(id).populate('author', 'username');
        if (!post) return res.status(404).json({msg: 'Post not found'});
        if (!post.canDelete(req.session.user)) {
            return res.status(401).json({msg: 'Not allowed'});
        }
        await Comment.deleteMany({post: id});
        await Post.findByIdAndDelete(id);
        res.status(200).json({msg: 'Post deleted'});
    } catch (e) {
        res.status(500).json({msg: 'Something went wrong'});
    }
};

const destroyComment = async (req, res) => {
    try {
        const id = req.params.id;
        const comment = await Comment.findById(id).populate('author', 'username');
        if (!comment) return res.status(404).json({msg: 'Comment not found'});
        const postId = comment.post._id || comment.post;
        const post = await Post.findById(postId).populate('author', 'username');
        const postAuthorId = post && post.author ? post.author._id : null;
        if (!comment.canDelete(req.session.user, postAuthorId)) {
            return res.status(401).json({msg: 'Not allowed'});
        }
        await Comment.deleteMany({$or: [{_id: id}, {parent: id}]});
        res.status(200).json({msg: 'Comment deleted'});
    } catch (e) {
        res.status(500).json({msg: 'Something went wrong'});
    }
};

const addCommentReaction = async (req, res) => {
    try {
        const commentId = req.params.id;
        const {type} = req.body;
        const comment = await Comment.findById(commentId);
        if (!comment) return res.status(404).json({msg: 'Comment not found'});
        const existing = (comment.reactions || []).find(
            r => String(r.userId) === String(req.session.user._id)
        );
        if (existing) {
            existing.type = type;
        } else {
            comment.reactions = comment.reactions || [];
            comment.reactions.push({userId: req.session.user._id, type: type || 'like'});
        }
        await comment.save();
        const updated = await Comment.findById(commentId).populate('reactions.userId', 'username');
        res.status(200).json({reactions: updated.reactions || []});
    } catch (e) {
        res.status(500).json({msg: 'Something went wrong'});
    }
};

module.exports = {
    index,
    create,
    store,
    toggleFavorite,
    addReaction,
    addComment,
    destroyPost,
    destroyComment,
    addCommentReaction
};
