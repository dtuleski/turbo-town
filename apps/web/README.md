# Memory Game - Web Frontend

A fun and educational memory card matching game built with React, TypeScript, and Vite.

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x or higher
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

## 📦 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## 🏗️ Project Structure

```
src/
├── api/              # API clients and configuration
├── components/       # Reusable React components
│   ├── auth/        # Authentication components
│   ├── common/      # Common UI components
│   ├── game/        # Game-specific components
│   └── layout/      # Layout components
├── config/          # App configuration
├── context/         # React contexts
├── hooks/           # Custom React hooks
├── pages/           # Page components
├── styles/          # Global styles
├── types/           # TypeScript types
└── utils/           # Utility functions
```

## 🎨 Features

### Phase 1: Setup & Auth (✅ Complete)
- ✅ Project setup with Vite + React + TypeScript
- ✅ Tailwind CSS configuration
- ✅ React Router setup
- ✅ Authentication pages (Login, Register, Forgot Password, Reset Password)
- ✅ Protected routes
- ✅ Auth context and state management

### Phase 2: Game Interface (✅ Complete)
- ✅ Game setup page (theme and difficulty selection)
- ✅ Game board with card grid
- ✅ Card flip animations (Framer Motion)
- ✅ Game logic (matching, scoring, timer)
- ✅ Game state management with custom hook
- ✅ Start game modal
- ✅ Game over modal with stats
- ✅ Pause/resume functionality
- ✅ Achievement notifications
- ✅ Confetti celebration effect

### Phase 3: Dashboard (⏳ Planned)
- ⏳ User statistics
- ⏳ Game history
- ⏳ Achievement showcase
- ⏳ Profile management

### Phase 4: API Integration (⏳ Planned)
- ⏳ GraphQL client setup
- ⏳ Auth API integration
- ⏳ Game API integration
- ⏳ Real-time updates

## 🎮 Game Themes

- 🐶 Animals
- 🍎 Fruits
- 🚗 Vehicles
- 🚀 Space
- 🐠 Ocean

## 🎯 Difficulty Levels

- **Easy**: 6 pairs (12 cards)
- **Medium**: 8 pairs (16 cards)
- **Hard**: 10 pairs (20 cards)

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
VITE_API_URL=http://localhost:4000/graphql
VITE_COGNITO_USER_POOL_ID=your-user-pool-id
VITE_COGNITO_CLIENT_ID=your-client-id
VITE_COGNITO_REGION=us-east-1
```

## 🎨 Design System

### Colors
- Primary: Blue (#4A90E2), Purple (#9B59B6), Pink (#E91E63)
- Background: Light (#F5F7FA), White (#FFFFFF)
- Text: Primary (#2C3E50), Secondary (#7F8C8D)
- Status: Success (#27AE60), Error (#E74C3C), Warning (#F39C12)

### Typography
- Font: Poppins, Comic Sans MS (kid-friendly)
- Sizes: xs (0.75rem) to 4xl (2.25rem)

## 📱 Responsive Design

The app is fully responsive and works on:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (320px - 767px)

## 🧪 Testing

```bash
# Run unit tests (when implemented)
npm run test

# Run E2E tests (when implemented)
npm run test:e2e
```

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

### Deploy to Netlify

```bash
npm install -g netlify-cli
netlify deploy
```

## 📚 Tech Stack

- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router
- **State Management**: React Context + TanStack Query
- **API Client**: Apollo Client (GraphQL)
- **Forms**: React Hook Form + Zod
- **Animations**: Framer Motion

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome!

## 📄 License

MIT

## 🆘 Need Help?

Check out the documentation:
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Router](https://reactrouter.com/)

---

**Happy Gaming! 🎮**
