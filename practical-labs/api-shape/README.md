# REST / GraphQL: response shape aur server work

Run from `sys-design-gurukul/practical-labs/api-shape` with Node 24 or newer:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm test
```

Install needs npm access unless the pinned package is already cached. Experiments run offline after installation. The GraphQL parser, validator and executor are real. SQL SELECTs run on a real in-memory SQLite database. No HTTP server, shared database, cloud account or user credentials are used. Node may print its SQLite experimental-feature notice.

## Pehle teen files samjho

- `schema.graphql`: server ka contract. Example: `posts(first: Int!): [Post!]!` means an integer argument and a non-null list of non-null posts. `title: String!` declares a non-null string field.
- Query: `{ posts(first: 3) { title } }` selects a response. Query field par return type dobara nahi likhte.
- `api.cjs`: resolver functions fields ko data deti hain. The selected shape does not itself choose an efficient database plan.

## Predict, run, explain

The data contains 3 posts. Their authors are Bilal, Asha, Bilal, in that order.

| Request or experiment | Verified result | Reason |
|---|---|---|
| Schema field without `: Type` | Parse error | A schema definition and a selection are different syntax. |
| Posts, title only | 1 SQL SELECT | Author resolvers are not selected. The REST-style projection returns the same titles. |
| Posts with author names, naive | 4 SQL SELECTs | One posts query plus one author lookup for each of 3 posts. |
| Same selection, batched | 2 SQL SELECTs | One posts query plus one author query for distinct keys 2 and 1. |
| Unknown selected field | 0 SQL SELECTs | GraphQL validation fails before execution. |
| `first: 100` | 0 SQL SELECTs | Our resolver permits only 1..3. GraphQL Int alone does not enforce that range. |
| Viewer 1 selects author 2's email | Public name plus `email: null`, with an error path | A typed field is not authorization. Email is nullable in this schema. |
| Two aliases, each `first: 3` | 2 SQL SELECTs, 6 rows returned | Each list passes its limit; the whole operation still asks for more work. |

`run.cjs` prints eight PASS lines and checks the actual data and statement counts. Counts exclude schema creation and seed inserts. These are counts for this small implementation, not universal GraphQL performance numbers. No wall-clock speedup or network-round-trip result is claimed.

## Change one thing

1. Change the naive query to `first: 2`. Predict **3 SELECTs**: one posts query and two author queries. The batched plan still uses 2 here. Selecting only `title` keeps 1 SELECT.
2. Remove the key-to-row map in `batchAuthors` and pair SQL rows with callers by array position. The result can break: callers ask for keys `2, 1, 2`, while SQL returns distinct rows. Repeated key 2 needs the same author's value in both positions. Correct batching maps results back by key.
3. Change `email: String` to `email: String!`. The denied email now makes its containing author null, because author is nullable at the root. Observe the changed result and error path. Define what the client should display for partial failure.
4. Add a third alias to the last query. Each `first: 3` still passes. Add an operation-wide budget as a separate exercise. A complete budget must account for aliases, fragments, list fan-out and resolver cost, alongside timeouts and concurrency. A regex over query text is not a reliable analyzer.

Worked interpretation: GraphQL can reduce client coordination for related data, but the resolver plan still determines backend work. REST-style APIs can also expose field selection or a composed response. Choose the interface using client needs, cache policy, query budget and team tooling. Keep response size, client request count, SQL statement count and elapsed latency as separate measurements.

`batchAuthors` is a deliberately small queue for the exercise, not production DataLoader. It is recreated for every execution and only groups calls queued before its microtask dispatch. Production [DataLoader](https://github.com/graphql/dataloader) has defined batching, ordering and per-request cache behavior. JOINs or explicit prefetch can be valid alternatives.

The example passes an already-verified `viewerId` into execution. An HTTP implementation must authenticate identity before building that context and enforce the appropriate domain permissions. Never trust a client-supplied user-ID header. The email rule is a teaching policy, not a complete authorization system.

References: [schema](https://graphql.org/learn/schema/), [performance and query GET caching](https://graphql.org/learn/performance/), [authorization](https://graphql.org/learn/authorization/), [demand control](https://graphql.org/learn/security/). [Source visual review](../../../research/system-design-school/reviews/htQlfMV0Dys/ANALYSIS.md). App entry: `index.html#level=filtering` from the app root.
