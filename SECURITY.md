# Security Policy

## Supported Scope

This policy applies to the Constella web repository, including:

- Vue frontend code
- Electron integration and preload bridges
- Client-side authentication handling
- Local persistence related to the desktop app

## How to Report a Vulnerability

Please do **not** open a public GitHub issue for security reports.

Instead:

- Contact the repository maintainer privately through GitHub
- If GitHub Security Advisories are enabled for this repository, prefer that channel

Include as much detail as possible:

- Affected feature or file
- Reproduction steps
- Impact assessment
- Screenshots, logs, or proof of concept if safe to share

## What to Report

Examples include:

- Authentication or session handling weaknesses
- Electron bridge abuse or privilege escalation
- Sensitive data exposure
- Unsafe handling of external links, file access, or local storage
- XSS, injection, or untrusted content rendering issues

## Response Expectations

The maintainer will try to:

- Acknowledge the report within 7 days
- Confirm whether the issue is in scope
- Share a remediation update when a fix plan exists

## Disclosure

Please allow reasonable time for investigation and a fix before any public disclosure.
