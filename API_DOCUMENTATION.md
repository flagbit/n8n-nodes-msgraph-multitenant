# API Documentation - @flagbit/n8n-nodes-msgraph

## Table of Contents
- [Node Class Reference](#node-class-reference)
- [Credential Class Reference](#credential-class-reference)
- [Execution Flow](#execution-flow)
- [Error Handling](#error-handling)
- [Code Examples](#code-examples)

---

## Node Class Reference

### MsGraph Class

```typescript
class MsGraph implements INodeType {
    description: INodeTypeDescription;
    execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
}
```

#### Properties

##### description
Node metadata and configuration schema.

```javascript
{
    displayName: 'Microsoft Graph Multi-Tenant',
    name: 'msGraph',
    icon: 'file:msgraph.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["method"] + ": " + $parameter["url"]}}',
    description: 'Consume Graph API with multi-tenant support',
    defaults: { name: 'Microsoft Graph Multi-Tenant' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [{ name: 'msGraphOAuth2Api', required: true }]
}
```

#### Node Parameters

##### tenantId
- **Type**: `string`
- **Required**: `true`
- **Description**: Azure AD Tenant (Directory) ID
- **Placeholder**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- **Dynamic**: Can be set via expressions for multi-tenant workflows

##### method
- **Type**: `options`
- **Default**: `GET`
- **Options**: 
  - `GET` - Retrieve data
  - `POST` - Create resources
  - `PATCH` - Update resources (partial)
  - `PUT` - Update resources (full)
  - `DELETE` - Remove resources

##### url
- **Type**: `string`
- **Required**: `true`
- **Default**: `https://graph.microsoft.com/v1.0/me`
- **Placeholder**: `https://graph.microsoft.com/v1.0/users`
- **Description**: Full Microsoft Graph API endpoint URL

##### queryParameters
- **Type**: `fixedCollection`
- **Structure**: Array of name-value pairs
- **Usage**: Add URL query parameters like `$filter`, `$select`, `$top`
- **Example**:
  ```json
  {
    "parameter": [
      { "name": "$select", "value": "id,displayName,mail" },
      { "name": "$top", "value": "10" }
    ]
  }
  ```

##### body
- **Type**: `json`
- **Display**: Only for POST, PATCH, PUT methods
- **Description**: Request body in JSON format
- **Validation**: Must be valid JSON string or object

##### responseFormat
- **Type**: `options`
- **Default**: `json`
- **Options**:
  - `json` - Parse response as JSON object
  - `string` - Return response as string

##### customHeaders
- **Type**: `fixedCollection`
- **Description**: Custom headers to send with the request
- **Structure**: Array of name-value pairs
- **Security**: Authorization header cannot be overridden
- **Example**:
  ```json
  {
    "header": [
      { "name": "x-custom-header", "value": "custom-value" },
      { "name": "x-api-version", "value": "2024-01-01" },
      { "name": "Prefer", "value": "odata.maxpagesize=999" }
    ]
  }
  ```

---

## Credential Class Reference

### MsGraphOAuth2Api Class

```javascript
class MsGraphOAuth2Api {
    name: 'msGraphOAuth2Api';
    displayName: 'Microsoft Graph OAuth2 API';
    documentationUrl: 'https://docs.microsoft.com/en-us/graph/auth-v2-user';
    properties: INodeProperties[];
}
```

#### Credential Properties

##### clientId
- **Type**: `string`
- **Required**: `true`
- **Description**: Azure AD Application (client) ID
- **Security**: Stored encrypted in n8n

##### clientSecret
- **Type**: `string` (password)
- **Required**: `true`
- **Description**: Client secret for app authentication
- **Security**: Encrypted storage, masked in UI

##### scope
- **Type**: `string`
- **Required**: `true`
- **Default**: `offline_access user.read`
- **Description**: Space-separated list of Microsoft Graph scopes
- **Example**: `User.Read.All Group.Read.All Mail.Send`

##### authentication
- **Type**: `options`
- **Default**: `header`
- **Options**:
  - `header` - Send auth in Authorization header
  - `body` - Send auth in request body

---

## Execution Flow

### 1. Token Acquisition Flow

```javascript
// Token cache structure
const tokenCache = {
    "tenant-id-1": "access-token-1",
    "tenant-id-2": "access-token-2"
};

// Token acquisition process
async function getAccessToken(tenantId, clientId, clientSecret) {
    // Check cache first
    if (tokenCache[tenantId]) {
        return tokenCache[tenantId];
    }
    
    // Request new token
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/token`;
    const params = new URLSearchParams({
        'grant_type': 'client_credentials',
        'client_id': clientId,
        'client_secret': clientSecret,
        'resource': 'https://graph.microsoft.com'
    });
    
    const response = await request({
        method: 'POST',
        url: tokenUrl,
        body: params.toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    // Cache and return
    tokenCache[tenantId] = response.access_token;
    return response.access_token;
}
```

### 2. Request Execution Flow

```javascript
// Main execution loop
for (let i = 0; i < items.length; i++) {
    // 1. Get parameters
    const tenantId = this.getNodeParameter('tenantId', i);
    const method = this.getNodeParameter('method', i);
    const url = this.getNodeParameter('url', i);
    
    // 2. Get or fetch token
    const accessToken = await getAccessToken(tenantId, clientId, clientSecret);
    
    // 3. Build request
    const requestOptions = {
        method,
        url,
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        qs: queryParameters,
        body: requestBody,
        json: true
    };
    
    // 4. Execute with retry logic
    const response = await executeWithRetry(requestOptions);
    
    // 5. Process response
    returnItems.push({ json: response });
}
```

### 3. Rate Limit Handling

```javascript
const throttle = {
    enabled: true,
    delay: 2,        // seconds
    maxRetries: 5
};

let retryCount = 0;
while (true) {
    try {
        const response = await this.helpers.request(requestOptions);
        break;
    } catch (error) {
        if (error.statusCode === 429 && retryCount < throttle.maxRetries) {
            retryCount++;
            const retryAfter = error.headers['retry-after'] || throttle.delay;
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            continue;
        }
        throw error;
    }
}
```

---

## Error Handling

### Error Types

| Error Code | Description | Handling |
|------------|-------------|----------|
| 401 | Unauthorized - Invalid credentials | Check client ID/secret |
| 403 | Forbidden - Insufficient permissions | Verify API permissions |
| 404 | Not Found - Invalid endpoint | Check URL and tenant |
| 429 | Too Many Requests | Automatic retry with backoff |
| 500+ | Server errors | Fail or continue based on settings |

### Error Response Format

```javascript
// When continueOnFail is enabled
{
    json: {
        error: "Error message describing the issue"
    }
}

// When continueOnFail is disabled
// Throws NodeOperationError with details
```

---

## Code Examples

### Example 1: List Users from Multiple Tenants

```javascript
// Workflow input data
[
    { json: { tenantId: "tenant-1-guid" } },
    { json: { tenantId: "tenant-2-guid" } },
    { json: { tenantId: "tenant-3-guid" } }
]

// Node configuration
{
    tenantId: "={{$json.tenantId}}",
    method: "GET",
    url: "https://graph.microsoft.com/v1.0/users",
    queryParameters: {
        parameter: [
            { name: "$select", value: "id,displayName,mail" },
            { name: "$top", value: "50" }
        ]
    },
    responseFormat: "json"
}
```

### Example 2: Create User in Specific Tenant

```javascript
// Node configuration
{
    tenantId: "specific-tenant-guid",
    method: "POST",
    url: "https://graph.microsoft.com/v1.0/users",
    body: JSON.stringify({
        accountEnabled: true,
        displayName: "New User",
        mailNickname: "newuser",
        userPrincipalName: "newuser@domain.com",
        passwordProfile: {
            forceChangePasswordNextSignIn: true,
            password: "TempPassword123!"
        }
    }),
    responseFormat: "json"
}
```

### Example 3: Send Email via Graph API

```javascript
// Node configuration
{
    tenantId: "={{$json.tenantId}}",
    method: "POST",
    url: "https://graph.microsoft.com/v1.0/users/{{$json.userId}}/sendMail",
    body: JSON.stringify({
        message: {
            subject: "Test Email",
            body: {
                contentType: "Text",
                content: "This is a test email sent via Microsoft Graph"
            },
            toRecipients: [
                {
                    emailAddress: {
                        address: "recipient@example.com"
                    }
                }
            ]
        }
    }),
    responseFormat: "json"
}
```

### Example 4: Batch Operations

```javascript
// Use n8n's built-in batching with SplitInBatches node
// Each batch can target different tenants
{
    tenantId: "={{$json.tenantId}}",
    method: "GET",
    url: "https://graph.microsoft.com/v1.0/groups/{{$json.groupId}}/members",
    queryParameters: {
        parameter: [
            { name: "$select", value: "id,displayName" }
        ]
    }
}
```

### Example 5: Using Custom Headers

```javascript
// Node configuration with custom headers
{
    tenantId: "specific-tenant-guid",
    method: "GET",
    url: "https://graph.microsoft.com/v1.0/users",
    queryParameters: {
        parameter: [
            { name: "$top", value: "999" }
        ]
    },
    customHeaders: {
        header: [
            { name: "Prefer", value: "odata.maxpagesize=999" },
            { name: "x-api-version", value: "beta" },
            { name: "ConsistencyLevel", value: "eventual" }
        ]
    },
    responseFormat: "json"
}
```

---

## Performance Considerations

1. **Token Caching**: Tokens are cached per execution, reducing API calls
2. **Rate Limiting**: Automatic retry with exponential backoff
3. **Batch Processing**: Process multiple items in single workflow execution
4. **Query Optimization**: Use `$select` to limit returned fields
5. **Pagination**: Handle large datasets with `$top` and `$skip`

---

## Security Best Practices

1. **Credential Storage**: Use n8n's encrypted credential storage
2. **Minimal Permissions**: Request only necessary Graph API scopes
3. **Tenant Isolation**: Each request is tenant-specific
4. **Error Handling**: Don't expose sensitive data in error messages
5. **Audit Logging**: Track API usage per tenant for compliance