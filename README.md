# StudentHire

StudentHire connects university students with job and internship opportunities.

## Technology

- React, Vite and Bootstrap
- Node.js and Express
- MySQL and Prisma
- JWT authentication

## Project structure

- `frontend/`: React application
- `backend/`: Express API and database configuration
- `shared/`: shared application data

## Local development

Use Node.js 22.12 or later. Install dependencies with `npm install`, copy the example environment files in both applications, and configure your local MySQL connection and JWT secret.

```sh
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

The frontend runs at http://localhost:5173 and the API at http://localhost:4000.

## Checks

```sh
npm test
npm run build
```
