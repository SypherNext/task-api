# Task API

The Task API is a JSON HTTP API built with Node.js, Express 5 and PostgreSQL 18. Users register and log in, then create, list, page through, filter, update and delete their own tasks. It has five SQL migrations, request validation with zod, one error format (problem details), keyset pagination, argon2id passwords with revocable tokens, rate limits, idempotency keys, optimistic locking with `ETag` and `If-Match`, structured JSON logs, 16 automated tests, an end-to-end smoke test and interactive docs at `/docs`. This repository is the companion code for the Sypher course "Building REST APIs with Node.js": the root folder is the finished app from the capstone lesson, and `steps/` holds the app as it stands at the end of each lesson.

## Set up your computer

You need three tools: Git, Node.js 24 LTS and Docker. The commands below are written for a bash shell (macOS, Linux, or Git Bash on Windows). In Windows PowerShell they work the same, except that you put each multi-line `docker run` command on one line without the trailing `\`.

### Git

| System | Install |
|---|---|
| Windows | `winget install --id Git.Git -e` (or the installer from https://git-scm.com/downloads) |
| macOS | `brew install git` (or run `xcode-select --install` for Apple's copy) |
| Ubuntu, Debian | `sudo apt update && sudo apt install git` |
| Fedora | `sudo dnf install git` |

Check it:

```bash
git --version
```

It prints something like `git version 2.51.0`. Any 2.x version works.

### Node.js 24 LTS

| System | Install |
|---|---|
| Windows | `winget install OpenJS.NodeJS.LTS` (or the LTS installer from https://nodejs.org/en/download) |
| macOS | `brew install node@24`, then follow the line brew prints to put it on your `PATH` |
| Linux | the Node.js download page has commands for your distribution; Ubuntu's own `apt` package is usually too old |

A version manager is a good alternative on any system, because it lets you switch Node versions per project:

- nvm (macOS, Linux): install it from https://github.com/nvm-sh/nvm, then `nvm install 24` and `nvm use 24`.
- fnm (Windows, macOS, Linux): `winget install Schniz.fnm` or `brew install fnm`, then `fnm install 24` and `fnm use 24`.

Check it:

```bash
node --version
npm --version
```

`node --version` prints `v24.x.x` (for example `v24.19.0`) and `npm --version` prints `11.x.x`. The app needs Node 24 or newer because its scripts use `node --env-file`.

### Docker

PostgreSQL runs in a Docker container, so you do not install PostgreSQL itself.

| System | Install |
|---|---|
| Windows | `winget install -e --id Docker.DockerDesktop` (or Docker Desktop from https://docs.docker.com/desktop/). It needs WSL 2: run `wsl --install` first on a fresh machine. Start Docker Desktop from the Start menu once it is installed. |
| macOS | `brew install --cask docker` (or Docker Desktop from https://docs.docker.com/desktop/), then start Docker from Applications |
| Linux | Docker Engine: `curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh`, then `sudo usermod -aG docker $USER` and open a new shell. The guide at https://docs.docker.com/engine/install/ has the `apt` and `dnf` repository steps. |

Check it:

```bash
docker version --format "{{.Server.Version}}"
```

It prints the engine version, for example `28.0.1`. If it prints an error about connecting to the Docker daemon instead, Docker is installed but not running: start Docker Desktop (or `sudo systemctl start docker` on Linux) and try again.

### Get the code

Clone the repository (use the address of the repository you were given) and go into the folder:

```bash
git clone <repository-url> task-api
cd task-api
```

Or download it as a ZIP from the repository's page, unzip it, and open a terminal in the unzipped folder. Every command below runs from this folder.

## Run the app

1. Install the dependencies:

   ```bash
   npm install
   ```

   npm may print a warning that `argon2` has an install script that is "not yet covered by allowScripts". You can ignore it: argon2 ships ready-built binaries for Windows, macOS and Linux.

2. Create your settings files from the examples:

   ```bash
   cp .env.example .env
   cp .env.test.example .env.test
   ```

   Both use the password `change-me`, which only has to match the one you give PostgreSQL in the next step. If you choose another password, change it in both files.

3. Start PostgreSQL 18 in Docker, listening on port 18100 of your own machine only:

   ```bash
   docker volume create rst-pgdata
   docker run -d --name rst-pg \
     -e POSTGRES_USER=tasks \
     -e POSTGRES_PASSWORD=change-me \
     -e POSTGRES_DB=tasks \
     -p 127.0.0.1:18100:5432 \
     -v rst-pgdata:/var/lib/postgresql \
     postgres:18
   ```

   Wait a few seconds, then check that it accepts connections:

   ```bash
   docker exec rst-pg pg_isready -U tasks -d tasks
   ```

   Expected output: `/var/run/postgresql:5432 - accepting connections`. If it says `no response`, wait two seconds and run it again.

4. Create the tables:

   ```bash
   npm run migrate
   ```

   Expected output (after the two `>` lines npm prints):

   ```text
   applied 001_create_tasks.sql
   applied 002_tasks_list_index.sql
   applied 003_users_and_sessions.sql
   applied 004_task_owners.sql
   applied 005_versions_and_idempotency.sql
   schema is up to date (5 migrations)
   ```

5. Start the API:

   ```bash
   npm start
   ```

   It logs one JSON line and keeps running:

   ```text
   {"level":30,"time":"...","service":"task-api","port":18180,"msg":"task-api listening"}
   ```

6. In a second terminal, in the same folder, run the smoke test. It walks a whole user journey against the running server: register, log in, create a task with an idempotency key, update it with `If-Match`, delete it, log out.

   ```bash
   npm run smoke
   ```

   Every line starts with `ok`, and the last line is:

   ```text
   smoke test passed
   ```

7. Open http://localhost:18180/docs in a browser to see the Swagger UI. To try the task routes there, run **POST /auth/register** and **POST /auth/login**, copy the `token` from the login response, select **Authorize** and paste it.

Stop the API with Ctrl+C. To stop PostgreSQL, run `docker stop rst-pg`; `docker start rst-pg` starts it again with your data.

## Running the tests

The tests use their own database, `tasks_test`, so they never touch your development data. Create it once:

```bash
docker exec rst-pg psql -U tasks -d tasks -c "CREATE DATABASE tasks_test;"
```

Then run the tests (the API does not need to be running):

```bash
npm test
```

The summary at the end shows `ℹ tests 16`, `ℹ pass 16` and `ℹ fail 0`. The tests migrate `tasks_test` themselves and empty it before each test.

To check that the generated OpenAPI document is valid:

```bash
npm run check:openapi
```

Expected output: `OpenAPI 3.1.1 document is valid: 6 paths, 9 operations, 5 schemas`.

## Project layout

```text
.env.example                 settings for npm start and npm run migrate (copy to .env)
.env.test.example            settings for npm test (copy to .env.test)
package.json                 scripts: start, dev, migrate, test, check:openapi, smoke
migrations/                  001 to 005: tasks, list index, users and sessions, owners, versions and idempotency keys
scripts/migrate.js           applies the migrations in order, one transaction each
scripts/smoke.js             end-to-end check against a running server
scripts/check-openapi.js     validates the OpenAPI document and prints a summary
src/server.js                loads config, checks the database, listens, shuts down cleanly on SIGINT and SIGTERM
src/app.js                   builds the Express app: middleware order, health checks, docs, routers, error handlers
src/config.js                reads and checks the environment once, at startup
src/db.js                    the pg connection pool
src/routes/tasks.js          /tasks routes: list, create, read, update with If-Match, delete
src/routes/auth.js           /auth routes: register, login, logout, me
src/repo/                    all SQL: tasks, users, sessions (always parameterised, always scoped to the owner)
src/schemas.js               zod schemas for every request
src/validate.js              validation middleware
src/errors.js                problem details (RFC 9457) and the error handler
src/auth.js                  bearer token middleware
src/passwords.js             argon2id hashing
src/cursor.js                opaque keyset pagination cursors
src/security.js              rate limits
src/idempotency.js           Idempotency-Key handling for POST /tasks
src/logger.js                pino JSON logs with request ids and redaction
src/openapi.js               the OpenAPI 3.1 document, generated from the zod schemas
test/                        node:test and supertest against a real PostgreSQL database
steps/                       the app at the end of each lesson (see the lesson map)
```

## Lesson map

Each folder in `steps/` is a complete copy of the app at the end of that lesson, so you can compare your code with it or start from it. To run one, go into its folder and follow the same steps as above: `npm install`, copy `.env.example` to `.env` (lessons 7 onwards) and `.env.test.example` to `.env.test` (lessons 14 onwards), `npm run migrate`, `npm start`. The folders all use the same database, so if you jump back to an earlier step, start from an empty one: `docker exec rst-pg psql -U tasks -d postgres -c "DROP DATABASE IF EXISTS tasks WITH (FORCE)" -c "CREATE DATABASE tasks"`. Lesson 1 (setup) only installs tools and lesson 17 (the capstone) is the root folder.

| Step folder | Lesson | What changes |
|---|---|---|
| `steps/02-how-http-works` | How HTTP Works | `echo.js`, a throwaway `node:http` server that prints raw requests (not part of the API) |
| `steps/03-first-express-server` | Your First Express Server | `package.json` and `src/server.js`: Express 5, a request logger middleware, first JSON routes (`/`, `/hello/:name`, `/echo`); `wildcard-demo.js` |
| `steps/04-routing-and-resource-design` | Routing and Resource Design | `src/app.js` and `src/routes/tasks.js`: the `/tasks` resource with an in-memory store, a JSON 404 |
| `steps/05-request-validation` | Request Validation | `src/schemas.js` and `src/validate.js`: zod 4 validation of bodies, params and queries |
| `steps/06-error-handling` | Error Handling | `src/errors.js`: problem details for every error, a 10 KB body limit; `big.json` to test it |
| `steps/07-connecting-to-postgresql` | Connecting to PostgreSQL | `src/config.js`, `src/db.js`, `src/repo/tasks.js`, the migration runner and migration 001; `/healthz` and `/readyz`, graceful shutdown |
| `steps/08-crud-with-sql` | CRUD with SQL | full create, read, update, delete in SQL; `injection-demo.js` shows SQL injection and how parameters stop it |
| `steps/09-pagination-filtering-and-sorting` | Pagination, Filtering and Sorting | `src/cursor.js`, migration 002: keyset pagination, filters, sort; `seed.js`, `walk-pages.js` and two demos |
| `steps/10-authentication` | Authentication | migration 003, users and sessions, argon2id passwords, bearer tokens, `/auth` routes; `jwt-demo.js` |
| `steps/11-authorization-and-ownership` | Authorization and Ownership | migration 004: every task has an owner, and every task query is scoped to it |
| `steps/12-rate-limiting-and-security-headers` | Rate Limiting and Security Headers | `src/security.js`: rate limits, helmet, CORS, `TRUST_PROXY` |
| `steps/13-idempotency-and-concurrency` | Idempotency and Concurrency | migration 005, `src/idempotency.js`: Idempotency-Key on POST, `ETag` and `If-Match` on PATCH; `race.js` |
| `steps/14-testing-your-api` | Testing Your API | `test/`: 12 tests with node:test and supertest against `tasks_test` |
| `steps/15-logging-and-observability` | Logging and Observability | `src/logger.js`: pino JSON logs, request ids, redaction; `redact-demo.js` |
| `steps/16-documenting-with-openapi-and-swagger-ui` | Documenting with OpenAPI and Swagger UI | `src/openapi.js`, Swagger UI at `/docs`, `scripts/check-openapi.js`, the drift test (16 tests) |
| root folder | Capstone: Ship the Task API | `.env.example`, `scripts/smoke.js`, the `engines` field in `package.json` |

The demo scripts in the steps (`pool-demo.js`, `seed.js`, `race.js` and the others) are the ones the lessons run. Some expect the API to be running on port 18180.

## Troubleshooting

- **`docker: ... Cannot connect to the Docker daemon` or `error during connect`.** Docker is not running. Start Docker Desktop (or `sudo systemctl start docker` on Linux), wait until it says it is running, and run the command again.
- **`Bind for 127.0.0.1:18100 failed: port is already allocated`** when you start PostgreSQL, or **`EADDRINUSE`** when you start the API. Something else already uses that port. Remove the old container (`docker rm -f rst-pg`) if it is yours, or pick another port: for PostgreSQL change `-p 127.0.0.1:18100:5432` and the `18100` in `.env` and `.env.test`; for the API change `PORT` in `.env` and run the smoke test with `BASE_URL=http://localhost:<port> npm run smoke`.
- **`password authentication failed for user "tasks"`.** The password in `.env` does not match the database. PostgreSQL only reads `POSTGRES_PASSWORD` the first time it starts with an empty volume, so an old `rst-pgdata` volume keeps its old password. Either put that password in `.env` and `.env.test`, or start over: `docker rm -f rst-pg`, `docker volume rm rst-pgdata`, then step 3 again.
- **`npm test` fails with `database "tasks_test" does not exist`.** Create it with the `CREATE DATABASE tasks_test` command under "Running the tests".
- **`npm run smoke` fails with `fetch failed` or `ECONNREFUSED`.** The API is not running. Start it with `npm start` in another terminal first.

When you are done with the course, remove the database and its data with `docker rm -f rst-pg` and `docker volume rm rst-pgdata`.

## License

Copyright (C) 2026 SypherNext

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0). You may
use, study and change it. If you share a modified version, or run one as a website or service
that other people use, you must make your full modified source code available under the same
license. See [LICENSE](LICENSE) for the full terms.
