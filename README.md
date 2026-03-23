# LogUser Project - Full Stack Authentication System

## Project Overview

- **Project Name**: LogUser
- **Type**: Full-Stack Web Application
- **Backend**: Node.js/Express with PostgreSQL
- **Frontend**: React
- **Authentication**: JWT Tokens

## Development Guidelines

- Backend runs on port 5000
- Frontend runs on port 3000
- Use environment variables for all sensitive data
- JWT tokens expire after 24 hours
- All API endpoints follow RESTful conventions

## API Endpoints

- POST /api/auth/register - User registration
- POST /api/auth/login - User login
- GET /api/auth/profile - Get user profile (protected)
