import IORedis from 'ioredis'

/** BullMQ recommends a dedicated connection per Queue/Worker/QueueEvents instance rather than
 *  sharing one — a Worker's blocking commands would otherwise stall Queue.add()/QueueEvents on
 *  the same connection. `maxRetriesPerRequest: null` is required by BullMQ for both Worker and
 *  blocking-command connections. */
export function createRedisConnection(): IORedis {
  return new IORedis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
  })
}
