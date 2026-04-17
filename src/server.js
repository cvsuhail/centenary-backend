const app = require('./app');
const initCrons = require('./common/cron');

const PORT = process.env.PORT || 3000;

// Initialize Cron Jobs
initCrons();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT} (accessible on local network)`);
});
