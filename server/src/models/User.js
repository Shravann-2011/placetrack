const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // select: false = never returned by queries unless asked for with .select('+password')
    password: { type: String, required: true, minlength: 8, select: false },
    // Bumped on logout to invalidate every refresh token issued before
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Hash the password before saving (only if it was changed)
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Hide private fields whenever a user is sent as JSON
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.tokenVersion;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
