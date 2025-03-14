import { PROXY_SERVER_URL } from '@/const';

export type McpConfig = {
  defaultEnvironment: Record<string, string>;
  defaultCommand: string;
  defaultArgs: string;
};

export const mcpGetConfig = async () => {
  return fetch(`${PROXY_SERVER_URL}/config`).then<McpConfig>((response) => response.json());
};
