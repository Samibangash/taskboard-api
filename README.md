# Collaborative Task Board API (TypeScript + Express + MongoDB + Redis + Socket.io)

A simple backend (no Docker) that demonstrates:

- REST API for Boards and Tasks
- Querying tasks with **filtering**, **search**, **sorting**, and **pagination**
- **Redis caching** for `GET /api/boards/:boardId/tasks` with a 60s TTL
- **Cache invalidation** when a new task is created
- **Socket.io** event broadcasting (`taskCreated`) to members connected to a board room

---

## 1) Requirements

- Node.js 18+ and npm or yarn
- A running **MongoDB** instance (e.g., `mongodb://127.0.0.1:27017`)
- A running **Redis** instance (e.g., `redis://127.0.0.1:6379`)

## 2) Setup

```bash
# 1. Clone the repository
git clone https://github.com/Samibangash/taskboard-api.git taskboard-api
cd taskboard-api
# 2. Install dependencies:
npm install

# 3. Create a .env file based on .env.example and adjust if needed
cp .env.example .env

# Example .env values:
# PORT=4000
# MONGO_URI=mongodb://127.0.0.1:27017/taskboard_api
# REDIS_URL=redis://127.0.0.1:6379
# CLIENT_ORIGIN=http://localhost:5173

# 4. (Optional) Seed sample data
npm run seed

# 5. Start in dev mode (with auto-reload)
npm run dev
```

The server starts on `http://localhost:4000` by default.

---

## 3) API Endpoints

Base path: `/api`

### Create Board

**POST** `/api/boards`

**Body (JSON)**

```json
{
  "title": "My Board",
  "members": ["<userId1>", "<userId2>"]
}
```

**Response 201**

```json
{
  "_id": "66b6...",
  "title": "My Board",
  "members": ["66b6...", "66b6..."],
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

### Create Task in a Board

**POST** `/api/boards/:boardId/tasks`

**Body (JSON)**

```json
{
  "title": "Design schema",
  "description": "User, Board, Task",
  "status": "todo"
}
```

**Response 201**

```json
{
  "_id": "66b6...",
  "boardId": "66b6...",
  "title": "Design schema",
  "description": "User, Board, Task",
  "status": "todo",
  "createdAt": "...",
  "updatedAt": "..."
}
```

- On success, this **invalidates** cached task lists for that board and emits a Socket.io event:  
  `taskCreated` (payload: the created task) to room `board:<boardId>`.

---

### Get Tasks (with cache)

**GET** `/api/boards/:boardId/tasks`

**Query Params**

- `status`: `todo | in-progress | done`
- `search`: keyword in title/description (case-insensitive)
- `sort`: `asc | desc` (default: `desc`, by `createdAt`)
- `page`: integer (default: `1`)
- `limit`: integer (default: `10`, max `100`)

**Response 200**

```json
{
  "fromCache": false,
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "totalPages": 1
  },
  "items": [
    /* tasks */
  ]
}
```

- When called again with the same board+query within 60 seconds, the response will include `"fromCache": true` and return the cached result from Redis.

---

## 4) Socket.io Usage

The server creates rooms in the format: `board:<boardId>`.

From the client (browser or Node), connect and **join a board** to receive updates:

```js
import { io } from "socket.io-client";
const socket = io("http://localhost:4000", { transports: ["websocket"] });

socket.emit("joinBoard", "<boardId>");

socket.on("taskCreated", (task) => {
  console.log("New task added:", task);
});
```

---

## 5) Testing with cURL

```bash
# Health
curl -s http://localhost:4000/health

# Create a board (replace members with real user IDs or leave empty [])
curl -s -X POST http://localhost:4000/api/boards     -H "Content-Type: application/json"     -d '{"title":"Demo Board","members":[]}'

# Create a task
curl -s -X POST http://localhost:4000/api/boards/<boardId>/tasks     -H "Content-Type: application/json"     -d '{"title":"First task","description":"Try things","status":"todo"}'

# Get tasks (first time: fromCache=false; second time within 60s: fromCache=true)
curl -s "http://localhost:4000/api/boards/<boardId>/tasks?status=todo&search=first&sort=desc&page=1&limit=5"
```

---

## 6) How Caching Works

- For each GET request to `/api/boards/:boardId/tasks`, a **cache key** is built from:
  - `boardId`, `status`, `search`, `sort`, `page`, `limit`
- The server checks Redis for that key:
  - If **exists**: returns the cached JSON and sets `"fromCache": true`.
  - If **not**: queries MongoDB, returns the data, and **stores** it in Redis with `EX 60` (60 seconds).
- When a new task is added (`POST /api/boards/:boardId/tasks`), the server **deletes** all keys matching `board:<boardId>:tasks:*` to invalidate stale caches.

---

## 7) Project Structure

```text
taskboard-api/
├── .env.example
├── package.json
├── tsconfig.json
├── README.md
└── src
    ├── app.ts
    ├── server.ts
    ├── seed.ts
    ├── config
    │   └── redisClient.ts
    ├── models
    │   ├── Board.ts
    │   ├── Task.ts
    │   └── User.ts
    ├── routes
    │   └── boardRoutes.ts
    ├── socket
    │   └── io.ts
    └── utils
        └── cache.ts
```

---

## 8) Notes

- **Authentication** is not implemented (out of scope for this test) add JWT later.
- The `seed` script creates two users, a board with both users as members, and three tasks.
- Text indexes are added on Task `title` and `description` for efficient search.
- Cache invalidation uses Redis `SCAN` to delete all task keys for a board safely.
