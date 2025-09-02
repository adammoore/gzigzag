# Neo4j Aura Integration

The GZZ system automatically syncs space structures to Neo4j Aura for graph visualization and analysis.

## Configuration

Set these environment variables in your `.env` file:

```bash
# Neo4j Aura Configuration
NEO4J_URI=neo4j+s://75b24ca2.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=XfSanlPqfDnDgQ8fPQaKlFh_bmxibrBAzVHemWuGxJI
NEO4J_DATABASE=neo4j
```

## How It Works

1. **Automatic Sync**: When a space is created or modified, it's automatically synced to Neo4j Aura
2. **Space Structure**: Each cell becomes a Neo4j node, each connection becomes a relationship
3. **Dimensions**: ZigZag dimensions are preserved as relationship properties
4. **Metadata**: Sync metadata is tracked for each space

## Data Model

### Nodes
- **Cell**: Represents ZigZag cells with `id`, `space_id`, `text`, and `created_at`
- **SpaceMetadata**: Tracks sync information with `space_id`, `synced_at`, `cell_count`, `dimension_count`

### Relationships
- **CONNECTED**: Links cells with properties:
  - `dimension`: The ZigZag dimension (e.g., "d.1", "d.2") 
  - `direction`: "positive" or "negative"
  - `created_at`: Timestamp

## Testing in Neo4j Aura Console

Use these Cypher queries to verify data:

```cypher
-- Count all nodes
MATCH (n) RETURN count(n) as node_count

-- Count all relationships  
MATCH ()-[r]->() RETURN count(r) as relationship_count

-- Show all cells
MATCH (c:Cell) RETURN c.id, c.text, c.space_id LIMIT 10

-- Show connections in a space
MATCH (from:Cell {space_id: 'your-space-id'})-[r:CONNECTED]->(to:Cell) 
RETURN from.text, r.dimension, r.direction, to.text LIMIT 20

-- Visualize space structure  
MATCH (c:Cell {space_id: 'your-space-id'})-[r:CONNECTED]-(connected:Cell)
RETURN c, r, connected
```

## Production Space Management

For single-space deployments, use these endpoints to ensure only one space is in Neo4j:

### Set Production Space
```bash
curl -X POST http://localhost:3001/api/neo4j/set-production-space \
  -H "Content-Type: application/json" \
  -d '{
    "spaceId": "production-space-id",
    "spaceData": {
      "cells": {...},
      "dimensions": [...]
    }
  }'
```

This will:
1. Clear ALL existing data from Neo4j Aura
2. Sync the specified space as the sole content
3. Mark it as the production space

### Clear All Data
```bash
curl -X POST http://localhost:3001/api/neo4j/clear-all
```

## JavaScript/TypeScript Usage

```javascript
import { setProductionSpace, clearNeo4jData, syncSpaceToNeo4j } from './utils/neo4jSync';

// Set current space as production space (clears all other data)
const success = await setProductionSpace(spaceId, space);

// Clear all Neo4j data
await clearNeo4jData();

// Regular sync (adds to existing data)
await syncSpaceToNeo4j(spaceId, space);
```

## API Endpoints

- `POST /api/spaces/:spaceId/sync-neo4j` - Sync space to Neo4j (adds to existing data, no auth)
- `POST /api/neo4j/set-production-space` - Set single production space (clears all first, no auth)
- `POST /api/neo4j/clear-all` - Clear all Neo4j data (no auth)
- `GET /api/spaces/:spaceId/neo4j-visualization` - Get visualization data (auth required)
- `GET /api/neo4j-test/:spaceId` - Test endpoint to verify data (no auth)

## Debugging

Server logs show detailed sync information:
- Space data structure being sent
- Cells and connections created
- Verification counts
- Any errors during sync

The sync process is atomic - either all data is written successfully or the transaction is rolled back.