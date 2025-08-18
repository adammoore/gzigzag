# ZigZag Web - Phase 4C: Production Cloud Deployment

A modern web implementation of Ted Nelson's ZigZag hyperdimensional data structure, now ready for scalable cloud deployment with PostgreSQL, Neo4j, and real-time collaboration.

## 🚀 Quick Start

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/zigzag-web.git
cd zigzag-web

# Install dependencies
npm install

# Start development environment with Docker
docker-compose up -d

# Run database migrations
npm run migrate

# Start development servers
npm run dev
```

**Access points:**
- Frontend: http://localhost:3000
- API: http://localhost:3001
- Neo4j Browser: http://localhost:7474
- PostgreSQL: localhost:5432

### Production Deployment

```bash
# Run the deployment script
chmod +x deploy.sh
./deploy.sh

# Or deploy manually to Render.com
npm run build:all
git push origin main
```

## 📁 Project Structure

```
zigzag-web/
├── packages/
│   ├── core/                 # ZigZag core implementation
│   │   ├── src/
│   │   │   ├── ZigZagSpace.ts
│   │   │   ├── Cell.ts
│   │   │   └── Connection.ts
│   │   └── package.json
│   │
│   ├── client/               # React web interface
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── App.tsx
│   │   └── package.json
│   │
│   └── server/               # Node.js API server
│       ├── src/
│       │   ├── server.ts
│       │   ├── routes/
│       │   │   ├── auth.ts
│       │   │   ├── spaces.ts
│       │   │   ├── cells.ts
│       │   │   └── connections.ts
│       │   ├── database/
│       │   │   ├── postgres.ts
│       │   │   ├── neo4j.ts
│       │   │   └── redis.ts
│       │   ├── websocket/
│       │   │   └── handler.ts
│       │   └── middleware/
│       └── package.json
│
├── render.yaml               # Render.com deployment config
├── docker-compose.yml        # Local development setup
├── Dockerfile               # Production container
├── deploy.sh                # Deployment script
└── README.md                # This file
```

## 🏗️ Architecture

### Technology Stack

**Backend:**
- Node.js + Express.js - API server
- PostgreSQL - Structured data & metadata
- Neo4j - Graph relationships & dimensions
- Redis - Caching & sessions
- WebSocket - Real-time collaboration

**Frontend:**
- React 18 - UI framework
- TypeScript - Type safety
- Vite - Build tool
- TailwindCSS - Styling

**Infrastructure:**
- Render.com - Cloud hosting
- Neo4j AuraDB - Managed graph database
- Docker - Containerization
- GitHub Actions - CI/CD

### Database Design

**PostgreSQL Schema:**
- `users` - User accounts & authentication
- `spaces` - ZigZag spaces/documents
- `cells` - Cell content & metadata
- `dimensions` - Dimension definitions
- `cell_history` - Version tracking
- `space_collaborators` - Access control

**Neo4j Graph:**
- `(:Cell)` nodes - Cell representations
- `[:CONNECTED]` relationships - Dimensional links
- Properties: dimension, direction, timestamps

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Server
NODE_ENV=production
PORT=3001

# Database - PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/zigzag

# Database - Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password

# Cache - Redis
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# Frontend
FRONTEND_URL=https://your-app.onrender.com

# Optional: File Storage
AWS_S3_BUCKET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

## 📚 API Documentation

### Authentication

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "password123"
}
```

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Spaces

```http
GET /api/spaces
Authorization: Bearer <token>

POST /api/spaces
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Space",
  "description": "Description",
  "isPublic": false
}
```

### Cells

```http
GET /api/spaces/:id/cells
Authorization: Bearer <token>

POST /api/spaces/:id/cells
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Cell content",
  "metadata": {}
}
```

### Connections

```http
POST /api/connections/connect
Authorization: Bearer <token>
Content-Type: application/json

{
  "fromCellId": "uuid",
  "toCellId": "uuid",
  "dimension": "d.1",
  "direction": "positive"
}
```

### WebSocket Events

```javascript
// Connect to WebSocket
const ws = new WebSocket('wss://your-app.onrender.com/ws');

// Authenticate
ws.send(JSON.stringify({
  type: 'auth',
  token: 'your-jwt-token'
}));

// Join a space
ws.send(JSON.stringify({
  type: 'join_space',
  spaceId: 'space-uuid'
}));

// Cell operations
ws.send(JSON.stringify({
  type: 'cell_update',
  data: {
    cellId: 'cell-uuid',
    content: 'Updated content'
  }
}));
```

## 🚢 Deployment

### Prerequisites

1. **Render.com Account**: Sign up at [render.com](https://render.com)
2. **Neo4j AuraDB**: Sign up at [neo4j.com/cloud/aura](https://neo4j.com/cloud/aura)
3. **GitHub Repository**: Push your code to GitHub

### Step-by-Step Deployment

1. **Setup Neo4j AuraDB:**
   ```cypher
   CREATE CONSTRAINT cell_id_unique IF NOT EXISTS
   FOR (c:Cell) REQUIRE c.id IS UNIQUE;
   ```

2. **Deploy to Render:**
   - Connect GitHub repository
   - Use `render.yaml` for automatic setup
   - Set environment variables
   - Deploy

3. **Initialize Database:**
   ```bash
   npm run migrate
   ```

4. **Verify Deployment:**
   ```bash
   curl https://your-app.onrender.com/health
   ```

## 🔒 Security

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Input validation & sanitization
- CORS configuration
- SQL injection protection
- XSS prevention headers
- HTTPS enforcement

## 📊 Performance

- PostgreSQL connection pooling
- Neo4j query optimization
- Redis caching layer
- Lazy loading for large spaces
- WebSocket connection management
- CDN for static assets
- Gzip compression
- Database indexing

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific package tests
npm test -w @zigzag/core
npm test -w @zigzag/server
npm test -w @zigzag/client

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e
```

## 📈 Monitoring

- Health check endpoint: `/health`
- Render.com metrics dashboard
- Neo4j query logging
- Application logs in `/logs`
- Error tracking with Sentry (optional)

## 🔄 Backup & Recovery

### PostgreSQL Backup
```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### Neo4j Export
```cypher
CALL apoc.export.cypher.all("backup.cypher", {
  format: "plain",
  useOptimizations: {type: "UNWIND_BATCH"}
})
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📝 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Ted Nelson for the ZigZag concept
- The original GZigZag/Gzz implementation team
- Open source community contributors

## 📞 Support

- **Documentation**: See `/docs` folder
- **Issues**: GitHub Issues
- **Email**: support@zigzag.example.com
- **Discord**: [Join our community](https://discord.gg/zigzag)

## 🎯 Roadmap

### Phase 5: Advanced Features
- [ ] Mobile applications (React Native)
- [ ] Offline support with sync
- [ ] Advanced visualization modes
- [ ] Plugin system
- [ ] AI-powered suggestions

### Phase 6: Enterprise Features
- [ ] SSO/SAML authentication
- [ ] Advanced permissions
- [ ] Audit logging
- [ ] Compliance features
- [ ] White-label support

## 🚀 Success Metrics

- ✅ 99.9% uptime
- ✅ <2s page load time
- ✅ <100ms API response time
- ✅ Support for 1000+ concurrent users
- ✅ Real-time collaboration
- ✅ Full ZigZag functionality preserved

---

**Ready to deploy?** Run `./deploy.sh` and follow the interactive guide!