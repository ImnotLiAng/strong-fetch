import fetch, { AbortError, Headers } from "node-fetch";
import AbortController from "abort-controller";
import { HttpsProxyAgent } from "https-proxy-agent";

const fetchWithTimeout = async (...args) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, args[1]?.timeout || 5000);
  const newArgs = args;
  const signal = controller.signal;
  newArgs[1] = args[1] ? { ...args[1], signal } : { signal };
  try {
    const res = await fetch(...newArgs);
    return res;
  } catch (err) {
    if (err instanceof AbortError) {
      return Promise.reject(new Error("timeout"));
    }
    return Promise.reject(err);
  } finally {
    clearImmediate(timeout);
  }
};

const fetchWithRetry = async (fun, interval = 5) => {
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

function addHeader({ origin, key, value }) {
  const args = origin;
  const newHeaders = new Headers(args[1]?.headers);
  newHeaders.set(key, value);
  args[1] = args[1] ? { ...args[1], headers: newHeaders } : { headers: newHeaders };
  return args;
}

const fetchWithAuth = (fun) => {
  let Authorization = "";
  let promise;
  async function update() {
    if (promise) return promise;
    promise = fetchWithRetry(fun);
    Authorization = await promise;
    promise = null;
  }
  return async function _(...args) {
    const res = await fetchWithTimeout(...addHeader({ origin: args, key: "Authorization", value: Authorization }));
    if ([401, 403].includes(res.status)) {
      await update();
      return fetchWithTimeout(...addHeader({ origin: args, key: "Authorization", value: Authorization }));
    }
    return res;
  };
};

const fetchByProxy = async (...args) => {
  const proxyUrl = args[1].proxyUrl;
  const agent = new HttpsProxyAgent(proxyUrl);
  const newArgs = args;
  newArgs[1] = args[1] ? { ...args[1], agent } : { agent };
  const res = await fetchWithTimeout(...newArgs);
  return res;
};

const fixedRefresh = (fun, interval = 60 * 5) => {
  let res;
  let promise;
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
