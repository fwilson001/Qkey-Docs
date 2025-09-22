# Contributing to QKey Public Converter

Thank you for your interest in contributing to the QKey Public Converter! This document provides guidelines and information for contributors.

## Code of Conduct

Please be respectful and constructive in all interactions related to this project.

## License

By contributing to this project, you agree that your contributions will be licensed under the project's GPL-3.0 license (see LICENSE).

## How to Contribute

1. Fork the repository
2. Create a feature branch
   ```
   git checkout -b feature/your-feature-name
   ```
3. Make your changes
4. Run tests
   ```
   npm run test   # For JavaScript version
   python -m unittest   # For Python version
   ```
5. Submit a pull request

## Development Guidelines

Code Style

- JavaScript: Follow the project's ESLint configuration
- Python: Follow PEP 8 style guide

Documentation

- Document all public methods and classes
- Update the README.md if necessary
- Add examples for new functionality

Testing

- Write tests for new functionality
- Ensure all existing tests pass

## Feature Scope

The QKey Public Converter is the open source edition of QKey and only includes features available in the GPL-3.0 version.

Acceptable contributions include:
- Bug fixes
- Performance improvements for existing features
- Documentation improvements
- New features that don't conflict with commercial features

Contributions that won't be accepted:
- Implementation of commercial features:
   - Advanced QKB compression algorithms
   - Streaming API
   - Enterprise security features
   - High-performance binary formats

For details on which features are open source vs. commercial, see FEATURES.md.

## Getting Help

If you have questions about contributing, please:
- Open an issue with your question
- Contact the maintainers at <opensource@Querykey.com>

Thank you for contributing to QKey!
