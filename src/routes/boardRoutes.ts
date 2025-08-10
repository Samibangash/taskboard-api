import { Router, Request, Response } from 'express';
import { Board } from '../models/Board';
import { Task, TaskStatus } from '../models/Task';
import redis from '../config/redisClient';
import { buildTaskCacheKey, deleteBoardTaskCaches } from '../utils/cache';
import { getIO } from '../socket/io';

const router = Router();

// 1) Create a new board with a title and a list of member userIds.
// POST /api/boards
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, members = [] } = req.body;
    if (!title) return res.status(400).json({ message: 'title is required' });

    const board = await Board.create({ title, members });
    res.status(201).json(board);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create board', error: err.message });
  }
});

// 2) Create a new task inside a board.
// POST /api/boards/:boardId/tasks
router.post('/:boardId/tasks', async (req: Request, res: Response) => {
  const { boardId } = req.params;
  try {
    const { title, description = '', status = 'todo' } = req.body;
    if (!title) return res.status(400).json({ message: 'title is required' });

    // Ensure board exists
    const board = await Board.findById(boardId);
    if (!board) return res.status(404).json({ message: 'Board not found' });

    const task = await Task.create({
      boardId,
      title,
      description,
      status: (status as TaskStatus) || 'todo'
    });

    // Invalidate task caches for that board
    await deleteBoardTaskCaches(boardId);

    // Emit real-time event to board room
    try {
      const io = getIO();
      io.to(`board:${boardId}`).emit('taskCreated', task);
    } catch {
      // io might not be initialized in tests/dev; ignore
    }

    res.status(201).json(task);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create task', error: err.message });
  }
});

// 3) Fetch tasks of a board with filtering/search/sort/pagination, with Redis caching
// GET /api/boards/:boardId/tasks?status=todo|in-progress|done&search=keyword&sort=asc|desc&page=1&limit=10
router.get('/:boardId/tasks', async (req: Request, res: Response) => {
  const { boardId } = req.params;
  try {
    // Check board exists
    const board = await Board.findById(boardId).select('_id');
    if (!board) return res.status(404).json({ message: 'Board not found' });

    const key = buildTaskCacheKey(boardId, req.query);

    // 1) Try cache
    const cached = await redis.get(key);
    if (cached) {
      return res.json({ fromCache: true, ...JSON.parse(cached) });
    }

    // 2) Build Mongo query
    const { status, search, sort = 'desc' } = req.query as {
      status?: TaskStatus;
      search?: string;
      sort?: string;
    };
    const page = parseInt((req.query.page as string) || '1', 10) || 1;
    const limit = Math.min(parseInt((req.query.limit as string) || '10', 10) || 10, 100);
    const skip = (page - 1) * limit;

    const q: any = { boardId };
    if (status && ['todo', 'in-progress', 'done'].includes(status)) {
      q.status = status;
    }

    let baseQuery = Task.find(q);
    if (search && search.trim().length > 0) {
      // Case-insensitive search on title or description
      const regex = new RegExp(search, 'i');
      baseQuery = baseQuery.find({ $or: [{ title: regex }, { description: regex }] });
    }

    const sortOrder = (sort === 'asc' ? 1 : -1) as 1 | -1;
    baseQuery = baseQuery.sort({ createdAt: sortOrder }).skip(skip).limit(limit);

    const [items, total] = await Promise.all([
      baseQuery.lean().exec(),
      Task.countDocuments(q).exec()
    ]);

    const result = {
      fromCache: false,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      },
      items
    };

    // 3) Save to Redis with 60s TTL
    await redis.set(key, JSON.stringify(result), 'EX', 60);

    res.json(result);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch tasks', error: err.message });
  }
});

export default router;
