/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react';
import { mcpGetConfig } from './services';
import { PROXY_SERVER_URL } from './const';

export type AppProviderProps = {
  children?: React.ReactNode;
};

export type AppContextProps = {
  mcpGetConfig: () => Promise<any>;
  PROXY_SERVER_URL: string;
};

const Context = createContext({} as AppContextProps);
export const AppProvider = (props: AppProviderProps) => {
  const { children, ...value } = props;

  return <Context.Provider value={{ ...value, mcpGetConfig, PROXY_SERVER_URL }}>{children}</Context.Provider>;
};

export const useAppContext = () => useContext(Context);
