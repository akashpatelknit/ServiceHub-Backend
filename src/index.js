// Compatibility shim — vercel.json's build entry and package.json's "main" both point
// at src/index.js. The actual API-boot logic now lives in src/server.js; keep this
// as a pure re-export so those configs don't need touching.
import './server.js';
