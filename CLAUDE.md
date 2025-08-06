# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an n8n community node package that provides Microsoft Graph API access with multi-tenant capabilities. It's a TypeScript project that compiles to CommonJS for use in n8n workflows.

## Build Commands

- `npm run build` - Compile TypeScript to JavaScript (runs `tsc`)
- `npm run dev` - Watch mode for development (runs `tsc --watch`)

## Custom Commands

- `/publish [version-type] [--otp=XXXXXX]` - Automated git commit, push, and npm publish
  - Supports version bumping: patch, minor, major
  - Includes safety checks and OTP support for 2FA
  - Example: `/publish patch --otp=123456`

Note: This repository contains only compiled JavaScript files in `/dist`. There are no TypeScript source files (.ts) in version control - only the compiled output and type declarations.

## Architecture

### Core Components

1. **MsGraph Node** (`dist/nodes/MsGraph.node.js`)
   - Main n8n node implementation
   - Handles multi-tenant OAuth authentication inline
   - Supports GET, POST, PATCH, PUT, DELETE operations
   - Caches access tokens per tenant to avoid redundant auth calls
   - Processes items in batches with per-tenant authentication

2. **OAuth Credentials** (`dist/credentials/MsGraphOAuth2Api.credentials.js`)
   - Defines credential schema for Microsoft Graph OAuth2
   - Required fields: clientId, clientSecret, scope
   - Used with multi-tenant Azure AD app registration

### n8n Integration

The package follows n8n node package conventions:
- Main entry point: `index.js`
- Node manifest in `package.json` under `n8n` property
- Icon file: `icons/icon.svg` and `dist/icons/msgraph.svg`
- Credentials and nodes registered in package.json

### Multi-Tenant Flow

1. Each workflow item can specify a different tenant ID
2. The node fetches OAuth tokens per tenant using client credentials flow
3. Tokens are cached within the execution to minimize API calls
4. Each request includes the tenant-specific access token

## Development Notes

- Target: ES2020, Module: CommonJS (n8n requirement)
- No test infrastructure currently
- No linting configuration (though ESLint packages are installed)
- Published to npm as `@flagbit/n8n-nodes-msgraph`