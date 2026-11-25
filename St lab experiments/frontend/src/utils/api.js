window.EcoSort = window.EcoSort || {};

(function () {
  const TOKEN_KEY = 'ecosort_jwt_token';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || '';
  }

  function setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  async function request(path, options = {}) {
    const token = getToken();
    const headers = { ...(options.headers || {}) };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(path, { ...options, headers });
    const contentType = res.headers.get('content-type') || '';

    if (!res.ok) {
      let msg = `Request failed (${res.status})`;
      if (contentType.includes('application/json')) {
        const errData = await res.json();
        msg = errData.error || errData.message || msg;
      }
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }

    if (contentType.includes('application/json')) {
      return res.json();
    }
    return res;
  }

  async function downloadFile(path, filename) {
    const token = getToken();
    const res = await fetch(path, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to download report.');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  window.EcoSort.api = {
    getToken,
    setToken,
    get: (path) => request(path, { method: 'GET' }),
    post: (path, body) =>
      request(path, {
        method: 'POST',
        body: body instanceof FormData ? body : JSON.stringify(body || {}),
      }),
    put: (path, body) =>
      request(path, { method: 'PUT', body: JSON.stringify(body || {}) }),
    patch: (path, body) =>
      request(path, { method: 'PATCH', body: JSON.stringify(body || {}) }),
    downloadFile,
  };
})();

