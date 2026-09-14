# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.1.x   | :white_check_mark: |
| 1.0.x   | :x:                |

## Local-First Security Architecture
ScaleUp is designed as a **100% local, offline-capable application**:
- No telemetry, analytics, or images are transmitted to any cloud or external network.
- File uploads and outputs are stored strictly within the local host storage (`backend/storage/`).
- An automated cleanup task runs hourly to purge old temporary session artifacts.

## Reporting a Vulnerability
If you discover a potential security vulnerability in ScaleUp, please do not disclose it publicly in an open issue. Instead, report it via GitHub Security Advisories or by contacting the maintainer directly. We will respond within 48 hours to assess and address the report.
