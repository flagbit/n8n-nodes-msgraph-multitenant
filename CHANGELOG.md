# Changelog

## Package Rename Notice
This package has been renamed from `n8n-nodes-msgraph-multitenant` to `@flagbit/n8n-nodes-msgraph`.
Author: Jörg Weller <joerg.weller@flagbit.de>

## [0.1.9] - 2025-01-09

### Added
- **Multiple Body Content Types**: Support for different request body formats
  - JSON (default): Send structured JSON data
  - Text: Send plain text content
  - Form Data: Send URL-encoded form data
  - Dynamic Content-Type header based on selected body type

### Fixed
- Removed restriction that body must always be valid JSON
- Proper Content-Type header setting for non-JSON requests

### Technical Details
- Added `bodyContentType` option to select between json, text, and form
- Separate input fields for each body type with appropriate UI
- Automatic Content-Type header: application/json, text/plain, or application/x-www-form-urlencoded

## [0.1.8] - 2025-01-09

### Added
- **Custom Headers Support**: Added ability to specify custom HTTP headers in Microsoft Graph API requests
  - New `customHeaders` property in node configuration
  - Accepts multiple header name-value pairs
  - Security: Prevents overriding the Authorization header
  - Useful for API versioning, preferences, and advanced scenarios

### Changed
- Updated node properties to include custom headers configuration
- Enhanced request building logic to merge custom headers with defaults
- Updated documentation to reflect new feature

### Security
- Authorization header cannot be overridden through custom headers for security reasons
- All authentication continues to use the secure OAuth2 token mechanism

### Examples
```javascript
// Using custom headers for advanced API scenarios
customHeaders: {
  header: [
    { name: "Prefer", value: "odata.maxpagesize=999" },
    { name: "ConsistencyLevel", value: "eventual" },
    { name: "x-api-version", value: "beta" }
  ]
}
```

## [0.1.7] - Previous Release
- Initial multi-tenant support
- Token caching per tenant
- Rate limit handling