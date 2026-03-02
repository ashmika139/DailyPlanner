const mongoose = require('mongoose');

const scheduleBlockSchema = new mongoose.Schema({
    time: { type: String },
    task: { type: String, default: '' }
}, { _id: false });

const plannerSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    schedule: { type: [scheduleBlockSchema], default: [] },
    priorities: { type: [String], default: [] },
    todos: [
        {
            text: { type: String },
            done: { type: Boolean, default: false }
        }
    ],
    note: { type: String, default: '' },
    tomorrow: { type: String, default: '' },
    shared: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Planner', plannerSchema);
