# Stash

A file uploader.

📓 [Project Spec](https://www.theodinproject.com/lessons/nodejs-file-uploader)

🚄 [Live Deployment](https://stash.up.railway.app)

![Stash filesystem user interface.](https://github.com/endulum/stash/blob/main/screenshot.png)

### Installation

This is a Node.js project, so you will need Node installed.

Navigate to the root directory where you'd like this project to be, and clone this repo:

```sh
git clone https://github.com/endulum/stash
```

Navigate to the root of the newly cloned `/stash`, and install all required packages:

```sh
npm install
```

#### Docker

This project is not totally Dockerized, but uses Docker for some containers of convenience. You will need Docker Compose installed to be able to run the Docker-related commands of this project.

### Integrations and Environment

This project uses three env files: `test`, `development`, and `production`.  Stash supplies a file `.env.example` with the variables necessary for the project to run. Copy this file to  the three envs described. A handy script for this is provided for you, `npm run envinit`.

As you can find in `.env.example`, this project uses the following integrations:

- PostgreSQL, as a database to store account and filesystem information. Needs `DATABASE_URL`.
- Supabase, to store files and media. Needs `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`.
- GitHub App, to authorize accounts through GitHub. Needs `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.
- Redis, to cache file buffers for preview. Needs `REDIS_URL`.

#### PostgreSQL

You need an existing PostgreSQL database somewhere and its connection URI. 

Note that an independent Postgres database for testing is provided by Docker in this project, so for your `.env.test`, you can have the URI point to that database:

```env
DATABASE_URL=postgresql://prisma:prisma@localhost:5433/tests
```

The script `npm run test` handles bringing up the container, applying any migrations present, and running the tests.

#### Supabase

You need a Supabase account with an active project. Stash utilizes the Supabase Storage filesystem, and needs your project URL and `service_role` key. You can find both under the **Data API** tab of your project settings. Stash expects and utilizes two Supabase buckets, `stash_development` and `stash_production`. 

Note that the Supabase module of this project is not utilized in the `test` environment.

#### GitHub App

Stash needs the client ID and secret of an active GitHub app. 

Note that GitHub authentication is not utilized in the `test` environment.

#### Redis

Stash needs the URI of a Redis database. This project provides a Docker image for a Redis cache for your convenience, so for your `.env.development`, you can have the URI point to that cache:

```env
REDIS_URL=redis://localhost:6379
```

Note that Redis caching is not utilized in the `test` environment.

#### Other

Stash needs to know its own `DEPLOYMENT_URL` to determine whether to use secure cookies, to provide file previews, and to create a callback URL for GitHub authentication.

Stash needs a `SESSION_SECRET` to sign stored sessions with. It can be any string.

### Starter Data

Stash supplies a `reset` script that performs the following:

- Connects to your Supabase bucket and empties it.
- Truncates the `User` and `Session` Postgres tables, emptying all possible database records by cascade.
- Creates one admin account.
- Executes a script to recursively read files in `supabase/sample_files`, add them as records to the database, and upload them to Supabase.

The `sample_files` directory contains some text and media, and can be freely edited to contain any files you wish.
