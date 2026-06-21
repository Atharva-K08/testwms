"use strict";

// Preloaded only for the E2E test run (testcases.js) via `node -r ./testDnsPreload.js`.
// Some sandboxed/corporate networks hand Node's c-ares resolver a broken
// link-local nameserver while the OS-level resolver (used by curl, browsers,
// etc.) still works fine — which breaks mongodb+srv:// SRV-record lookups
// specifically. Pointing Node's resolver at public DNS fixes that for this
// process only; nothing outside the test run is affected.
try {
  require("dns").setServers(["8.8.8.8", "1.1.1.1"]);
} catch (_) {
  // best-effort; if this fails, the connection error below will explain why.
}
