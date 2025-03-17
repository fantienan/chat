import { useEffect, useState } from 'react';

const params = new URLSearchParams(window.location.search);
export const useMCPServerParameter = () => {
  const [command, setCommand] = useState<string>(() => {
    return localStorage.getItem('lastCommand') || 'mcp-server-everything';
  });
  const [args, setArgs] = useState<string>(() => {
    return localStorage.getItem('lastArgs') || '';
  });

  const [sseUrl, setSseUrl] = useState<string>(() => {
    return localStorage.getItem('lastSseUrl') || 'http://localhost:3001/sse';
  });
  const [transportType, setTransportType] = useState<'stdio' | 'sse'>(() => {
    return (localStorage.getItem('lastTransportType') as 'stdio' | 'sse') || 'stdio';
  });
  const [bearerToken, setBearerToken] = useState<string>(() => {
    return localStorage.getItem('lastBearerToken') || '';
  });
  useEffect(() => {
    localStorage.setItem('lastCommand', command);
  }, [command]);

  useEffect(() => {
    localStorage.setItem('lastArgs', args);
  }, [args]);

  useEffect(() => {
    localStorage.setItem('lastSseUrl', sseUrl);
  }, [sseUrl]);

  useEffect(() => {
    localStorage.setItem('lastTransportType', transportType);
  }, [transportType]);

  useEffect(() => {
    localStorage.setItem('lastBearerToken', bearerToken);
  }, [bearerToken]);

  useEffect(() => {
    const serverUrl = params.get('serverUrl');
    if (serverUrl) {
      setSseUrl(serverUrl);
      setTransportType('sse');
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('serverUrl');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, []);

  return {
    command,
    setCommand,
    args,
    setArgs,
    sseUrl,
    setSseUrl,
    transportType,
    setTransportType,
    bearerToken,
    setBearerToken,
  };
};
