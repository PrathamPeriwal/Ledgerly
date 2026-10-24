# Query counts

Load times are measured from this machine to the hosted database and are only meaningful relative to each other. Query counts are the reliable number.

| User | Route | Queries before | After B1 | After B2 |
| --- | --- | ---: | ---: | ---: |
| Maya | /dashboard | 13 | 6 | 6 |
| Maya | /account (default) | 9 | 9 | not measured |
| Maya | /transaction/create | 2 | 2 | not measured |
| Omar | /dashboard | 13 | 6 | 6 |
| Omar | /account (default) | 9 | 9 | 6 |
| Omar | /transaction/create | 2 | 2 | 2 |

Load times (ms, before / after B1): Maya dashboard 1912 / 1872, Maya account 2304 / 2079, Omar dashboard 2009 / 1701, Omar account 1896 / 1703. After B2: Omar account 1424, Omar create 1398.

What changed:

- B1: dashboard totals and breakdowns became grouped SQL queries.
- B2: the range income total, expense total and count are one grouped query; the header lookup and account switcher share one cached account list per request; `ensureUser` is one lookup by Clerk id on the warm path.

The production baseline (before any revamp work) is in [PERF-BASELINE.md](PERF-BASELINE.md).

Omar's 3,000-transaction account was retired from the demo set after these measurements. The numbers above are historical.
