# RGFX Maintainers

This document outlines the current maintainers of the RGFX project and provides guidelines for project governance and contribution.

## Current Maintainers

### Lead Maintainer

**Matt Furniss**
- GitHub: [@mfurniss](https://github.com/mfurniss)
- Role: Project creator, lead developer, and primary maintainer
- Responsibilities:
  - Overall project direction and architecture decisions
  - Code review and pull request approval
  - Release management and version control
  - CI/CD pipeline maintenance
  - Community management and issue triage

## Contribution Process

For development setup, code standards, and how to submit changes, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Code Review Process

### Review Timeline

- **Initial Response**: Within 7 days
- **Full Review**: 7-14 days depending on complexity
- **Small Fixes**: May be reviewed sooner

### Review Criteria

Maintainers evaluate pull requests based on:

1. **Correctness** - Does the code work as intended?
2. **Code Quality** - Is it clean, readable, and maintainable?
3. **Testing** - Are there adequate tests? Do they test real behavior?
4. **Documentation** - Are docs updated? Are complex sections commented?
5. **Architecture** - Does it fit the overall system design?
6. **Performance** - Are there any obvious performance issues?
7. **Security** - Are there any security concerns?

### Merge Authority

- **Lead Maintainer** - Can merge any PR after review
- **Protected Branch** - `main` branch requires PR approval (no direct pushes)
- **CI/CD Gate** - All automated checks must pass before merge is possible

## Issue Triage

### Issue Labels

We use GitHub labels to categorize issues:

- `bug` - Something isn't working correctly
- `enhancement` - New feature or improvement request
- `documentation` - Documentation improvements
- `good first issue` - Good for newcomers to the project
- `help wanted` - Community contributions especially welcome
- `priority:high` - Critical issues requiring immediate attention
- `priority:medium` - Important but not urgent
- `priority:low` - Nice-to-have improvements

### Issue Response

- **Bug Reports**: Acknowledged within 7 days
- **Feature Requests**: Acknowledged within 7 days
- **Questions**: Answered within 7 days

## Release Management

### Versioning

RGFX follows [Semantic Versioning](https://semver.org/):
- **MAJOR.MINOR.PATCH** (e.g., 1.2.3)
- MAJOR - Breaking changes
- MINOR - New features (backward compatible)
- PATCH - Bug fixes (backward compatible)

### Release Process

Releases are managed via a one-click GitHub Actions workflow:

1. **Trigger**: GitHub → Actions → Release → Run workflow → enter version (e.g., `v1.0.0`)
2. **Automated steps**: Validates, runs quality checks, bumps version, tags, builds
3. **Build artifacts**: macOS DMG, Windows EXE, ESP32 firmware
4. **Release published**: GitHub Release with installers attached

## Decision Making

### Architecture Decisions

Major architectural decisions are made by the lead maintainer with community input:

1. **Proposal** - Create GitHub issue describing the change
2. **Discussion** - Community provides feedback and alternatives
3. **Decision** - Lead maintainer makes final call based on:
   - Technical merit
   - Alignment with project goals
   - Community consensus
   - Maintenance burden
4. **Documentation** - Update architecture.md and CLAUDE.md

### Feature Acceptance

New features must align with project goals:

✅ **Accepted:**
- Improvements to game event detection
- New game interceptors
- LED effect enhancements
- Performance optimizations
- Documentation improvements
- Bug fixes

⚠️ **Requires Discussion:**
- New hardware platform support
- Major UI changes
- Breaking API changes
- New dependencies

❌ **Typically Rejected:**
- Features that bloat the core system
- Platform-specific hacks
- Changes that compromise performance
- Unnecessary complexity

## Communication Channels

### Primary Channels

- **GitHub Issues** - Bug reports, feature requests, discussions
- **GitHub Pull Requests** - Code contributions and reviews

### Response Expectations

Maintainers are volunteers. Please allow reasonable time for responses:

- **Issues**: Within 7 days
- **Pull Requests**: Within 7 days

## Becoming a Maintainer

The RGFX project is currently maintained by its creator. As the community grows, additional maintainers may be added based on:

- **Consistent high-quality contributions** over 6+ months
- **Deep understanding** of the codebase and architecture
- **Positive community interaction** and helpful code reviews
- **Alignment with project values** and coding standards
- **Availability and commitment** to ongoing maintenance

Maintainer status is granted by the lead maintainer after discussion with existing maintainers (when applicable).

## Code of Conduct

This project follows the [Contributor Covenant v2.1](CODE_OF_CONDUCT.md). All participants are expected to uphold this code.

## License

All contributions to RGFX must be compatible with the **Mozilla Public License 2.0 (MPL-2.0)**.

By submitting a contribution, you agree that:
- Your contribution is your original work or properly licensed
- You grant the project the right to use your contribution under MPL-2.0
- You have the authority to grant these rights

## Contact

For questions about contributing or project governance:

**Matt Furniss** — [@mfurniss](https://github.com/mfurniss)

---

**Thank you for contributing to RGFX!**

*Last updated: 2026-03-13*
