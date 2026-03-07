// Cached Mongoose connection for Vercel serverless (prevents connection pool exhaustion)
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

// Use a module-level cache (persists across warm invocations of the same function)
let cached = global._mongoCache;
if (!cached) {
    cached = global._mongoCache = { conn: null, promise: null };
}

async function connectDB() {
    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        cached.promise = mongoose.connect(MONGO_URI, {
            bufferCommands: false,
        }).then(m => m);
    }

    cached.conn = await cached.promise;
    return cached.conn;
}

module.exports = connectDB;
