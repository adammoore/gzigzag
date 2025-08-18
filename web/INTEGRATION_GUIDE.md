# 📦 Integrating Phase 4C into Your Git Repository

## Step 1: Run the Setup Script

First, save the `setup-phase4c.sh` script and run it from your repository:

```bash
cd /Users/adamvialsmoore/Workspace/gzigzag
chmod +x setup-phase4c.sh
./setup-phase4c.sh
```

This creates the directory structure and configuration files.

## Step 2: Create Server Source Files

Navigate to the server directory and create the source files:

```bash
cd web/packages/server/src
```

### Create Main Server File

**File: `server.ts`**
```typescript
// Copy the complete server.ts content from the "Main Server" artifact
```

### Create Database Modules

**File: `database/postgres.ts`**
```typescript
// Copy the complete postgres.ts content from the "PostgreSQL Database Module" artifact
```

**File: `database/neo4j.ts`**
```typescript
// Copy the complete neo4j.ts content from the "Neo4j Database Module" artifact
```

**File: `database/redis.ts`**
```typescript
// Copy the complete redis.ts content from the "Redis Cache Module" artifact
```

### Create Route Files

**File: `routes/auth.ts`**
```typescript
// Copy the complete auth.ts content from the "Authentication Routes" artifact
```

**File: `routes/spaces.ts`**
```typescript
// Copy the complete spaces.ts content from the "Spaces Routes" artifact
```

**File: `routes/cells.ts`**
```typescript
// Copy the complete cells.ts content from the "Cells Routes" artifact
```

**File: `routes/connections.ts`**
```typescript
// Copy the complete connections.ts content from the "Connections Routes" artifact
```

**File: `routes/files.ts`**
```typescript
// Copy the complete files.ts content from the "File Import/Export Routes" artifact
```

### Create Middleware

**File: `middleware/auth.ts`**
```typescript
// Copy the complete auth.ts content from the "Authentication Middleware" artifact
```

**File: `middleware/errorHandler.ts`**
```typescript
// Copy the complete errorHandler.ts content from the "Error Handler Middleware" artifact
```

### Create Utilities

**File: `utils/logger.ts`**
```typescript
// Copy the complete logger.ts content from the "Logger Utility" artifact
```

### Create WebSocket Handler

**File: `websocket/handler.ts`**
```typescript
// Copy the complete handler.ts content from the "WebSocket Handler" artifact
```

### Create Migration Script

**File: `database/migrate.ts`**
```typescript
// Copy the complete migrate.ts content from the "Database Migration Script" artifact
```

## Step 3: Create Additional Scripts

In the `web` directory, create these scripts:

**File: `start.sh`**
```bash
# Copy the complete start.sh content from the "Production Startup Script" artifact
```

**File: `monitor.sh`**
```bash
# Copy the complete monitor.sh content from the "Health Check Monitoring Script" artifact
```

Make them executable:
```bash
chmod +x start.sh monitor.sh
```

## Step 4: Update Git

Now let's commit all these changes to your git repository:

```bash
cd /Users/adamvialsmoore/Workspace/gzigzag

# Check current branch
git branch

# Create a new branch for Phase 4C (optional but recommended)
git checkout -b phase-4c-cloud-deployment

# Add all new files
git add web/packages/server/
git add web/render.yaml
git add web/docker-compose.yml
git add web/Dockerfile
git add web/.env.example
git add web/deploy.sh
git add web/start.sh
git add web/monitor.sh
git add web/package.json
git add web/PHASE_4C_README.md

# Commit the changes
git commit -m "feat: Phase 4C - Production cloud deployment with PostgreSQL and Neo4j

- Add Node.js/Express API server with full CRUD operations
- Implement PostgreSQL for structured data storage
- Add Neo4j for graph relationships and dimensions
- Implement Redis caching layer
- Add WebSocket server for real-time collaboration
- Create authentication system with JWT
- Add rate limiting and security middleware
- Implement file import/export for GZigZag compatibility
- Add Docker containerization for local development
- Configure Render.com deployment with render.yaml
- Add health monitoring and deployment scripts
- Create comprehensive database migration system

This completes the cloud deployment phase with scalable, persistent storage
and real-time collaboration features."

# Push to remote (if you want to deploy)
git push origin phase-4c-cloud-deployment
```

## Step 5: Install and Test

```bash
cd web

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your database credentials

# Start Docker containers (for local development)
docker-compose up -d

# Wait for services to be ready
sleep 10

# Run database migrations
npm run migrate

# Start development servers
npm run dev
```

## Step 6: Verify Installation

Check that everything is working:

```bash
# Check API health
curl http://localhost:3001/health

# Check Docker containers
docker ps

# Check logs
docker-compose logs
```

## File Mapping Reference

Here's where each artifact should be saved:

| Artifact | File Path |
|----------|-----------|
| Main Server | `web/packages/server/src/server.ts` |
| PostgreSQL Module | `web/packages/server/src/database/postgres.ts` |
| Neo4j Module | `web/packages/server/src/database/neo4j.ts` |
| Redis Module | `web/packages/server/src/database/redis.ts` |
| Auth Routes | `web/packages/server/src/routes/auth.ts` |
| Spaces Routes | `web/packages/server/src/routes/spaces.ts` |
| Cells Routes | `web/packages/server/src/routes/cells.ts` |
| Connections Routes | `web/packages/server/src/routes/connections.ts` |
| Files Routes | `web/packages/server/src/routes/files.ts` |
| Auth Middleware | `web/packages/server/src/middleware/auth.ts` |
| Error Handler | `web/packages/server/src/middleware/errorHandler.ts` |
| Logger | `web/packages/server/src/utils/logger.ts` |
| WebSocket Handler | `web/packages/server/src/websocket/handler.ts` |
| Migration Script | `web/packages/server/src/database/migrate.ts` |

## Troubleshooting

If you encounter issues:

1. **Dependencies not installing**: Clear node_modules and package-lock.json, then reinstall
2. **Docker issues**: Make sure Docker Desktop is running
3. **Port conflicts**: Check if ports 3000, 3001, 5432, 7474, 7687, 6379 are available
4. **TypeScript errors**: Ensure all imports are correct and types are installed

## Next Steps

After successful integration:

1. **Set up Neo4j AuraDB** for production graph database
2. **Configure Render.com** for deployment
3. **Run deployment script**: `./deploy.sh`
4. **Set up monitoring**: Use `monitor.sh` for health checks

## Summary

You've now integrated Phase 4C, which adds:
- ✅ Complete backend API server
- ✅ Multi-database architecture
- ✅ Real-time collaboration
- ✅ Production deployment configuration
- ✅ Security and monitoring

Your ZigZag web application is now ready for cloud deployment!