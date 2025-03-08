// 处理多行JOSN字符串
const jsonRegex = /\{.*?\}(?:\n|$)/gs;
export const chunk2Content = (chunk: string): string => {
  let content = '';
  const matches = chunk.match(jsonRegex);
  if (!matches) {
    content = JSON.parse(chunk);
  } else {
    content = matches.map((match) => JSON.parse(match).message.content).join('');
  }
  return content.replace('<think>', '<div class="think"><div class="think-bar"></div>').replace('</think>', '</div>');
};
