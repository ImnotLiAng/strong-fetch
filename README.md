This module exposes some methods to fetch Data more functional.

# fetchWithTimeout
call as a normal fetch funtion, and set the timeout value in the init options.

example: `fetchWithTimeout(url, { timeout: 5000 });`

# fetchWithRetry
pass a fetch function and retry interval seconds as parameters;
The fetch function would keep trying until success.

example: `fetchWithRetry(fetchList, 5);`

# fetchWithAuth
call when a api needs JWT Auth;
pass a funtion that fetch token.

example: `const fetchWA = fetchWithAuth(fetchToken); fetchWA(url);`

# fetchByProxy
 call as a normal fetch funtion, and set the proxyUrl value in the init options.

 example: `fetchWithTimeout(url, { proxyUrl: 'http://127.0.0.1:3000' })`

 # fixedRefresh
 call when data needed to be update regular.

 example: `const getData = fixedRefresh(fetchData, 60); const data = getData();`