import { Schema, model, Types, HydratedDocument } from "mongoose";

export type TaskStatus = "todo" | "in-progress" | "done";

export interface ITask {
  boardId: Types.ObjectId;
  title: string;
  description?: string;
  status: TaskStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    boardId: {
      type: Schema.Types.ObjectId,
      ref: "Board",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["todo", "in-progress", "done"],
      default: "todo",
      index: true,
    },
  },
  { timestamps: true }
);

// helpful text index for searching
TaskSchema.index({ title: "text", description: "text" });

export type TaskDoc = HydratedDocument<ITask>;
export const Task = model<ITask>("Task", TaskSchema);
