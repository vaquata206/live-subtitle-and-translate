import { connectionFromUrl, scheduleRepeatables, startWorkers } from './workers';

const connection = connectionFromUrl();
await scheduleRepeatables(connection);
const running = startWorkers(connection);
console.info(`worker started: ${running.workers.map((w) => w.name).join(', ')}`);

const shutdown = async () => {
  await running.close();
  process.exit(0);
};
process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
