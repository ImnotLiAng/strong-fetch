import fetch, { AbortError, Headers, RequestInit, RequestInfo } from "node-fetch";
import { AbortController } from "abort-controller";
import { HttpsProxyAgent } from "https-proxy-agent";

/**
 * @description: call as a normal fetch funtion, and set the timeout value in the init options
 * @example fetchWithTimeout(url, { timeout: 5000 })
 * @param {*} args
 * @return {*} Promise
 */
const fetchWithTimeout = async (url: URL | RequestInfo, init?: RequestInit & { timeout?: number }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, init?.timeout || 5000);
  const signal = controller.signal;
  const newInit = init ? { ...init, signal } : { signal };
  try {
    const res = await fetch(url, newInit);
    return res;
  } catch (err) {
    if (err instanceof AbortError) {
      return Promise.reject(new Error("timeout"));
    }
    return Promise.reject(err);
  } finally {
    clearTimeout(timeout);
  }
};
/**
 *
 * @description: pass a fetch function and retry interval seconds as parameters;
 * the fetch function would keep trying until success
 * @example fetchWithRetry(fetchList, 5);
 * @param {*} fun
 * @param {number} [interval=5]
 * @return {*} Promise
 */
const fetchWithRetry = async <Res>(fun: (args?: any[]) => Promise<Res>, interval = 5): Promise<Res> => {
  try {
    const res = await fun();
    return res;
  } catch (err) {
    console.log(err);
    console.log(`try again after ${interval}s`);
    await new Promise((resolve) => setTimeout(resolve, 1000 * interval));
    return fetchWithRetry(fun);
  }
};
/**
 *
 *
 * @param {*} { origin, key, value }
 * @return {*} 
 */
function addHeader({ init, key, value }: { init?:  RequestInit & { timeout?: number }, key: string, value: any }): RequestInit & { timeout?: number } {
  const newHeaders = new Headers(init?.headers);
  newHeaders.set(key, value);
  init = init ? { ...init, headers: newHeaders } : { headers: newHeaders };
  return init;
}
/**
 * @description: call when a api needs JWT Auth;
 * pass a funtion that fetch token 
 * @example const fetchWA = fetchWithAuth(fetchToken); fetchWA(url);
 * @param {*} fun
 * @return {*} function that used to fetch data
 */
const fetchWithAuth = (fun: (args?: any[]) => Promise<any>) => {
  let Authorization = "";
  let promise: null | undefined | Promise<any>;
  async function update() {
    if (promise) return promise;
    promise = fetchWithRetry(fun);
    Authorization = await promise;
    promise = null;
  }
  return async function _(url: URL | RequestInfo, init?: RequestInit & { timeout?: number }) {
    const res = await fetchWithTimeout(url, addHeader({ init, key: "Authorization", value: Authorization }));
    if ([401, 403].includes(res.status)) {
      await update();
      return fetchWithTimeout(url, addHeader({ init, key: "Authorization", value: Authorization }));
    }
    return res;
  };
};
/**
 * @description: call as a normal fetch funtion, and set the proxyUrl value in the init options
 * @example fetchWithTimeout(url, { proxyUrl: 'http://127.0.0.1:3000' })
 * @param {*} args
 * @return {*} Promise
 */
const fetchByProxy = async (url: URL | RequestInfo, init: RequestInit & { timeout?: number, proxyUrl: string }) => {
  const proxyUrl = init.proxyUrl;
  const agent = new HttpsProxyAgent(proxyUrl);
  init.agent = agent;
  const res = await fetchWithTimeout(url, init);
  return res;
};
/**
 * @description call when data needed to be update regular 
 * pass a function that fetch data
 * @example const getData = fixedRefresh(fetchData, 60); const data = getData();
 * @param {*} fun
 * @param {number} [interval=60 * 5]
 * @return {*} function that get data
 */
const fixedRefresh = <Res>(fun: (args?: any[]) => Promise<Res>, interval = 60 * 5): () => Promise<Res | undefined> => {
  let res: Res | undefined;
  let promise: undefined | null | Promise<any>;
  let lastUpdateTimestamp = 0;
  async function update() {
    if (promise) return promise;
    promise = fetchWithRetry(fun);
    res = await promise;
    lastUpdateTimestamp = Date.now();
    promise = null;
  }
  return async function _() {
    if (Date.now() - lastUpdateTimestamp >= interval * 1000 || !res) {
      await update();
    }
    return res;
  };
};

export {
  fetchWithTimeout,
  fetchWithRetry,
  fetchWithAuth,
  fetchByProxy,
  fixedRefresh,
};
