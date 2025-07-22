# ZigZag Web - Modern Implementation of Ted Nelson's ZigZag

> **"Locally rational, globally paradoxical, yet somehow comprehensible"** - Ted Nelson

A modern web implementation of Ted Nelson's revolutionary ZigZag (hyperthogonal) data structure, preserving the original vision while bringing it to contemporary web platforms.

## 🎯 Project Vision

This project modernizes the groundbreaking [GzigZag](http://gzigzag.sourceforge.net/) implementation while staying faithful to Ted Nelson's original concepts:

- **Hyperthogonal Structure**: Cells connected along named dimensions without global coordinates
- **Bottom-up Organization**: Structure emerges from simple relations, not imposed schemas  
- **View Diversity**: Multiple ways to visualize and interact with the same data
- **Dimensional Thinking**: Moving beyond traditional hierarchies and tables

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Docker & Docker Compose (for databases)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/adammoore/gzigzag.git
cd gzigzag

# Switch to modernization branch  
git checkout modernization

# Install dependencies
npm install

# Start development environment
npm run docker:dev  # Starts PostgreSQL + Neo4j + Redis
npm run dev         # Starts both server and client
```

Visit `http://localhost:3000` to see the ZigZag web interface.

## 🏗️ Architecture Overview

### Technology Stack

- **Frontend**: React + TypeScript + Vite + Three.js
- **Backend**: Node.js + Express + TypeScript  
- **Databases**: 
  - Neo4j (dimensional relationships)
  - PostgreSQL (cell content & metadata)
  - Redis (sessions & caching)
- **Deployment**: Render.com ready

### Core Abstractions

```typescript
// Fundamental ZigZag concepts in TypeScript
interface ZZCell {
  id: string;
  text: string;
  step(dimension: string, direction: 1 | -1): ZZCell | null;
  connect(dimension: string, toCell: ZZCell): void;
  newCell(dimension: string, direction: 1 | -1): ZZCell;
}

interface ZZSpace {
  getHomeCell(): ZZCell;
  getDimensions(): string[];
  getCells(): ZZCell[];
}
```

## 📁 Project Structure

```
gzigzag-web/
├── packages/
│   ├── core/           # Core ZigZag abstractions & algorithms
│   ├── server/         # Node.js API server  
│   ├── client/         # React web application
│   ├── database/       # Schema & migration scripts
│   └── demo/           # Demo applications (biochemistry, etc.)
├── docs/               # Documentation & guides
├── tests/              # End-to-end tests
└── deployment/         # Docker & deployment configs
```

## 🧬 Recreating the Biochemistry Demo

Your original [YouTube demo](https://youtu.be/si1EJ584foA) showing biochemical pathways is a perfect showcase for ZigZag's power. Here's how to recreate it:

```typescript
import { createKrebsCycleDemo, animateKrebsCycle } from '@zigzag/core';

// Create the Krebs cycle structure
const biochemSpace = createKrebsCycleDemo();

// Get animation sequence
const animationSteps = animateKrebsCycle(biochemSpace);

// Each step represents a cell in the cycle for visualization
animationSteps.forEach((cellId, index) => {
  setTimeout(() => highlightCell(cellId), index * 500);
});
```

## 🎨 ZigZag Views

The modern implementation supports multiple view types:

- **RankView**: Linear display along a single dimension
- **VanishingView**: 3D perspective showing multiple dimensions
- **RowColView**: Traditional grid layout  
- **BiochemView**: Specialized for molecular pathway visualization
- **CustomView**: Build your own using the view API

## 🔧 Development

### Running Tests

```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:e2e        # End-to-end tests
```

### Code Quality

```bash
npm run lint            # ESLint checking
npm run type-check      # TypeScript validation
npm run docs            # Generate documentation
```

### Database Operations

```bash
npm run migrate:dev     # Run database migrations
npm run db:seed         # Seed with demo data
npm run db:reset        # Reset to clean state
```

## 📊 Migration from Original GzigZag

The project includes tools to migrate data from the original Java-based GzigZag:

```bash
# Migrate from original GzigZag directory
npm run migrate:gzigzag /path/to/original/Z/directory

# Validate migration integrity  
npm run validate:migration

# Export to various formats
npm run export:json
npm run export:xml
```

## 🚀 Deployment

### Local Development
```bash
docker-compose -f docker-compose.dev.yml up
npm run dev
```

### Production on Render.com
The project includes Render.com configuration for one-click deployment:

1. Fork this repository
2. Connect to Render.com
3. Deploy using the included `render.yaml`

Environment variables needed:
- `DATABASE_URL` (PostgreSQL)
- `NEO4J_URI` (Neo4j)  
- `REDIS_URL` (Redis)

## 📚 Learning ZigZag

New to ZigZag concepts? Start here:

1. **[Gentle Introduction](./docs/gentle-introduction.md)** - ZigZag basics
2. **[Ted Nelson's Vision](./docs/nelson-vision.md)** - Original concepts
3. **[API Reference](./docs/api-reference.md)** - Technical details
4. **[Tutorial](./docs/tutorial.md)** - Build your first ZigZag app

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](./CONTRIBUTING.md).

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Install dependencies: `npm install`
4. Start development: `npm run dev`
5. Run tests: `npm test`
6. Commit with detailed messages: `git commit -m "feat: add amazing feature"`
7. Push and create a Pull Request

### Commit Convention

Following the original GzigZag's excellent commit discipline:

```
feat: implement 3D visualization for biochemical pathways
fix: resolve dimension connection integrity issue  
docs: add tutorial for custom view development
test: add comprehensive ZZCell navigation tests
```

## 📄 License

This project maintains the same dual licensing as the original GzigZag:

- **GNU Lesser General Public License v2.1 or later**
- **XPL (Xanadu Public License)**

**Copyright**: Ted Nelson (original concepts and implementation)  
**Modernization**: Adam Vials Moore

See [LICENSE.lgpl](./LICENSE.lgpl) and [LICENSE.xpl](./LICENSE.xpl) for details.

## 🙏 Acknowledgments

- **Ted Nelson** - Original ZigZag concept and vision
- **Tuomas Lukka** - Original GzigZag Java implementation  
- **Jyväskylä Group** - Extensive development and research
- **University of Jyväskylä** - Original research environment

## 🔗 Links

- [Original ZigZag Information](http://www.xanadu.net/zigzag/)
- [GzigZag SourceForge](http://gzigzag.sourceforge.net/) 
- [Ted Nelson's Project Xanadu](http://xanadu.com/)
- [Your Biochemistry Demo](https://youtu.be/si1EJ584foA)

---

*"The most general data structure, able to replace tables, arrays, spreadsheet and relational database, and intrinsically offering built-in visualizations and hands-on controls."* - Ted Nelson

Transform how you think about data organization. Experience the power of hyperthogonal structure.
