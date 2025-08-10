import { Schema, model, Types, HydratedDocument } from "mongoose";

export interface IBoard {
  title: string;
  members: Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
}

const BoardSchema = new Schema<IBoard>(
  {
    title: { type: String, required: true, trim: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
  },
  { timestamps: true }
);

export type BoardDoc = HydratedDocument<IBoard>;
export const Board = model<IBoard>("Board", BoardSchema);
