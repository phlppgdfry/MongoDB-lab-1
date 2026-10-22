# Security policy

## Supported versions

Only the latest version on the default branch is actively maintained.

## Reporting a vulnerability

Please do not open a public issue for a suspected security vulnerability. Use GitHub's private vulnerability reporting for this repository, or contact the repository owner privately through GitHub.

When reporting, include the affected file or endpoint, reproduction steps, impact, and a suggested mitigation if available.

## Safe configuration

- Never commit `.env`, Atlas credentials, or Ollama API keys.
- Use a least-privilege database user for applications.
- Restrict Atlas Network Access to known deployment egress IPs.
- Keep rate limiting and request validation enabled when deploying the demo.
