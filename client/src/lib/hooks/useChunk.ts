export type ChunkToolCall = {
  name: string;
  type: string;
  arguments: any;
};
export type Chunk2MessageResult = {
  message: string;
  toolCalls: ChunkToolCall[];
};

export const useChunk = () => {
  // 处理多行JOSN字符串
  const jsonRegex = /\{.*?\}(?:\n|$)/gs;
  const chunk2Message = (model: string, chunk: string, result: Chunk2MessageResult) => {
    const matches = chunk.match(jsonRegex);
    if (!matches) return '';
    switch (model) {
      case 'deepseek-r1:1.5b':
        result.message = matches
          .map((match) => JSON.parse(match).message.content)
          .join('')
          .replace('<think>', '<div class="think"><div class="think-bar"></div>')
          .replace('</think>', '</div>');
        break;
      case 'Qwen/QwQ-32B':
        matches.forEach((match) => {
          const item = JSON.parse(match);
          item.choices.forEach((choice: any) => {
            result.message += choice.delta.content ?? '';
            if (choice.delta.finish_reason !== 'tool_calls' && Array.isArray(choice.delta.tool_calls)) {
              choice.delta.tool_calls.forEach((toolCall: any, index: number) => {
                result.toolCalls[index] ??= {
                  type: toolCall.type,
                  name: toolCall.function.name,
                  arguments: '',
                };
                result.toolCalls[index].arguments += toolCall.function.arguments;
              });
            }
          });
        });
        break;
      default:
        return chunk;
    }
    return result;
  };
  const parseToolCallArguments = (toolCalls: Chunk2MessageResult['toolCalls']) => {
    toolCalls.forEach((toolCall) => {
      if (toolCall.arguments) {
        toolCall.arguments = JSON.parse(toolCall.arguments);
      }
    });
    return toolCalls;
  };
  return {
    chunk2Message,
    parseToolCallArguments,
  };
};
