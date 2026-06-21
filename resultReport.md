# NagarJal Backend — End-to-End Test Result Report

**Run date:** 2026-06-21T14:59:29.372Z
**Target:** `http://127.0.0.1:5050/api/v1` (server spawned from `server.js`, MONGO_URI from `.env` — `wmstest` database)
**Test script:** `testcases.js`
**Scope:** Backend REST API only (auth, requests, queue, receipts, diesel fillings, drivers, routes, tankers, attendance, RBAC, validation, concurrency, demo-traffic generator). The Flutter UI is not covered — see Notes.

## Summary

| Metric | Value |
|---|---|
| Total test cases | 89 |
| Passed | 89 |
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
| Handover | 3 | 3 | 0 |
| Cancel | 4 | 4 | 0 |
| Reports | 1 | 1 | 0 |
| Validation & RBAC edge cases | 5 | 5 | 0 |
| Concurrency (race-condition checks) | 2 | 2 | 0 |
| Demo Traffic Generator (direct service test) | 1 | 1 | 0 |

## Auth

| # | Test Case | Status | Duration (ms) |
|---|---|---|---|
| 1 | Health check responds 200 | PASS | 7 |
| 2 | Register a new member -> 201 | PASS | 585 |
| 3 | Register with duplicate mobile -> 409 | PASS | 24 |
| 4 | Register with non-6-digit password -> 422 | PASS | 6 |
| 5 | Login member with correct credentials -> 200 | PASS | 508 |
| 6 | Login member with wrong password -> 401 | PASS | 442 |
| 7 | Get profile with valid token -> 200 | PASS | 27 |
| 8 | Get profile without token -> 401 | PASS | 3 |
| 9 | Refresh token -> 200 with new tokens | PASS | 18 |
| 10 | Update own password -> 200, then login with new password | PASS | 1395 |
| 11 | Super admin bootstrap login -> 200 | PASS | 488 |
| 12 | Member cannot create a manager -> 403 | PASS | 78 |
| 13 | Super admin creates a manager -> 201 | PASS | 696 |
| 14 | Super admin creates a fuel manager -> 201 | PASS | 543 |
| 15 | Manager login -> 200 (freshly created, or seeded fallback) | PASS | 535 |
| 16 | Fuel manager login -> 200 (freshly created, or seeded fallback) | PASS | 495 |

## Drivers

| # | Test Case | Status | Duration (ms) |
|---|---|---|---|
| 1 | Manager creates a driver -> 201 with auto serial number | PASS | 198 |
| 2 | Manager creates a second driver -> 201 | PASS | 40 |
| 3 | Manager creates a BLOCK-status driver -> 201 | PASS | 58 |
| 4 | Create driver with duplicate mobile -> 409 | PASS | 74 |
| 5 | Member cannot create a driver -> 403 | PASS | 226 |
| 6 | Get all drivers -> 200 paginated | PASS | 64 |
| 7 | Get driver by id -> 200 | PASS | 29 |
| 8 | Get driver by serial number -> 200 | PASS | 212 |
| 9 | Update driver -> 200 | PASS | 121 |
| 10 | Soft-delete a driver -> excluded from subsequent list | PASS | 291 |

## Tankers

| # | Test Case | Status | Duration (ms) |
|---|---|---|---|
| 1 | Add a tanker -> 201 | PASS | 173 |
| 2 | Add a second tanker -> 201 (will be used for handover) | PASS | 46 |
| 3 | Add a third tanker (deliberately never fuelled) -> 201 | PASS | 153 |
| 4 | Add duplicate tanker number -> 409 | PASS | 43 |
| 5 | Member cannot add a tanker -> 403 | PASS | 14 |
| 6 | Get all tankers -> 200 | PASS | 90 |

## Routes (source/destination)

| # | Test Case | Status | Duration (ms) |
|---|---|---|---|
| 1 | Manager creates a route -> 201 | PASS | 86 |
| 2 | Fuel manager cannot create a route -> 403 | PASS | 14 |
| 3 | Get all routes -> 200 | PASS | 23 |
| 4 | Get route by destination name -> 200 | PASS | 65 |
| 5 | Update route -> 200 | PASS | 27 |
| 6 | Delete route -> 200 | PASS | 76 |

## Diesel Fillings

| # | Test Case | Status | Duration (ms) |
|---|---|---|---|
| 1 | Fuel manager records a filling for tanker1 -> 201, 0 trips so far | PASS | 219 |
| 2 | Fuel manager records a filling for tanker2 (handover target) -> 201 | PASS | 47 |
| 3 | Member cannot record a diesel filling -> 403 | PASS | 46 |
| 4 | Manager (read-only role here) cannot record a diesel filling -> 403 | PASS | 103 |
| 5 | Get all diesel fillings -> 200 paginated | PASS | 361 |
| 6 | Get diesel filling by id -> 200 | PASS | 117 |
| 7 | Update diesel filling -> 200 | PASS | 43 |
| 8 | Mark filling as wrong -> 200 | PASS | 41 |
| 9 | Marking an already-wrong filling again -> 400 | PASS | 23 |
| 10 | Super admin views wrong entries -> 200, includes filling1 | PASS | 151 |
| 11 | Fuel manager cannot view wrong entries (superAdmin only) -> 403 | PASS | 13 |
| 12 | Generate diesel report -> 200 | PASS | 1389 |
| 13 | Get tanker diesel summary -> 200 | PASS | 333 |
| 14 | Delete diesel filling -> 200 | PASS | 84 |
| 15 | Re-record a valid filling for tanker1 (setup for assignment tests) | PASS | 115 |

## Request Lifecycle: submit -> assign -> route -> complete -> receipt

| # | Test Case | Status | Duration (ms) |
|---|---|---|---|
| 1 | Member submits a water tanker request -> 201 with queue position | PASS | 401 |
| 2 | Member views own requests -> 200, includes request1 | PASS | 24 |
| 3 | Member cannot view the manager queue -> 403 | PASS | 58 |
| 4 | Manager views the queue -> 200, includes request1 | PASS | 58 |
| 5 | Manager peeks next in queue -> 200 | PASS | 167 |
| 6 | Assigning an un-fuelled tanker is rejected -> 422 | PASS | 190 |
| 7 | Assigning a blocked driver is rejected -> 422 | PASS | 145 |
| 8 | Assign tanker + driver to request1 -> 200, both locked on_trip | PASS | 131 |
| 9 | Assigning the same (now-busy) tanker to a second request -> 409 | PASS | 246 |
| 10 | Cannot set source/destination before a tanker is assigned -> 422 | PASS | 23 |
| 11 | Cannot complete request1 before source/destination/km are set -> 422 | PASS | 31 |
| 12 | Assign source/destination/km to request1 -> 200, round-trip auto-doubled | PASS | 254 |
| 13 | Complete request1 -> 200, tanker + driver freed back to available | PASS | 209 |
| 14 | Now the second request can take the freed tanker -> 200 | PASS | 261 |
| 15 | Generate a receipt for request1 -> 201 with WTR-formatted number | PASS | 139 |
| 16 | Generating the same receipt again is idempotent -> same receipt number | PASS | 119 |
| 17 | Fetch receipt by request id -> 200 | PASS | 43 |
| 18 | Mark receipt as printed -> 200, printCount incremented | PASS | 25 |
| 19 | Get all receipts -> 200, includes receipt1 | PASS | 203 |
| 20 | Driver attendance shows the completed trip -> 200 | PASS | 137 |

## Handover

| # | Test Case | Status | Duration (ms) |
|---|---|---|---|
| 1 | Submit + assign a request, then hand it over to a different tanker/driver with a reason -> 200 | PASS | 688 |
| 2 | Handover without a reason is rejected -> 422 | PASS | 15 |
| 3 | Receipt generated before a handover picks up the new tanker/driver afterward | PASS | 923 |

## Cancel

| # | Test Case | Status | Duration (ms) |
|---|---|---|---|
| 1 | Member cancels their own pending request -> 200 | PASS | 319 |
| 2 | Cancelling an already-cancelled request again -> 404 | PASS | 205 |
| 3 | Manager cancels a tanker-assigned request -> frees tanker + driver | PASS | 880 |
| 4 | Get cancelled requests list -> 200 | PASS | 70 |

## Reports

| # | Test Case | Status | Duration (ms) |
|---|---|---|---|
| 1 | Manager report -> 200 with summary counts | PASS | 40 |

## Validation & RBAC edge cases

| # | Test Case | Status | Duration (ms) |
|---|---|---|---|
| 1 | Invalid MongoId in param -> 400/422/404 (not a 500) | PASS | 12 |
| 2 | Assign-source-destination with kilometers below minimum -> 422 | PASS | 79 |
| 3 | Fuel manager cannot access driver management -> 403 | PASS | 43 |
| 4 | Request without auth token -> 401 | PASS | 2 |
| 5 | Malformed Authorization header -> 401 | PASS | 2 |

## Concurrency (race-condition checks)

| # | Test Case | Status | Duration (ms) |
|---|---|---|---|
| 1 | Two simultaneous request submissions get unique queue positions | PASS | 416 |
| 2 | Two simultaneous assigns of the SAME tanker to two different pending requests — at most one should win | PASS | 561 |

## Demo Traffic Generator (direct service test)

| # | Test Case | Status | Duration (ms) |
|---|---|---|---|
| 1 | generateDemoRequest() creates a tagged, completed request without disturbing the live queue | PASS | 2064 |

## Notes & Recommendations

- This run targets the `wmstest` MongoDB database configured in `.env`. Test data (members, drivers, tankers, routes) created by this run is tagged with run id `945403` and is left in place — `wmstest` is a disposable test database, so no cleanup step was run.
- The rate limiter was raised for this run only (`RATE_LIMIT_MAX=100000`, via spawned-process env) since full E2E coverage exceeds the default 100 requests / 15 min production limit. Production `.env` was not modified.
- Two concurrency tests intentionally probe known read-then-write race windows (`getNextQueuePosition()` and the tanker-availability check inside `assignTanker()`). If either is listed as FAIL above, that confirms the race is reproducible under real concurrent load, not just a theoretical concern.
- Flutter app UI/UX, Bluetooth receipt printing, and GPS/geocoding flows are **not** covered by this script — they require a device/emulator and are out of scope for an HTTP-level API test suite. Manual or widget-test coverage is recommended separately.
- Re-running this script is safe and idempotent: every mobile number, tanker number, and route uses a fresh run-id suffix, so it never collides with data from a previous run.
