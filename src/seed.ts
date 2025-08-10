import dotenv from "dotenv";
import mongoose, { HydratedDocument } from "mongoose";
import { User, IUser } from "./models/User";
import { Board, IBoard } from "./models/Board";
import { Task, ITask } from "./models/Task";

dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/taskboard_api";

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("[mongo] connected");

  // wipe existing data
  await Promise.all([
    User.deleteMany({}),
    Board.deleteMany({}),
    Task.deleteMany({}),
  ]);

  // users
  const [u1, u2]: HydratedDocument<IUser>[] = await User.create([
    {
      username: "alice",
      email: "alice@example.com",
      password: "secret",
      boards: [],
      tasks: [],
    },
    {
      username: "bob",
      email: "bob@example.com",
      password: "secret",
      boards: [],
      tasks: [],
    },
  ]);

  // board
  const board: HydratedDocument<IBoard> = await Board.create({
    title: "Demo Board",
    members: [u1._id, u2._id],
  });

  // tasks
  const tasks: HydratedDocument<ITask>[] = await Task.create([
    {
      boardId: board._id,
      title: "Set up project",
      description: "Initialize repo and configs",
      status: "todo",
    },
    {
      boardId: board._id,
      title: "Design schema",
      description: "User/Board/Task models",
      status: "in-progress",
    },
    {
      boardId: board._id,
      title: "Write README",
      description: "Usage and API docs",
      status: "done",
    },
  ]);

  // log IDs — either option is fine:
  console.log("Seeded users:", [u1.id, u2.id]); // string virtual
  console.log("Seeded board:", board.id);
  console.log(
    "Seeded tasks:",
    tasks.map((t) => t.id)
  );
  // Or: console.log('Seeded users:', [u1._id.toString(), u2._id.toString()]);

  await mongoose.disconnect();
  console.log("Done.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
