import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import meRouter from './routes/me';
import shipmentsRouter from './routes/shipments';
import expensesRouter from './routes/expenses';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/me', meRouter);
app.use('/api/shipments', shipmentsRouter);
app.use('/api/expenses', expensesRouter);

export default app;
