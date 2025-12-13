import dotenv from 'dotenv';
import app from './app';
import runMigrations from './db/migrate';

dotenv.config();

const port = process.env.PORT || 4000;

(async () => {
  try {
    console.log('Running migrations...');
    await runMigrations();
    app.listen(port, () => {
      console.log(`SLMS backend listening on port ${port}`);
    });
  } catch (err) {
    console.error('Failed to start application:', err);
    process.exit(1);
  }
})();
