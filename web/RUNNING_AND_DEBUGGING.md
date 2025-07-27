# Running ZigZag Web Development

## 🚀 Installation & Setup

Due to the monorepo structure using npm workspaces, here are the proper steps to install and run the project:

### Option 1: Run directly from client directory (Recommended)
```bash
# Navigate to the client directory
cd /Users/adam.vialsmoore/Workspace/gzigzag/web/packages/client

# Install dependencies (if not already installed)
npm install

# Start the development server
npm run dev
```

### Option 2: Run from web root directory
```bash
# Navigate to the web root
cd /Users/adam.vialsmoore/Workspace/gzigzag/web

# Install all dependencies (may require npm 7+)
npm run install:all

# Run the development server
npm run dev
```

## 🐛 Troubleshooting the Black Screen

If you see a black screen after launching from the launcher:

1. **Open the browser console** (F12 or Cmd+Option+I on Mac)
2. **Look for any error messages**
3. **Check the console logs** - I've added debugging statements that will show:
   - "App component rendering"
   - "Launching with mode: demo/blank"
   - "Created space: [object]"
   - "Home cell: [object]"
   - "Dimensions: [array]"
   - "Setting cursor: [object]"

### Common Issues:

1. **CSS conflicts**: The index.css was centering content which could cause layout issues. This has been fixed.

2. **Component not found**: Make sure all components are properly imported. Check for any TypeScript errors in the console.

3. **State initialization**: The space or cursor might not be initializing properly. The console logs will help identify this.

## 📝 Quick Fix Steps

1. **Clear browser cache**: Sometimes old styles get cached
2. **Check the console**: Look for any JavaScript errors
3. **Verify imports**: Make sure all components exist in their expected locations

## 🔧 Development Commands

From `/web/packages/client`:
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run type-check` - Check TypeScript types

From `/web` (root):
- `npm run dev` - Start client development server
- `npm run demo` - Run core module demo
- `npm run install:all` - Install all workspace dependencies

## 💡 What Should Happen

When you launch successfully:
1. You'll see the launcher with 3 options
2. Select "Blank Space" or "Krebs Cycle Demo"
3. You should see:
   - A header with "ZigZag Web - [mode name]"
   - A "← Back" button
   - View controls (dimension selector and view buttons)
   - The main ZigZag visualization area
   - A footer with current cell info

If you still see a black screen, please share the console output so I can help debug further!
