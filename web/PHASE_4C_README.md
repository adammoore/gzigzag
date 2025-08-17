# Phase 4C: Production Cloud Deployment

This phase adds production-ready backend infrastructure with:

- Node.js/Express API server
- PostgreSQL for structured data
- Neo4j for graph relationships
- Redis for caching
- WebSocket real-time collaboration
- Docker containerization
- Render.com deployment

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start Docker services:
   ```bash
   docker-compose up -d
   ```

3. Run migrations:
   ```bash
   npm run migrate
   ```

4. Start development:
   ```bash
   npm run dev
   ```

## Deployment

1. Set up Neo4j AuraDB
2. Configure Render.com
3. Run deployment:
   ```bash
   ./deploy.sh
   ```

See DEPLOYMENT.md for detailed instructions.
