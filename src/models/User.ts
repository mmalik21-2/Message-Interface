import mongoose, { Schema, Document, model, models } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  lastSeenAt?: Date; // <- NEW
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    firstName: { type: String, required: false },
    lastName: { type: String, required: false },
    phoneNumber: { type: String, required: false },
    lastSeenAt: { type: Date, default: Date.now }, // <- NEW
  },
  { timestamps: true }
);

const User = models.User || model<IUser>("User", UserSchema);
export default User;
