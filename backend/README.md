# BrandGuard AI Backend

This is the **independent backend server** for BrandGuard AI.

## Important: Backend is Separate from Frontend

- **This folder (`backend/`)**: Contains ONLY the backend Node.js server
- **Frontend**: Located at `/my-adobe-addon/` (Adobe Express Add-on)
- **Communication**: Frontend uses `fetch()` to call this backend at `http://localhost:3000`

## Structure

```
/backend/                        # Backend Server (OUTSIDE add-on)
  ├── src/
  │   ├── server.js              # Express server
  │   ├── routes/                 # API routes
  │   └── services/               # Business logic
  ├── package.json
  └── .env                        # Environment variables
```

## Setup

```bash
npm install
cp env.example .env
# Edit .env with your configuration
npm start
```

The backend will run on `http://localhost:3000`

## API Endpoints

- `GET /health` - Health check
- `POST /analyze` - Analyze design for brand compliance
- `POST /check-brand` - Validate brand configuration

## Development

### Running the Server

```bash
npm start
```

### Development Mode (with auto-reload)

```bash
npm run dev
```

## CORS Configuration

The backend enables CORS for Adobe Express origins:
- `https://localhost:5241` (development)
- `https://new.express.adobe.com` (production)

## Environment Variables

Create a `.env` file (copy from `env.example`):

```env
PORT=3000
GEMINI_API_KEY=your_key_here  # Optional
```

## Important Notes

1. **No Adobe Dependencies**: This backend has no Adobe-specific code and can be used by any client

2. **Independent Deployment**: The backend can be deployed separately from the frontend

3. **Node.js Capabilities**: Can use any Node.js APIs, databases, AI services, etc.

4. **REST API Only**: Exposes REST endpoints only - no WebSockets, no Adobe-specific protocols
