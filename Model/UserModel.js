const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { Schema } = mongoose;

  const UserSchema = new Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
  },
  {
     timestamps: true,
   }
);

 
UserSchema.pre("save", async function (next) {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(this.password, salt);
    this.password = hashedPassword;
    next();
  } catch (err) {
    next(err);
  }
});


UserSchema.methods.isValidPassword = async function (passsword) {
  try {
    return await bcrypt.compare(passsword, this.password);
  } catch (err) {
    throw err;
  }
};

    
const UserModel = mongoose.model('userall', UserSchema); 
 
module.exports = UserModel;



