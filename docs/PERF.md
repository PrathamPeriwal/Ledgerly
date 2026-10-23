# Query counts

Load times are measured from this machine to the hosted database and are only meaningful relative to each other.

## Before

| User | Route | Queries | Load ms |
| --- | --- | --- | --- |
| Maya | /dashboard | 13 | 1912 |
| Maya | /account (default) | 9 | 2304 |
| Maya | /transaction/create | 2 | 1877 |
| Omar | /dashboard | 13 | 2009 |
| Omar | /account (default) | 9 | 1896 |
| Omar | /transaction/create | 2 | 1866 |

## After

| User | Route | Queries | Load ms |
| --- | --- | --- | --- |
| Maya | /dashboard | 6 | 1872 |
| Maya | /account (default) | 9 | 2079 |
| Maya | /transaction/create | 2 | 1778 |
| Omar | /dashboard | 6 | 1701 |
| Omar | /account (default) | 9 | 1703 |
| Omar | /transaction/create | 2 | 1751 |

## Summary

- /dashboard: 13 queries before, 6 after (Maya and Omar).
- /account (default): 9 queries before, 9 after (Maya and Omar).
- /transaction/create: 2 queries before, 2 after (Maya and Omar).

## After B2

| User | Route | Before B2 | After B2 | Load ms |
| --- | --- | --- | --- | --- |
| Omar | /account (default) | 9 | 6 | 1424 |
| Omar | /transaction/create | 2 | 2 | 1398 |

- The range income total, expense total and transaction count are one grouped query; the chart series stays separate.
- The header lookup and account switcher share one cached account list per request.
- ensureUser is one lookup by Clerk id on the warm path (Clerk's API is only called to create a missing user).
