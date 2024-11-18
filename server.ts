import express from 'express';
import PageKeeperService from './PageKeeperService';

const app = express();
app.use(express.json());

const pageKeeper = new PageKeeperService({
  username: process.env.HUNGER_STATION_USER!,
  password: process.env.HUNGER_STATION_PASSWORD!,
  url: process.env.HUNGER_STATION_URL!
});

// Start X system session
app.post('/api/x-system/start', async (req, res) => {
  try {
    const result = await pageKeeper.startSession();
    res.json(result);
  } catch (error: any) {
    console.log('Failed to start X system session:', error);
    res.status(500).json({
      success: false,
      message: `Failed to start session: ${error.message}`
    });
  }
});

// Stop X system session
app.post('/api/x-system/stop', async (req, res) => {
  try {
    const result = await pageKeeper.stopSession();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Failed to stop session: ${error.message}`
    });
  }
});

// Get session status
app.get('/api/x-system/status', async (req, res) => {
  try {
    const status = await pageKeeper.getSessionStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Failed to get status: ${error.message}`
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});