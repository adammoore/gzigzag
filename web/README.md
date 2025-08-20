# ZigZag Web - Modern Implementation

## Overview
Modern web implementation of Ted Nelson's ZigZag hyperdimensional data structure with real-time collaboration.

## Technology Stack
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **Backend**: Node.js, Express, Socket.io
- **Databases**: PostgreSQL (primary), Neo4j (graph), Redis (cache)
- **Deployment**: Render.com, Docker

## Local Development

### Prerequisites
- Node.js 18+
- Docker Desktop
- Git

### Quick Start
```bash
# Clone repository
git clone https://github.com/adammoore/gzigzag.git
cd gzigzag/web

# Install dependencies
npm install

# Start Docker containers
docker compose up -d

# Run database migrations
npm run migrate

# Start development servers
npm run dev
```

### Available Scripts
- `npm run dev` - Start both frontend and backend in dev mode
- `npm run build:all` - Build all packages for production
- `npm run migrate` - Run database migrations
- `npm run docker:up` - Start Docker containers
- `npm run docker:down` - Stop Docker containers
- `npm run test` - Run all tests

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify` - Verify JWT token

### Spaces
- `GET /api/spaces` - Get user's spaces
- `POST /api/spaces` - Create new space
- `GET /api/spaces/:id` - Get space details
- `PUT /api/spaces/:id` - Update space
- `DELETE /api/spaces/:id` - Delete space

### Cells
- `GET /api/spaces/:spaceId/cells` - Get cells in space
- `POST /api/spaces/:spaceId/cells` - Create new cell
- `PUT /api/cells/:id` - Update cell
- `DELETE /api/cells/:id` - Delete cell

### Connections
- `GET /api/spaces/:spaceId/connections` - Get connections
- `POST /api/spaces/:spaceId/connections` - Create connection
- `DELETE /api/connections/:id` - Delete connection

## WebSocket Events

### Client -> Server
- `join:space` - Join a space for real-time updates
- `leave:space` - Leave a space
- `cell:update` - Update cell content
- `cell:move` - Move cell position
- `connection:create` - Create new connection
- `connection:delete` - Delete connection

### Server -> Client
- `cell:created` - New cell created
- `cell:updated` - Cell content updated
- `cell:moved` - Cell position changed
- `cell:deleted` - Cell removed
- `connection:created` - New connection created
- `connection:deleted` - Connection removed

## Deployment

### Deploy to Render.com

1. **Create GitHub Repository**
   ```bash
   git remote add origin https://github.com/adammoore/gzigzag.git
   git push -u origin phase-4c-cloud-deployment
   ```

2. **Setup Neo4j AuraDB**
   - Create account at https://neo4j.com/cloud/aura/
   - Create new database instance
   - Save connection credentials

3. **Deploy on Render**
   - Connect GitHub repository
   - Use `render.yaml` for configuration
   - Set environment variables:
     - `JWT_SECRET` (generate secure key)
     - `NEO4J_URI` (from AuraDB)
     - `NEO4J_USER` (from AuraDB)
     - `NEO4J_PASSWORD` (from AuraDB)

4. **Post-Deployment**
   ```bash
   # Run migrations (via Render shell)
   npm run migrate
   
   # Verify deployment
   curl https://your-app.onrender.com/health
   ```

## Environment Variables

### Development (.env)
```
NODE_ENV=development
PORT=3001
CLIENT_URL=http://localhost:5173
JWT_SECRET=dev-secret-key
DB_HOST=localhost
DB_PORT=5432
DB_NAME=zigzag_db
DB_USER=zigzag_user
DB_PASSWORD=zigzag_password
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=zigzag_password
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Production (Render)
All sensitive values should be set via Render dashboard.

## Architecture

### Data Flow
1. Client makes request to Express API
2. API validates JWT token via middleware
3. Data persisted to PostgreSQL
4. Graph relationships stored in Neo4j
5. Cache updated in Redis
6. WebSocket broadcasts changes to connected clients

### Security
- JWT authentication with 7-day expiry
- Bcrypt password hashing
- CORS configuration
- Input validation
- SQL injection prevention via parameterized queries

## Testing

### Unit Tests
```bash
npm run test:core
npm run test:server
npm run test:client
```

### Integration Tests
```bash
# Start test environment
docker compose -f docker-compose.test.yml up -d

# Run integration tests
npm run test:integration
```

### Manual Testing
1. Open http://localhost:5173
2. Register new account
3. Create space
4. Add cells and connections
5. Open second browser for collaboration testing

## Troubleshooting

### Docker Issues
```bash
# Reset all containers
docker compose down -v
docker compose up -d --build

# View logs
docker compose logs -f [service]
```

### Database Issues
```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U zigzag_user -d zigzag_db

# Connect to Neo4j
# Open http://localhost:7474
# Login with neo4j/zigzag_password
```

### Build Issues
```bash
# Clean install
rm -rf node_modules package-lock.json
rm -rf packages/*/node_modules packages/*/package-lock.json
npm install
npm run build:all
```

## Contributing
1. Fork repository
2. Create feature branch
3. Make changes
4. Run tests
5. Submit pull request

## License
MIT

## Acknowledgments
Based on Ted Nelson's original ZigZag concept.
