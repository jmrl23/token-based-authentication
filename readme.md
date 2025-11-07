# Token-Based Authentication

Provides a secure and efficient token-based authentication system using Fastify, TypeScript, and PostgreSQL.

## Requirements

- Postgres
- Redis

## Features

- **Stateless Authentication:** Implements a robust, token-based authentication system using JSON Web Tokens (JWTs), ensuring stateless and scalable sessions.

- **Secure Token Management:** Utilizes RSA key pairs for signing and verifying JWTs, providing a high level of security and ensuring that tokens cannot be tampered with.

- **User Management:** Provides endpoints for user registration and login, allowing users to create accounts and securely authenticate with the application.

- **High-Performance Backend:** Built on the [Fastify](https://www.fastify.io/) framework, a high-performance, low-overhead web framework for Node.js, and written in [TypeScript](https://www.typescriptlang.org/) for type safety and improved developer experience.

- **Relational Database:** Uses [PostgreSQL](https://www.postgresql.org/) as the database, with [Drizzle ORM](https://orm.drizzle.team/) for intuitive and type-safe database queries and schema management.

- **Caching with Redis:** Integrates with [Redis](https://redis.io/) for caching, which significantly improves performance by reducing database load and speeding up response times.

- **Interactive API Documentation:** Includes [Swagger](https://swagger.io/) for generating interactive API documentation, making it easy for developers to explore and test the available endpoints.

- **Enhanced Security:** The application is protected against common web vulnerabilities with the following security measures:
  - `@fastify/helmet`: Adds important security headers to responses to protect against attacks like cross-site scripting (XSS) and click-jacking.
  - `@fastify/rate-limit`: Implements rate limiting to protect against brute-force attacks and prevent abuse of the API.
  - `@fastify/cors`: Manages Cross-Origin Resource Sharing (CORS) to control which domains can access the API.

## Getting Started

1. Create database

   ```bash
   psql -U <user> -c "CREATE DATABASE <database_name>;"
   ```

1. Generate RSA key pair

   ```bash
   # private key
   openssl genrsa -out jwt 2048

   # public key
   openssl rsa -in jwt -pubout -outform PEM -out jwt.pub
   ```

1. Put the generated RSA key pair inside the [auth folder](./auth/) (both public and private)

1. Supply the neccessary environment variables. [Reference](https://github.com/jmrl23/token-based-authentication/blob/main/.env.example)

1. Install dependencies

   ```bash
   yarn install
   ```

1. Setup drizzle

   ```bash
   yarn exec drizzle-kit generate
   yarn exec drizzle-kit migrate
   ```

1. Build and start
   ```bash
    yarn run build
    yarn run start
   ```

---

## Diagram

![](./diagram.svg)

### Notes

- In some cases, you might want to remove the `/auth/access` route for full [RTR](https://www.descope.com/blog/post/refresh-token-rotation) approach.
- Swagger is only enabled when server is running on development mode and can be visited at [/docs](http://127.0.0.1:3001/docs#/) route.

---

### Extras

- [**fastify-template**](https://github.com/jmrl23/fastify-template) - Template used, visit to learn more about project architecture.
