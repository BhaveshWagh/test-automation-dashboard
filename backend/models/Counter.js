const mongoose = require('mongoose');

// Atomic named counters (used for human-readable test case IDs such as TC-0042).
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

// Reserves `count` consecutive numbers in ONE atomic update and returns the first.
// Concurrent callers each get a distinct block, so IDs never collide.
CounterSchema.statics.reserve = async function reserve(name, count = 1) {
  const doc = await this.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: count } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return doc.seq - count + 1;
};

module.exports = mongoose.model('Counter', CounterSchema);
