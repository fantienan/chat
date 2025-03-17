import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import cors from 'cors';
import { createServer } from './mcp.js';
import { getDefaultEnvironment } from '@modelcontextprotocol/sdk/client/stdio.js';

const app = express();
app.use(cors());

const { server, cleanup } = createServer();

let transport: SSEServerTransport;

app.get('/sse', async (req, res) => {
  console.log('Received connection');
  transport = new SSEServerTransport('/message', res);
  await server.connect(transport);

  server.onclose = async () => {
    await cleanup();
    await server.close();
    process.exit(0);
  };
});

app.post('/message', async (req, res) => {
  console.log('Received message');

  await transport.handlePostMessage(req, res);
});

app.get('/config', (req, res) => {
  try {
    res.json({
      getDefaultEnvironment,
      defaultCommand: 'tsx',
      defaultArgs: 'src/mcp.ts',
    });
  } catch (error) {
    console.error('Error in /config route:', error);
    res.status(500).json(error);
  }
});

const PORT = process.env.PORT || 3000;

try {
  const server = app.listen(PORT);

  server.on('listening', () => {
    const addr = server.address();
    const port = typeof addr === 'string' ? addr : addr?.port;
    console.log(`Proxy server listening on port ${port}`);
  });
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}
