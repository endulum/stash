# Stash

A minimal implementation of a personal storage service.

[Project Spec](https://www.theodinproject.com/lessons/nodejs-file-uploader)

Navigate to the root directory where you'd like this project to be, and clone this repo:

```
git clone https://github.com/endulum/stash
```

Install all required packages:

```
npm install
```

### Environment

This project uses three env files: `test`, `development`, and `production`. The repo supplies a file `.env.example` with the variables necessary for the project to run. Copy this file to the three envs described. A handy script for this is provided for you:

```
npm run envinit
```

### Required Integrations

Taking a look at `.env.example` should give you an idea of what integrations are necessary.

**Database:** Stash uses Postgres to store account, session, and user filesystem information. `DATABASE_URL` will be your Postgres connection URI, and you'll also need `SESSION_SECRET` (it can be any string) for session storage to work.

**GitHub App:** Stash _optionally_ allows accounts to be created through GitHub authentication. You'll need a [GitHub app](https://github.com/settings/apps) of your own to fill in `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.

**Supabase:** Barring `test` env mode, Stash requires Supabase to store file data. Stash expects two Supabase buckets, `stash_development` and `stash_production`, as well as the Supabase project's service key.

**Redis:** Barring `test` env mode, Stash requires Redis to cache static file serving. For convenience, this project uses Docker to provide a Redis image, and the prefilled `REDIS_URL` value reflects the port used.

### Testing

This project uses Docker to provide an independent Postgres database for testing. For your `.env.test`, make sure the database URL points to that database:

```
DATABASE_URL=postgresql://prisma:prisma@localhost:5433/tests
```

The script `npm run test` handles bringing up the container, applying any migrations present, and running the tests.
