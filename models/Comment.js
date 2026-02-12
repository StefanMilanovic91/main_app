const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReactionSchema = new Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', require: true },
    type: { type: String, enum: ['like', 'love', 'laugh', 'wow', 'sad', 'angry'], default: 'like' }
}, {_id: false});

const CommentSchema = new Schema({
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        require: true
    },
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
        default: null
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        require: true
    },
    text: {
        type: String,
        require: true
    },
    reactions: [ReactionSchema]
}, {timestamps: true});

CommentSchema.methods.isAuthor = function(userId) {
    return String(userId) === String(this.author._id || this.author);
};

CommentSchema.methods.canDelete = function(user, postAuthorId) {
    const uid = user._id.toString();
    const postAuthor = postAuthorId ? (postAuthorId._id ? postAuthorId._id.toString() : postAuthorId.toString()) : null;
    return !!(postAuthor && uid === postAuthor);
};

const Comment = mongoose.model('Comment', CommentSchema);

module.exports = Comment;
