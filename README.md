# Welcome to your project

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I edit this code?

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## Testing

This project has a comprehensive testing suite. See [TESTING.md](./TESTING.md) for detailed testing documentation.

### Quick Start

```sh
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

### Test Coverage

The project maintains **>80% code coverage** on core business logic (lib/ directory).

Current test types:
- **Unit Tests**: Testing individual functions (utils, emailService, mapUtils)
- **Component Tests**: Testing React components (ProxyMapImage, TokenRedirectHandler)
- **Integration Tests**: Testing feature flows (route calculation, authentication)
- **E2E Tests**: Testing complete user workflows with Playwright

## How can I deploy this project?

You can deploy this project to any static hosting provider. You will need to build the project first.

```sh
npm run build
```

This will create a `dist` folder with the production-ready files. You can then upload this folder to your hosting provider.

