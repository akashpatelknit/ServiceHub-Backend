import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { queues } from './queues.js';

// Mount path must match app.js's app.use(BULL_BOARD_BASE_PATH, ...) — Bull Board's
// static assets and API calls are generated relative to this base path.
export const BULL_BOARD_BASE_PATH = '/admin/queues';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath(BULL_BOARD_BASE_PATH);

createBullBoard({
  queues: Object.values(queues).map((queue) => new BullMQAdapter(queue)),
  serverAdapter,
});

export const bullBoardRouter = serverAdapter.getRouter();
