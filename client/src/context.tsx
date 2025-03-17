/* eslint-disable react-refresh/only-export-components */
import { XRequest } from '@ant-design/x';
import { createContext, useContext } from 'react';
import { mcpGetConfig } from './services';
import { PROXY_SERVER_URL } from './const';
import OpenAI from 'openai';

export type AppProviderProps = {
  children?: React.ReactNode;
};

export type AppContextProps = {
  mcpGetConfig: () => Promise<any>;
  PROXY_SERVER_URL: string;
  request: ReturnType<typeof XRequest>;
  model: string;
};

const Context = createContext({} as AppContextProps);
export const AppProvider = (props: AppProviderProps) => {
  const { children, ...value } = props;
  // const model = 'deepseek-r1:1.5b';
  // export const request = XRequest({ baseURL: `/ollama/api/chat`, model: 'deepseek-r1:1.5b' });

  const model = 'Qwen/QwQ-32B';
  const request = XRequest({
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      headers.set('Authorization', 'Bearer sk-scffrnwrwreedsoaksbsnotofpyeznjslmdyoodyspuoadac');
      headers.set('Content-Type', 'application/json');
      const res = await fetch(input, { ...init, headers });
      return res;
    },
    baseURL: `https://api.siliconflow.cn/v1/chat/completions`,
    model: 'Qwen/QwQ-32B',
  });

  // const model = 'moonshot-v1-8k';
  // const baseURL = `https://api.moonshot.cn`;
  // const client = new OpenAI({
  //   apiKey: 'sk-4nepFBv22QO3ZJFcM964v8emOTOzY77iIbx064dHTW7MpFhF',
  //   baseURL,
  //   dangerouslyAllowBrowser: true,
  // });

  // const request = XRequest({
  //   baseURL,
  //   model,
  //   fetch: async (input, init) => {
  //     const res = await client.chat.completions.create({
  //       model,
  //       messages: [],
  //       temperature: 0.3,
  //     });
  //     return res;
  //   },
  // });

  return <Context.Provider value={{ ...value, mcpGetConfig, PROXY_SERVER_URL, request, model }}>{children}</Context.Provider>;
};

export const useAppContext = () => useContext(Context);
