# Azure App Service deployment

## Recommended App Service

- Publish: **Code**
- Operating system: **Linux**
- Runtime stack: **Node 24 LTS**
- Plan: **Basic B1** or higher
- Instances: **1** while using SQLite
- Always On: **Enabled**
- Startup command: `npm start`
- Health check path: `/api/health`

SQLite is stored at `/home/data/airblue.sqlite`, which is the persistent App Service content area. Keep the app at one instance; use Azure SQL or PostgreSQL before scaling out.

## Automated resource setup

After signing in with Azure CLI:

```bash
az group create --name airblue-ops-rg --location uaenorth
az deployment group create \
  --resource-group airblue-ops-rg \
  --template-file azure/app-service.bicep \
  --parameters appName=<globally-unique-app-name>
```

## Deploy from GitHub

In the App Service Deployment Center, select GitHub, then choose:

- Repository: `kidneyclinic92-max/airblue`
- Branch: `main`

App Service build automation installs dependencies and runs the build. Confirm these application settings after deployment:

| Setting | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `WEBSITE_NODE_DEFAULT_VERSION` | `~24` |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` |
| `SQLITE_PATH` | `/home/data/airblue.sqlite` |

Set the startup command to `npm start`, enable Always On, and configure `/api/health` as the health check path.

## Preflight

Run `npm run azure:preflight` before deployment. After deployment, verify `/api/health`, sign in, and create a test handover to confirm persistent writes.
