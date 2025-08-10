import redis from '../config/redisClient';

export function buildTaskCacheKey(boardId: string, query: Record<string, any>) {
  const status = (query.status || 'any').toString().toLowerCase();
  const search = (query.search || '').toString().toLowerCase();
  const sort   = (query.sort || 'desc').toString().toLowerCase(); // 'asc' | 'desc'
  const page   = parseInt(query.page || '1', 10) || 1;
  const limit  = parseInt(query.limit || '10', 10) || 10;

  return `board:${boardId}:tasks:status=${status}:search=${search}:sort=${sort}:page=${page}:limit=${limit}`;
}

export async function deleteBoardTaskCaches(boardId: string): Promise<void> {
  const pattern = `board:${boardId}:tasks:*`;
  let cursor = '0';
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    cursor = nextCursor;
  } while (cursor !== '0');
}
