# NagarJal Backend — End-to-End Test Result Report

**Run date:** 2026-06-21T06:19:17.862Z
**Target:** `http://127.0.0.1:5050/api/v1` (server spawned from `server.js`, MONGO_URI from `.env` — `wmstest` database)
**Test script:** `testcases.js`
**Scope:** Backend REST API only (auth, requests, queue, receipts, diesel fillings, drivers, routes, tankers, attendance, RBAC, validation, concurrency, demo-traffic generator). The Flutter UI is not covered — see Notes.

## Summary

| Metric | Value |
|---|---|
| Total test cases | 88 |
| Passed | 88 |
| Failed | 0 |
| Pass rate | 100.0% |

## Results by Category

| Category | Total | Passed | Failed |
|---|---|---|---|
| Auth | 16 | 16 | 0 |
| Drivers | 10 | 10 | 0 |
| Tankers | 6 | 6 | 0 |
| Routes (source/destination) | 6 | 6 | 0 |
| Diesel Fillings | 15 | 15 | 0 |
| Request Lifecycle: submit -> assign -> route -> complete -> receipt | 20 | 20 | 0 |
| Handover | 2 | 2 | 0 |
| Cancel | 4 | 4 | 0 |
| Reports | 1 | 1 | 0 |
| Validation & RBAC edge cases | 5 | 5 | 0 |
| Concurrency (race-condition checks) | 2 | 2 | 0 |
| Demo Traffic Generator (direct service test) | 1 | 1 | 0 |

## Auth

| # | Test Case | Status | Duration (ms) |
|---|---|---|---|
| 1 | Health check responds 200 | PASS | 4 |
| 2 | Register a new member -> 201 | PASS | 457 |
| 3 | Register with duplicate mobile -> 409 | PASS | 14 |
| 4 | Register with non-6-digit password -> 422 | PASS | 3 |
| 5 | Login member with correct credentials -> 200 | PASS | 319 |
| 6 | Login member with wrong password -> 401 | PASS | 297 |
| 7 | Get profile with valid token -> 200 | PASS | 28 |
| 8 | Get profile without token -> 401 | PASS | 1 |
| 9 | Refresh token -> 200 with new tokens | PASS | 13 |
| 10 | Update own password -> 200, then login with new password | PASS | 931 |
| 11 | Super admin bootstrap login -> 200 | PASS | 316 |
| 12 | Member cannot create a manager -> 403 | PASS | 11 |
| 13 | Super admin creates a manager -> 201 | PASS | 334 |
| 14 | Super admin creates a fuel manager -> 201 | PASS | 330 |
| 15 | Manager login -> 200 (freshly created, or seeded fallback) | PASS | 307 |
| 16 | Fuel manager login -> 200 (freshly created, or seeded fallback) | PASS | 308 |

## Drivers

| # | Test Case | Status | Duration (ms) |
|---|---|---|---|
| 1 | Manager creates a driver -> 201 with auto serial number | PASS | 40 |
| 2 | Manager creates a second driver -> 201 | PASS | 36 |
| 3 | Manager creates a BLOCK-status driver -> 201 | PASS | 38 |
| 4 | Create driver with duplicate mobile -> 409 | PASS | 32 |
| 5 | Member cannot create a driver -> 403 | PASS | 11 |
| 6 | Get all drivers -> 200 paginated | PASS | 27 |
| 7 | Get driver by id -> 200 | PASS | 24 |
| 8 | Get driver by serial number -> 200 | PASS | 234 |
| 9 | Update driver -> 200 | PASS | 29 |
| 10 | Soft-delete a driver -> excluded from subsequent list | PASS | 85 |

## Tankers

| # | Test Case | Status | Duration (ms) |
|---|---|---|---|
| 1 | Add a tanker -> 201 | PASS | 30 |
| 2 | Add a second tanker -> 201 (will be used for handover) | PASS | 31 |
| 3 | Add a third tanker (deliberately never fuelled) -> 201 | PASS | 27 |
| 4 | Add duplicate tanker number -> 409 | PASS | 18 |
| 5 | Member cannot add a tanker -> 403 | PASS | 9 |
| 6 | Get all tankers -> 200 | PASS | 20 |

## Routes (source/destination)

| # | Test Case | Status | Duration (ms) |
|---|---|---|---|
| 1 | Manager creates a route -> 201 | PASS | 26 |
| 2 | Fuel manager cannot create a route -> 403 | PASS | 25 |
| 3 | Get all routes -> 200 | PASS | 19 |
| 4 | Get route by destination name -> 200 | PASS | 18 |
| 5 | Update route -> 200 | PASS | 21 |
| 6 | Delete route -> 200 | PASS | 23 |

## Diesel Fillings

| # | Test Case | Status | Duration (ms) |
|---|---|---|---|
| 1 | Fuel manager records a filling for tanker1 -> 201, 0 trips so far | PASS | 39 |
| 2 | Fuel manager records a filling for tanker2 (handover target) -> 201 | PASS | 35 |
| 3 | Member cannot record a diesel filling -> 403 | PASS | 10 |
| 4 | Manager (read-only role here) cannot record a diesel filling -> 403 | PASS | 17 |
| 5 | Get all diesel fillings -> 200 paginated | PASS | 37 |
| 6 | Get diesel filling by id -> 200 | PASS | 52 |
| 7 | Update diesel filling -> 200 | PASS | 28 |
| 8 | Mark filling as wrong -> 200 | PASS | 35 |
| 9 | Marking an already-wrong filling again -> 400 | PASS | 22 |
| 10 | Super admin views wrong entries -> 200, includes filling1 | PASS | 37 |
| 11 | Fuel manager cannot view wrong entries (superAdmin only) -> 403 | PASS | 11 |
| 12 | Generate diesel report -> 200 | PASS | 321 |
| 13 | Get tanker diesel summary -> 200 | PASS | 41 |
| 14 | Delete diesel filling -> 200 | PASS | 36 |
| 15 | Re-record a valid filling for tanker1 (setup for assignment tests) | PASS | 40 |

## Request Lifecycle: submit -> assign -> route -> complete -> receipt

| # | Test Case | Status | Duration (ms) |
|---|---|---|---|
| 1 | Member submits a water tanker request -> 201 with queue position | PASS | 67 |
| 2 | Member views own requests -> 200, includes request1 | PASS | 19 |
| 3 | Member cannot view the manager queue -> 403 | PASS | 10 |
| 4 | Manager views the queue -> 200, includes request1 | PASS | 32 |
| 5 | Manager peeks next in queue -> 200 | PASS | 36 |
| 6 | Assigning an un-fuelled tanker is rejected -> 422 | PASS | 28 |
| 7 | Assigning a blocked driver is rejected -> 422 | PASS | 33 |
| 8 | Assign tanker + driver to request1 -> 200, both locked on_trip | PASS | 94 |
| 9 | Assigning the same (now-busy) tanker to a second request -> 409 | PASS | 74 |
| 10 | Cannot set source/destination before a tanker is assigned -> 422 | PASS | 21 |
| 11 | Cannot complete request1 before source/destination/km are set -> 422 | PASS | 19 |
| 12 | Assign source/destination/km to request1 -> 200, round-trip auto-doubled | PASS | 47 |
| 13 | Complete request1 -> 200, tanker + driver freed back to available | PASS | 109 |
| 14 | Now the second request can take the freed tanker -> 200 | PASS | 65 |
| 15 | Generate a receipt for request1 -> 201 with WTR-formatted number | PASS | 47 |
| 16 | Generating the same receipt again is idempotent -> same receipt number | PASS | 24 |
| 17 | Fetch receipt by request id -> 200 | PASS | 23 |
| 18 | Mark receipt as printed -> 200, printCount incremented | PASS | 21 |
| 19 | Get all receipts -> 200, includes receipt1 | PASS | 25 |
| 20 | Driver attendance shows the completed trip -> 200 | PASS | 50 |

## Handover

| # | Test Case | Status | Duration (ms) |
|---|---|---|---|
| 1 | Submit + assign a request, then hand it over to a different tanker/driver with a reason -> 200 | PASS | 220 |
| 2 | Handover without a reason is rejected -> 422 | PASS | 9 |

## Cancel

| # | Test Case | Status | Duration (ms) |
|---|---|---|---|
| 1 | Member cancels their own pending request -> 200 | PASS | 56 |
| 2 | Cancelling an already-cancelled request again -> 404 | PASS | 83 |
| 3 | Manager cancels a tanker-assigned request -> frees tanker + driver | PASS | 293 |
| 4 | Get cancelled requests list -> 200 | PASS | 33 |

## Reports

| # | Test Case | Status | Duration (ms) |
|---|---|---|---|
| 1 | Manager report -> 200 with summary counts | PASS | 78 |

## Validation & RBAC edge cases

| # | Test Case | Status | Duration (ms) |
|---|---|---|---|
| 1 | Invalid MongoId in param -> 400/422/404 (not a 500) | PASS | 13 |
| 2 | Assign-source-destination with kilometers below minimum -> 422 | PASS | 81 |
| 3 | Fuel manager cannot access driver management -> 403 | PASS | 10 |
| 4 | Request without auth token -> 401 | PASS | 2 |
| 5 | Malformed Authorization header -> 401 | PASS | 2 |

## Concurrency (race-condition checks)

| # | Test Case | Status | Duration (ms) |
|---|---|---|---|
| 1 | Two simultaneous request submissions get unique queue positions | PASS | 60 |
| 2 | Two simultaneous assigns of the SAME tanker to two different pending requests — at most one should win | PASS | 190 |

## Demo Traffic Generator (direct service test)

| # | Test Case | Status | Duration (ms) |
|---|---|---|---|
| 1 | generateDemoRequest() creates a tagged, completed request without disturbing the live queue | PASS | 1073 |

## Notes & Recommendations

- This run targets the `wmstest` MongoDB database configured in `.env`. Test data (members, drivers, tankers, routes) created by this run is tagged with run id `747672` and is left in place — `wmstest` is a disposable test database, so no cleanup step was run.
- The rate limiter was raised for this run only (`RATE_LIMIT_MAX=100000`, via spawned-process env) since full E2E coverage exceeds the default 100 requests / 15 min production limit. Production `.env` was not modified.
- Two concurrency tests intentionally probe known read-then-write race windows (`getNextQueuePosition()` and the tanker-availability check inside `assignTanker()`). If either is listed as FAIL above, that confirms the race is reproducible under real concurrent load, not just a theoretical concern.
- Flutter app UI/UX, Bluetooth receipt printing, and GPS/geocoding flows are **not** covered by this script — they require a device/emulator and are out of scope for an HTTP-level API test suite. Manual or widget-test coverage is recommended separately.
- Re-running this script is safe and idempotent: every mobile number, tanker number, and route uses a fresh run-id suffix, so it never collides with data from a previous run.
