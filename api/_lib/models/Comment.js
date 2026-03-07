const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    plannerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Planner', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    commentText: { type: String, required: true, trim: true }
}, { timestamps: true });

module.exports = mongoose.models.Comment || mongoose.model('Comment', commentSchema);
