# GzigZag Web - Authentic Recreation

## Overview
Faithful web recreation of Ted Nelson's original GzigZag hyperdimensional data structure (1990s-2000s era). Features authentic dual-pane interface, complete keyboard command set, and Adam's comprehensive chemistry demonstration.

## ✨ Key Features

### 🎯 Authentic GzigZag Experience
- **Dual-Pane Interface**: Original yellow control pane and gray data pane
- **Complete Keyboard Commands**: All essential ZigZag operations (`n`, `m`, `b`, `h`, `-`, `t`, `/`, etc.)
- **Original Visual Design**: Faithful recreation of 1990s-2000s GzigZag appearance
- **3D Vanishing View**: Manhattan distance algorithm with proper perspective

### 🧬 Adam's Chemistry Demo
- **Comprehensive Biochemistry**: Periodic table, Krebs cycle, protein databases
- **Multi-Dimensional Structure**: Complex chemical relationships in ZigZag space
- **Original Recreation**: Faithfully recreates Adam's original YouTube demonstration

### 🔧 Advanced Cell Operations
- **Smart Cell Creation**: Proper insertion in existing chains
- **Cell Marking System**: Visual feedback with authentic styling
- **Connection Management**: Directional linking with semantic dimensions
- **Cell Manipulation**: Clone, hop, break, and coordinate operations

## Technology Stack
- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Authentic CSS (original GzigZag color scheme)
- **Core Engine**: Custom ZigZag implementation in TypeScript
- **Development**: Hot reloading, modern toolchain

## Local Development

### Prerequisites
- Node.js 18+
- Git

### Quick Start
```bash
# Clone repository
git clone https://github.com/adammoore/gzigzag.git
cd gzigzag/web

# Install dependencies
npm install

# Start development server
npm run dev
```

**Open http://localhost:3000** and experience authentic GzigZag!

### Available Scripts
- `npm run dev` - Start development server (frontend only)
- `npm run build:all` - Build all packages for production
- `npm run test` - Run all tests

## 🎮 Usage Guide

### Getting Started
1. **Launch Options**: Choose from Adam's Chemistry Demo, Simple Krebs Cycle, Blank Space, or Load Z Directory
2. **Interface**: Dual-pane layout with green cursor (control) and blue cursor (data) 
3. **Navigation**: Use authentic keyboard commands (press `?` for help)

### Essential Keyboard Commands

#### Cursor Navigation
- **Green Cursor (Control Pane)**: `e`/`c` (up/down), `s`/`f` (left/right), `D`/`d` (Z-axis)
- **Blue Cursor (Data Pane)**: `i`/`,` (up/down), `j`/`l` (left/right), `K`/`k` (Z-axis)
- **Cursor Coordination**: `~` (swap), `<`/`>` (jump between cursors)

#### Cell Operations
- **Create Cell**: `n` + direction arrow
- **Mark/Unmark**: `m` (toggles marking on current cell)
- **Connect Cells**: `-` + direction (connects to marked cell)
- **Delete Cell**: `Delete` (smart cursor positioning)
- **Clone Cell**: `t` + direction (shallow), `T` + direction (deep)

#### Advanced Operations
- **Break Connection**: `b` + direction
- **Hop Cell**: `h` + direction (swap positions)
- **Coordinate Cursors**: `/` + direction
- **Edit Cell**: Double-click cell or use edit mode

### Demos Available
1. **Adam's Chemistry Demo** 🧬: Full biochemistry with periodic table, Krebs cycle, cofactors
2. **Simple Krebs Cycle** 🔬: Basic biochemistry demonstration  
3. **Blank Space** 📄: Empty space for experimentation
4. **Load Z Directory** 📁: Import original GzigZag files

## 🏗️ Architecture

### Core Components
1. **ZZSpace**: Container for cells and dimensions
2. **ZZCell**: Individual data nodes with connections
3. **Dimensions**: Named connection types (d.1, d.2, d.3, custom dimensions)
4. **Views**: Different ways to visualize the space (Rank, Vanishing, RowCol)

### Data Structure
- **Cells**: Unique ID, text content, dimensional connections
- **Connections**: Directional links between cells in named dimensions
- **Authentic Rules**: One positive/negative connection per cell per dimension

## 🔧 Development

### Project Structure
```
packages/
├── core/           # ZigZag engine (TypeScript)
├── client/         # React frontend
└── server/         # Node.js backend (optional)
```

### Building
```bash
# Build all packages
npm run build:all

# Development mode (with hot reloading)
npm run dev
```

## 🐛 Troubleshooting

### Common Issues
```bash
# Build errors - clean install
rm -rf node_modules package-lock.json
rm -rf packages/*/node_modules packages/*/package-lock.json
npm install
npm run build:all

# Port conflicts - change port
export PORT=3001 && npm run dev
```

### Connection Errors
- Check dimension names are consistent
- Verify no duplicate connections per dimension
- Use semantic dimensions for complex structures

## 🎯 Roadmap

### Completed ✅
- [x] Authentic dual-pane interface
- [x] Complete keyboard command set
- [x] Adam's comprehensive chemistry demo
- [x] Smart cell insertion and connection management
- [x] Original visual design recreation
- [x] 3D vanishing view with perspective
- [x] Cell marking and manipulation system

### Future Enhancements 🚀
- [ ] Z directory import/export functionality
- [ ] Multi-user collaboration
- [ ] Plugin system for custom views
- [ ] Performance optimizations for large spaces
- [ ] Mobile/touch interface adaptation

## 🤝 Contributing
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Make changes and test thoroughly
4. Commit with descriptive message
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open Pull Request

## 📜 License
MIT License - see LICENSE file for details

## 🙏 Acknowledgments
- **Ted Nelson** - Original ZigZag concept and vision
- **Adam Vials Moore** - Chemistry demo recreation and implementation
- **Original GzigZag Team** - Reference implementation and documentation

---

**"The best way to predict the future is to invent it."** - Ted Nelson

*Experience the revolutionary hyperdimensional data structure that was ahead of its time.*
