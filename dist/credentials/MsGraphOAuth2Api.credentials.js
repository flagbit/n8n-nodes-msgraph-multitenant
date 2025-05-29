"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MsGraphOAuth2Api = void 0;
class MsGraphOAuth2Api {
    constructor() {
        this.name = 'msGraphOAuth2Api';
        this.displayName = 'Microsoft Graph OAuth2 API';
        this.documentationUrl = 'https://docs.microsoft.com/en-us/graph/auth-v2-user';
        this.properties = [
            {
                displayName: 'Client ID',
                name: 'clientId',
                type: 'string',
                default: '',
                required: true,
            },
            {
                displayName: 'Client Secret',
                name: 'clientSecret',
                type: 'string',
                typeOptions: {
                    password: true,
                },
                default: '',
                required: true,
            },
            {
                displayName: 'Scope',
                name: 'scope',
                type: 'string',
                default: 'offline_access user.read',
                description: 'Space-separated list of scopes to request',
                required: true,
            },
            {
                displayName: 'Authentication',
                name: 'authentication',
                type: 'options',
                options: [
                    {
                        name: 'Body',
                        value: 'body',
                    },
                    {
                        name: 'Header',
                        value: 'header',
                    },
                ],
                default: 'header',
            },
        ];
    }
}
exports.MsGraphOAuth2Api = MsGraphOAuth2Api;