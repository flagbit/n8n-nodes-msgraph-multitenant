# /publish - Automated Package Publishing

## Purpose
Automatically commit changes, push to git, and publish the package to npm registry.

## Usage
```
/publish [version-type] [--otp=XXXXXX] [--dry-run]
```

## Arguments
- `version-type` - Optional version bump: patch, minor, major (default: current version)
- `--otp=XXXXXX` - One-time password for npm 2FA
- `--dry-run` - Show what would be published without actually doing it

## Execution Steps
1. Check git status and ensure clean working directory
2. Build the project (`npm run build`)
3. Optionally bump version if version-type provided
4. Stage and commit all changes with automated message
5. Push changes to remote repository
6. Publish package to npm with public access
7. Verify successful publication

## Examples
```
/publish                    # Publish current version
/publish patch             # Bump patch version and publish
/publish minor --otp=123456 # Bump minor version with OTP
/publish --dry-run         # Show what would happen
```

## Safety Checks
- Requires clean git working directory
- Builds project before publishing
- Uses `--access public` for scoped packages
- Includes OTP support for 2FA accounts
- Provides detailed logging of all steps

## Implementation
This command combines git operations and npm publishing in a single workflow:
- Git: status, add, commit, push
- NPM: build, version, publish, verify
- Safety: dry-run mode, OTP support, error handling