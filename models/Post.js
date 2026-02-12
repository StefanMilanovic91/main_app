const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReactionSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        require: true
    },
    type: {
        type: String,
        enum: ['like', 'love', 'laugh', 'wow', 'sad', 'angry'],
        default: 'like'
    }
}, {_id: false});

const PostSchema = new Schema({
    text: {
        type: String,
        require: true
    },
    description: {
        type: String,
        default: ""
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        require: true
    },
    images: [{
        type: String,
        default: []
    }],
    reactions: [ReactionSchema]
}, {timestamps: true});

PostSchema.methods.isAuthor = function(userId) {
    return String(userId) === String(this.author._id || this.author);
};

PostSchema.methods.canDelete = function(user) {
    return this.isAuthor(user._id);
};

const Post = mongoose.model('Post', PostSchema);

module.exports = Post;
