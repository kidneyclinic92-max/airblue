param appName string
param location string = resourceGroup().location
param skuName string = 'B1'
@secure()
param rfidHashPepper string

resource plan 'Microsoft.Web/serverfarms@2024-04-01' = {
  name: '${appName}-plan'
  location: location
  sku: {
    name: skuName
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource app 'Microsoft.Web/sites@2024-04-01' = {
  name: appName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    clientAffinityEnabled: true
    siteConfig: {
      linuxFxVersion: 'NODE|24-lts'
      appCommandLine: 'npm start'
      alwaysOn: true
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      healthCheckPath: '/api/health'
      appSettings: [
        {
          name: 'NODE_ENV'
          value: 'production'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~24'
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
        {
          name: 'SQLITE_PATH'
          value: '/home/data/airblue.sqlite'
        }
        {
          name: 'RFID_HASH_PEPPER'
          value: rfidHashPepper
        }
      ]
    }
  }
}

output defaultHostName string = app.properties.defaultHostName
