"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MsGraph = void 0;
const { NodeOperationError } = require("n8n-workflow");

class MsGraph {
  constructor() {
    this.description = {
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
      credentials: [{ name: 'msGraphOAuth2Api', required: true }],
      properties: [
        { displayName: 'Tenant ID', name: 'tenantId', type: 'string', default: '', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', description: 'Azure AD Tenant (Directory) ID', required: true },
        { displayName: 'HTTP Method', name: 'method', type: 'options', options: ['GET','POST','PATCH','PUT','DELETE'].map(m => ({ name: m, value: m })), default: 'GET' },
        { displayName: 'URL', name: 'url', type: 'string', default: 'https://graph.microsoft.com/v1.0/me', placeholder: 'https://graph.microsoft.com/v1.0/users', description: 'Full Graph URL', required: true },
        { displayName: 'Query Parameters', name: 'queryParameters', type: 'fixedCollection', placeholder: 'Add Parameter', typeOptions: { multipleValues: true }, options: [{ name: 'parameter', displayName: 'Parameter', values: [ { displayName: 'Name', name: 'name', type: 'string', default: '' }, { displayName: 'Value', name: 'value', type: 'string', default: '' } ] }], default: {} },
        { displayName: 'Body Content Type', name: 'bodyContentType', type: 'options', displayOptions: { show: { method: ['POST','PATCH','PUT'] } }, options: [ { name: 'JSON', value: 'json', description: 'Send body as JSON' }, { name: 'Text', value: 'text', description: 'Send body as plain text' }, { name: 'Form Data', value: 'form', description: 'Send body as form data' } ], default: 'json', description: 'Content type of the request body' },
        { displayName: 'Body', name: 'body', type: 'json', displayOptions: { show: { method: ['POST','PATCH','PUT'], bodyContentType: ['json'] } }, default: '', description: 'JSON body data' },
        { displayName: 'Body', name: 'bodyText', type: 'string', displayOptions: { show: { method: ['POST','PATCH','PUT'], bodyContentType: ['text'] } }, default: '', description: 'Text body data', typeOptions: { rows: 5 } },
        { displayName: 'Body', name: 'bodyForm', type: 'fixedCollection', placeholder: 'Add Field', displayOptions: { show: { method: ['POST','PATCH','PUT'], bodyContentType: ['form'] } }, typeOptions: { multipleValues: true }, options: [{ name: 'parameter', displayName: 'Parameter', values: [ { displayName: 'Name', name: 'name', type: 'string', default: '' }, { displayName: 'Value', name: 'value', type: 'string', default: '' } ] }], default: {} },
        { displayName: 'Response Format', name: 'responseFormat', type: 'options', options: [ { name: 'JSON', value: 'json' }, { name: 'String', value: 'string' } ], default: 'json' },
        { displayName: 'Custom Headers', name: 'customHeaders', type: 'fixedCollection', placeholder: 'Add Header', typeOptions: { multipleValues: true }, description: 'Custom headers to send with the request', options: [{ name: 'header', displayName: 'Header', values: [ { displayName: 'Name', name: 'name', type: 'string', default: '', description: 'Header name (e.g., x-custom-header)' }, { displayName: 'Value', name: 'value', type: 'string', default: '', description: 'Header value' } ] }], default: {} },
      ],
    };
  }

  async execute() {
    const items = this.getInputData();
    const returnItems = [];
    const tokenCache = {};

    // Load client credentials once
    const oauthCreds = await this.getCredentials('msGraphOAuth2Api');
    const clientId = oauthCreds.clientId || oauthCreds.client_id;
    const clientSecret = oauthCreds.clientSecret || oauthCreds.client_secret;

    for (let i = 0; i < items.length; i++) {
      try {
        const tenantId = this.getNodeParameter('tenantId', i);

        // Fetch or reuse token for this tenant inline
        let accessToken = tokenCache[tenantId];
        if (!accessToken) {
          // Inline getAccessTokenForTenant
          const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/token`;
          const params = new URLSearchParams();
          params.append('grant_type', 'client_credentials');
          params.append('client_id', clientId);
          params.append('client_secret', clientSecret);
          params.append('resource', 'https://graph.microsoft.com');

          const tokenResponse = await this.helpers.request({
            method: 'POST',
            url: tokenUrl,
            body: params.toString(),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            json: true,
          });

          if (!tokenResponse.access_token) {
            throw new Error(`Failed to retrieve access token for tenant ${tenantId}`);
          }
          accessToken = tokenResponse.access_token;
          tokenCache[tenantId] = accessToken;
        }

        // Build request parameters
        const method = this.getNodeParameter('method', i);
        const url = this.getNodeParameter('url', i);
        const qsParams = this.getNodeParameter('queryParameters.parameter', i, []);
        const qs = qsParams.reduce((obj, p) => { obj[p.name] = p.value; return obj; }, {});

        let body;
        let contentType = 'application/json'; // default
        let bodyContentType = 'json'; // default
        
        if (['POST','PATCH','PUT'].includes(method)) {
          bodyContentType = this.getNodeParameter('bodyContentType', i, 'json');
          
          switch (bodyContentType) {
            case 'json':
              body = this.getNodeParameter('body', i, '');
              if (typeof body === 'string' && body.trim()) {
                try { 
                  body = JSON.parse(body); 
                } catch {
                  throw new NodeOperationError(this.getNode(), 'Body must be valid JSON');
                }
              }
              contentType = 'application/json';
              break;
              
            case 'text':
              body = this.getNodeParameter('bodyText', i, '');
              contentType = 'text/plain';
              break;
              
            case 'form':
              const formParams = this.getNodeParameter('bodyForm.parameter', i, []);
              const formData = new URLSearchParams();
              formParams.forEach(param => {
                if (param.name) {
                  formData.append(param.name, param.value || '');
                }
              });
              body = formData.toString();
              contentType = 'application/x-www-form-urlencoded';
              break;
          }
        }

        // Build headers with defaults
        const headers = { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' };
        if (body !== undefined && body !== null && body !== '') {
          headers['Content-Type'] = contentType;
        }

        // Add custom headers
        const customHeaders = this.getNodeParameter('customHeaders.header', i, []);
        customHeaders.forEach(header => {
          if (header.name && header.value) {
            // Prevent overriding Authorization header for security
            if (header.name.toLowerCase() !== 'authorization') {
              headers[header.name] = header.value;
            }
          }
        });

        const responseFormat = this.getNodeParameter('responseFormat', i, 'json');
        
        // Microsoft Graph API always returns JSON responses, so always parse as JSON
        const requestOptions = { 
          method, 
          url, 
          headers, 
          qs, 
          body,
          json: true, // Always parse as JSON since Microsoft Graph API always returns JSON
          resolveWithFullResponse: true 
        };

        // Throttle retry
        const throttle = { enabled: true, delay: 2, maxRetries: 5 };
        let response;
        let retryCount = 0;
        while (true) {
          try {
            const fullResp = await this.helpers.request(requestOptions);
            response = fullResp.body;
            break;
          } catch (error) {
            if (error.statusCode === 429 && throttle.enabled && retryCount < throttle.maxRetries) {
              retryCount++;
              const retryAfter = error.headers?.['retry-after'] || throttle.delay;
              await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
              continue;
            }
            throw error;
          }
        }

        let output = response;
        if (responseFormat === 'string') output = typeof response === 'object' ? JSON.stringify(response) : String(response);

        returnItems.push({ json: output });
      } catch (err) {
        if (this.continueOnFail()) {
          returnItems.push({ json: { error: err.message } });
        } else {
          throw err;
        }
      }
    }

    return this.prepareOutputData(returnItems);
  }
}

exports.MsGraph = MsGraph;
