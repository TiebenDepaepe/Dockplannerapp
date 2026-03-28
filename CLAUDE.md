# AGENTS.md

This file provides guidelines for AI agents working on this codebase.

## Commands

### Development
- `npm run dev` - Start development server on port 3000
- `npm run build` - Build for production (outputs to `build/`)
- `npm i` - Install dependencies

### Testing & Linting
No test framework or linter is currently configured. When adding tests, set up Vitest and update this file.
To run a single test: `npm test -- [test-file]`

## Tech Stack
- **Framework**: React 18 with TypeScript, Vite (SWC)
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI (import via versioned aliases, e.g., `'@radix-ui/react-dialog@1.1.6'`)
- **Icons**: Lucide React (`lucide-react@0.487.0`)
- **State**: React hooks (useState, useEffect, useMemo), custom hooks for complex logic
- **Auth/Backend**: Supabase (@jsr/supabase__supabase-js)
- **Animations**: Motion (`motion/react`)
- **PDF Generation**: jsPDF, jspdf-autotable

## Code Style Guidelines

### Imports
- Use versioned aliases for packages (defined in vite.config.ts): `import { Dialog } from './ui/dialog'` works; direct Radix imports must use versioned aliases like `'@radix-ui/react-dialog@1.1.6'`
- Use relative imports for internal modules: `import { BoatData } from '../types/dock'`
- Group imports: React first, then third-party libraries, then internal modules

### File Organization
- `src/components/` - React components (main application components)
- `src/components/ui/` - Reusable UI components (Radix-based primitives)
- `src/hooks/` - Custom React hooks (useBoats, useCanvasInteraction)
- `src/utils/` - Utility functions and modules
- `src/types/` - TypeScript type definitions
- `src/supabase/` - Supabase client and server functions

### Naming Conventions
- **Components**: PascalCase (`DockCanvas`, `BoatList`)
- **Functions/Variables**: camelCase (`calculateDockScale`, `boatPosition`)
- **Constants**: UPPER_SNAKE_CASE (`DOCK_LENGTH`, `POSITION_THRESHOLD`)
- **Types/Interfaces**: PascalCase, descriptive names (`BoatData`, `DockConfig`)

### TypeScript
- Use interfaces for object shapes with possible extension
- Use type aliases for union types and complex types
- Explicitly type function parameters and return values for complex logic
- Avoid `any` - use proper types or `unknown` when necessary
- Type IDs as `string`

### Components
- Use functional components with hooks
- Explicitly export components: `export function ComponentName() {}`
- Define props interfaces inline or above component
- Use className merging utility (`cn`) for conditional Tailwind classes
- Motion components from `motion/react` for animations

### State Management
- Prefer `useState` for simple local state
- Use `useMemo` for expensive computations and derived data
- Use `useEffect` for side effects and external data fetching
- Extract complex state logic into custom hooks
- Async operations should have proper error handling with try/catch

### Error Handling
- Use try/catch for async operations (fetch, Supabase calls)
- Log errors with `console.error` for debugging
- Show user feedback via toast (sonner) for user-facing errors
- Validate inputs before operations (use validators like `isValidLength`)

### Styling
- Tailwind CSS v4 for all styling
- Use semantic color names (blue-600, gray-100, etc.)
- Responsive design with flexbox and grid
- Interactive states: `hover:`, `focus:`, `disabled:`, `active:`
- Motion transitions: `transition-colors`, `transition-all`, `duration-300`
- For conditional styling, use template literals or cn utility

### Canvas/Graphics
- Canvas rendering in `src/components/DockCanvas.tsx`
- Geometry calculations in `src/utils/dockGeometry.ts`
- Coordinate transformations: meters to pixels via scale factor
- Finger dock and mooring zone calculations use trigonometry

### Constants & Configuration
- Dock configurations in `src/utils/dockData.ts` (DOCKS record)
- Constants in `src/utils/constants.ts` (thresholds, defaults)
- Environment/config in `src/utils/supabase/info.tsx`

### Internationalization
- UI labels are in Dutch (e.g., "Boot toevoegen", "Naam", "Lengte (m)")
- Keep user-facing strings consistent with existing Dutch text

### Performance
- Use React.memo or useMemo for expensive renders when needed
- Optimize canvas rendering with requestAnimationFrame if adding animations
- Minimize re-renders by careful dependency arrays in useEffect/useMemo
