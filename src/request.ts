import { XRequest } from '@ant-design/x';

const host = 'http://localhost:8080';

export const request = XRequest({ baseURL: `/api/chat`, model: 'deepseek-r1:1.5b' });
