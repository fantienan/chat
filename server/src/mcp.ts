import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListToolsRequestSchema,
  Prompt,
  Tool,
  ToolSchema,
} from '@modelcontextprotocol/sdk/types.js';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { VERSION } from './common/version.js';

enum ToolName {
  SQLITE_QUERY = 'sqliteQuery',
  SQLITE_CREATE_TABLE = 'sqliteCreateTable',
  ADDITION = 'addition',
  POETRY = 'poetry',
}

enum PromptName {
  SIMPLE = 'simple_prompt',
  COMPLEX = 'complex_prompt',
}

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;

const SqliteQUerySchema = z.object({
  table: z.string({ description: 'sqlite数据库表名' }),
});
const SqliteCreateTableSchema = z.object({
  table: z.string({ description: 'sqlite数据库表名' }),
  columns: z.array(z.object({ name: z.string({ description: '字段名称' }), dataType: z.string({ description: '字段类型' }) }), {
    description: '表字段',
  }),
});
const AdditionSchema = z.object({ a: z.number(), b: z.number() });
const PoetrySchema = z.object({});

const toJsonSchema = (zodAny: any) => zodToJsonSchema(zodAny) as ToolInput;

export const createServer = () => {
  const server = new Server(
    { name: 'mapzone-servers/sqlite', version: VERSION },
    {
      capabilities: {
        prompts: {},
        resources: { subscribe: true },
        tools: {},
        logging: {},
      },
    },
  );
  let subscriptions: Set<string> = new Set();
  let updateInterval: NodeJS.Timeout | undefined;

  // Set up update interval for subscribed resources
  updateInterval = setInterval(() => {
    for (const uri of subscriptions) {
      server.notification({
        method: 'notifications/resources/updated',
        params: { uri },
      });
    }
  }, 5000);

  // Helper to create DB connection
  const getDb = () => {
    const db = new sqlite3.Database('database.db');
    return {
      all: promisify<string, any[]>(db.all.bind(db)),
      close: promisify(db.close.bind(db)),
    };
  };

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools: Tool[] = [
      {
        name: ToolName.ADDITION,
        description: '加法运算',
        inputSchema: toJsonSchema(AdditionSchema),
      },
      {
        name: ToolName.POETRY,
        description: '中国诗歌',
        inputSchema: toJsonSchema(PoetrySchema),
      },
      {
        name: ToolName.SQLITE_CREATE_TABLE,
        description: '在sqlite数据库创建表',
        inputSchema: toJsonSchema(SqliteCreateTableSchema),
      },
      {
        name: ToolName.SQLITE_QUERY,
        description: '查询sqlite数据库',
        inputSchema: toJsonSchema(SqliteQUerySchema),
      },
    ];
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    if (name === ToolName.ADDITION) {
      const { a, b } = AdditionSchema.parse(args);
      return {
        content: [{ type: 'text', text: String(a + b) }],
      };
    }
    if (name === ToolName.SQLITE_CREATE_TABLE) {
      const { table, columns } = SqliteCreateTableSchema.parse(args);

      const db = getDb();
      try {
        await db.all(
          `CREATE TABLE IF NOT EXISTS ${table} (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT ${columns.map((column) => `, ${column.name} ${column.dataType}`).join('')})`,
        );
        return {
          content: [
            {
              type: 'text',
              text: `Table ${table} created`,
            },
          ],
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      } finally {
        await db.close();
      }
    }
    if (name === ToolName.SQLITE_QUERY) {
      const { table } = SqliteQUerySchema.parse(args);
      const db = getDb();
      try {
        const results = await db.all(`SELECT * FROM ${table}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      } finally {
        await db.close();
      }
    }
    if (name === ToolName.POETRY) {
      return {
        content: [
          {
            type: 'text',
            text: ToolName.POETRY,
            _meta: {
              prompts: [
                {
                  name: '李白',
                  description: '李白的诗',
                  messages: [
                    {
                      role: 'system',
                      content: '用户选择了李白的诗，无需调用工具，直接返回结果',
                    },
                  ],
                },
                {
                  name: '杜甫',
                  description: '杜甫的诗',
                  messages: [
                    {
                      role: 'system',
                      content: '用户选择了杜甫的诗，无需调用工具，直接返回结果',
                    },
                  ],
                },
              ],
            },
          },
        ],
      };
    }
    throw new Error(`Unknown tool: ${name}`);
  });
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    const prompts: Prompt[] = [
      {
        name: PromptName.SIMPLE,
        description: 'A prompt without arguments',
      },
      {
        name: PromptName.COMPLEX,
        description: 'A prompt with arguments',
        arguments: [
          {
            name: 'temperature',
            description: 'Temperature setting',
            required: true,
          },
          {
            name: 'style',
            description: 'Output style',
            required: false,
          },
        ],
      },
    ];
    return { prompts };
  });
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === PromptName.SIMPLE) {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'This is a simple prompt without arguments.',
            },
          },
        ],
      };
    }

    if (name === PromptName.COMPLEX) {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `This is a complex prompt with arguments: temperature=${args?.temperature}, style=${args?.style}`,
            },
          },
          {
            role: 'assistant',
            content: {
              type: 'text',
              text: "I understand. You've provided a complex prompt with temperature and style arguments. How would you like me to proceed?",
            },
          },
        ],
      };
    }

    throw new Error(`Unknown prompt: ${name}`);
  });

  const cleanup = async () => {
    if (updateInterval) {
      clearInterval(updateInterval);
    }
  };
  return { server, cleanup };
};

try {
  const { server, cleanup } = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  server.onclose = async () => {
    await cleanup();
    await server.close();
    process.exit(0);
  };
} catch (e) {
  console.error(e);
}
