import { Prompt, Tool } from '@modelcontextprotocol/sdk/types.js';

export const useRequestParameter = () => {
  const getParameter = (model: string, options: { tools: Tool[]; prompts: Prompt[] }) => {
    const { tools } = options;

    switch (model) {
      case 'Qwen/QwQ-32B':
        return {
          model: 'Qwen/QwQ-32B',
          stream: true,
          temperature: 0,
          tools: [...tools].map((tool) => ({
            type: 'function',
            function: {
              description: tool.description,
              name: tool.name,
              parameters: tool.inputSchema ?? tool.arguments,
              strict: false,
            },
          })),
        };
      default:
        return { model, stream: true, tools };
    }
  };
  return {
    getParameter,
  };
};
