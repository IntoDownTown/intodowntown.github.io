targetScope = 'resourceGroup'

@description('Workspace existant, avec Sentinel activé et AzureActivity alimentée.')
param workspaceName string

@description('Identité stable de la règle : conserver cette valeur entre les versions.')
param ruleId string = '6db8f72a-b60b-4db2-8189-c7d540f56ad1'

@description('Activation après validation de la requête dans le workspace de test.')
param enabled bool = false

resource workspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' existing = {
  name: workspaceName
}

resource rule 'Microsoft.SecurityInsights/alertRules@2025-03-01' = {
  name: ruleId
  scope: workspace
  kind: 'Scheduled'
  properties: {
    displayName: 'LAB - Attribution de rôle Azure réussie'
    description: 'Signal de revue des droits. Une attribution réussie ne démontre pas une compromission. Vérifier le bénéficiaire, le rôle, le scope et le changement autorisé.'
    enabled: enabled
    severity: 'Medium'
    query: loadTextContent('queries/role-assignment.kql')
    queryFrequency: 'PT5M'
    queryPeriod: 'PT20M'
    triggerOperator: 'GreaterThan'
    triggerThreshold: 0
    suppressionEnabled: false
    suppressionDuration: 'PT1H'
    tactics: [
      'Persistence'
      'PrivilegeEscalation'
    ]
    techniques: [
      'T1098'
    ]
    eventGroupingSettings: {
      aggregationKind: 'AlertPerResult'
    }
    incidentConfiguration: {
      createIncident: true
      groupingConfiguration: {
        enabled: false
        reopenClosedIncident: false
        lookbackDuration: 'PT1H'
        matchingMethod: 'AllEntities'
      }
    }
    entityMappings: [
      {
        entityType: 'AzureResource'
        fieldMappings: [
          { identifier: 'ResourceId', columnName: '_ResourceId' }
        ]
      }
    ]
    customDetails: {
      Actor: 'Caller'
      Correlation: 'CorrelationId'
      Event: 'EventDataId'
    }
  }
}

output deployedRuleId string = rule.id
