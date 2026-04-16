const express = require('express');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

app.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const incident = body.incident || {};

    const summary = incident.summary || 'GCPアラートが発生しました';
    const state = incident.state || 'unknown';
    const resourceName = incident.resource_name || 'unknown';
    const url = incident.url || '';

    const message = {
      content:
        `🚨 GCPアラート検知\n` +
        `- 状態: ${state}\n` +
        `- 概要: ${summary}\n` +
        `- リソース: ${resourceName}\n` +
        `${url ? `- 詳細: ${url}` : ''}`
    };

    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Discord webhook failed: ${response.status} ${text}`);
    }

    res.status(200).send('ok');
  } catch (error) {
    console.error(error);
    res.status(500).send('error');
  }
});

app.get('/health', (req, res) => {
  res.status(200).send('ok');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});