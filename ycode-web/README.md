# YC Web Frontend

A modern React frontend application built with Vite, TypeScript, React Router, and Tailwind CSS.

## Features

- **Authentication System**: Login/register with email/password and Google OAuth integration
- **Protected Routes**: Route protection with JWT token management
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **State Management**: React Context API for authentication state
- **API Integration**: RESTful API client with automatic token refresh
- **Testing**: Component and integration tests with Vitest and React Testing Library
- **TypeScript**: Full TypeScript support for type safety

## Tech Stack

- **React 18+** - UI library
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **React Router v6** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Vitest** - Testing framework
- **React Testing Library** - Component testing utilities

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Update the `.env` file with your backend API URL:
```
BACKEND_API_BASE_URL=http://localhost:8000/api
```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building

Build for production:
```bash
npm run build
```

### Testing

Run tests:
```bash
npm run test
```

Run tests in watch mode:
```bash
npm run test:watch
```

### Linting

Run ESLint:
```bash
npm run lint
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── __tests__/      # Component tests
│   ├── LoadingSpinner.tsx
│   ├── Navigation.tsx
│   └── ProtectedRoute.tsx
├── contexts/           # React contexts
│   ├── __tests__/     # Context tests
│   └── AuthContext.tsx
├── pages/             # Page components
│   ├── __tests__/    # Page tests
│   ├── Dashboard.tsx
│   ├── Landing.tsx
│   ├── Login.tsx
│   ├── NotFound.tsx
│   ├── Profile.tsx
│   └── Register.tsx
├── services/          # API and external services
│   └── api.ts
├── test/             # Test configuration
│   └── setup.ts
├── App.tsx           # Main app component
└── main.tsx         # App entry point
```

## API Integration

The frontend communicates with a Django REST Framework backend. The API client (`src/services/api.ts`) handles:

- JWT token management
- Automatic token refresh
- Error handling
- Request/response interceptors

## Authentication Flow

1. User logs in with email/password or Google OAuth
2. Backend returns JWT access and refresh tokens
3. Tokens are stored in localStorage
4. API client automatically includes tokens in requests
5. Expired tokens are automatically refreshed
6. Protected routes redirect to login if not authenticated

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests once
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint

## Environment Variables

- `BACKEND_API_BASE_URL` - Backend API base URL (default: http://localhost:8000/api)