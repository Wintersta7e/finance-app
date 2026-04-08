const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('financeApp', {
  authToken: process.env.BACKEND_AUTH_TOKEN || '',
});
