# MERN + MySQL Backend POC

A robust backend POC using MERN stack (MySQL as DB) designed to gain hands-on experience with Cursive AI code assistant. This POC integrates modern backend practices, security, and developer tooling.

## Features

- Role-based user management
- Multi-session server-side session handling
- Google OAuth SSO login
- Login and activity tracking
- API documentation with Swagger
- Unit and integration testing
- Linting and code formatting
- GitHub CI/CD pipeline
- User profile management
- Email verification and forgot password flow
- Admin dashboard metrics
- Background job handling

## Prerequisites

- Node.js (v14 or higher)
- MySQL/MariaDB
- Redis
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd poc
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=your_database_name

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Session
SESSION_SECRET=your_session_secret
```

4. Start the development server:
```bash
npm run dev
```

## API Documentation

Access the Swagger UI documentation at:
```
http://localhost:3000/api/docs
```

## Development

### Code Quality

- Linting: `npm run lint`
- Formatting: `npm run format`
- Testing: `npm test`

### Git Hooks

Pre-commit hooks are set up using Husky and lint-staged to ensure code quality.

## Project Structure

```
src/
├── config/         # Configuration files
├── controllers/    # Route controllers
├── middleware/     # Custom middleware
├── models/         # Database models
├── routes/         # Route definitions
├── services/       # Business logic
├── utils/          # Utility functions
├── jobs/           # Background jobs
├── docs/           # API documentation
└── server.js       # Application entry point
```

## Testing

Run tests using:
```bash
npm test
```

Test coverage:
```bash
npm run test:coverage
```

## License

ISC 