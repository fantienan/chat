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

window.__biz__fetch__ = window.fetch;
export const interceptRequest = (placeHolder: string) => {
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      if (input instanceof Request && typeof input.url === 'string' && input.url.includes(placeHolder)) {
        return Promise.resolve(new Response(null, { status: 200, statusText: 'OK' }));
      }
    } catch (e) {
      console.warn('拦截器异常:', e);
    }
    return window.__biz__fetch__(input, init);
  };
  class BizXMLHttpRequest extends XMLHttpRequest {
    private _url: string = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    open(...args: any): void {
      this._url = args[1];
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return super.open(...args);
    }
    send(body?: Document | XMLHttpRequestBodyInit | null): void {
      try {
        if (this._url && this._url.includes(placeHolder)) {
          const event = new Event('readystatechange');
          Object.defineProperty(this, 'status', { value: 200 });
          Object.defineProperty(this, 'statusText', { value: 'ok' });
          Object.defineProperty(this, 'readyState', { value: 4 });
          this.dispatchEvent(event);
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          if (super.onload) super.onload();
          return;
        }
      } catch (e) {
        console.warn('拦截器异常:', e);
      }
      return super.send(body);
    }
  }
  window.XMLHttpRequest = BizXMLHttpRequest;
};
