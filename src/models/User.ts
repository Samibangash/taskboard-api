import { Schema, model, Types, HydratedDocument } from "mongoose";

export interface IUser {
  username: string;
  email: string;
  password: string;
  boards: Types.ObjectId[];
  tasks: Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    boards: [{ type: Schema.Types.ObjectId, ref: "Board", default: [] }],
    tasks: [{ type: Schema.Types.ObjectId, ref: "Task", default: [] }],
  },
  { timestamps: true }
);

export type UserDoc = HydratedDocument<IUser>;
export const User = model<IUser>("User", UserSchema);
