# RouteTracker - Mileage Reimbursement Tracking

![CI](https://github.com/AmbitiousWays16/routetracker/workflows/CI/badge.svg)
![Deploy to Production](https://github.com/AmbitiousWays16/routetracker/workflows/Deploy%20to%20Production/badge.svg)
![Security Scan](https://github.com/AmbitiousWays16/routetracker/workflows/Security%20Scan/badge.svg)

A comprehensive mileage reimbursement tracking application with multi-tier approval workflow.

## Project info

**URL**: https://lovable.dev/projects/2face1c8-df08-44c3-9a59-cc212f800657

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/2face1c8-df08-44c3-9a59-cc212f800657) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

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

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## CI/CD Pipeline

This project uses GitHub Actions for continuous integration and deployment.

### Available Workflows

- **CI**: Runs linting, tests, and builds on every push and PR
- **Deploy to Staging**: Automatically deploys to staging environment from `develop` branch
- **Deploy to Production**: Deploys to production from `main` branch (requires approval)
- **Release**: Creates versioned releases with automated changelog
- **Security Scan**: Daily security scans for dependencies and code vulnerabilities

### Quick Start

```sh
# Run tests locally
npm test

# Run linter
npm run lint

# Build for production
npm run build
```

### Documentation

- [CI/CD Pipeline Documentation](docs/CICD.md) - Complete guide to the CI/CD workflows
- [Deployment Guide](DEPLOYMENT.md) - Deployment procedures, rollback, and monitoring
- [Environment Variables](.env.example) - Required environment variables

### Deployment

Deployments are automated through GitHub Actions:

1. **Staging**: Merge to `develop` branch → automatic deployment
2. **Production**: Merge to `main` branch → automatic deployment (with approval)
3. **Releases**: Create via workflow or commit with `[release]` tag

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed procedures.
