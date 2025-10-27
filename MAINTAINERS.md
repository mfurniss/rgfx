# RGFX Maintainers

This document outlines the current maintainers of the RGFX project and provides guidelines for project governance and contribution.

## Current Maintainers

### Lead Maintainer

**Matt Furniss**
- Email: furniss@gmail.com
- GitLab: [@furniss](https://gitlab.com/furniss)
- Role: Project creator, lead developer, and primary maintainer
- Responsibilities:
  - Overall project direction and architecture decisions
  - Code review and merge request approval
  - Release management and version control
  - CI/CD pipeline maintenance
  - Community management and issue triage

## Contribution Process

### How to Contribute

RGFX welcomes contributions from the community! We follow a feature branch workflow with mandatory CI/CD checks.

**Steps to contribute:**

1. **Fork the repository** on GitLab
2. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** following our code quality standards
4. **Test thoroughly** - All CI checks must pass:
   - TypeScript compilation (`npm run typecheck`)
   - ESLint checks (`npm run lint`)
   - Unit tests (`npm test`)
   - ESP32 compilation (`pio run`)
5. **Commit with clear messages** following conventional commit style
6. **Push to your fork** and create a merge request
7. **Respond to feedback** during code review
8. **Wait for approval** from a maintainer

### Code Quality Requirements

**Mandatory Standards (CI enforced):**
- ✅ Zero TypeScript errors
- ✅ Zero ESLint errors or warnings
- ✅ All unit tests passing
- ✅ ESP32 firmware compiles successfully
- ✅ Lua scripts pass StyLua formatting and luacheck

**Best Practices:**
- Write meaningful tests (no shallow coverage tests)
- Add comments for complex logic
- Keep functions small and focused
- Use descriptive variable and function names
- Update documentation for significant changes
- Follow existing code style and patterns

See [.claude/CLAUDE.md](.claude/CLAUDE.md) for comprehensive development guidelines.

## Code Review Process

### Review Timeline

- **Initial Response**: Within 3-5 business days
- **Full Review**: Within 7-14 days depending on complexity
- **Small Fixes**: May be reviewed and merged within 24-48 hours

### Review Criteria

Maintainers evaluate merge requests based on:

1. **Correctness** - Does the code work as intended?
2. **Code Quality** - Is it clean, readable, and maintainable?
3. **Testing** - Are there adequate tests? Do they test real behavior?
4. **Documentation** - Are docs updated? Are complex sections commented?
5. **Architecture** - Does it fit the overall system design?
6. **Performance** - Are there any obvious performance issues?
7. **Security** - Are there any security concerns?

### Merge Authority

- **Lead Maintainer** - Can merge any MR after review
- **Protected Branch** - `main` branch requires MR approval (no direct pushes)
- **CI/CD Gate** - All automated checks must pass before merge is possible

## Issue Triage

### Issue Labels

We use GitLab labels to categorize issues:

- `bug` - Something isn't working correctly
- `enhancement` - New feature or improvement request
- `documentation` - Documentation improvements
- `good first issue` - Good for newcomers to the project
- `help wanted` - Community contributions especially welcome
- `priority:high` - Critical issues requiring immediate attention
- `priority:medium` - Important but not urgent
- `priority:low` - Nice-to-have improvements

### Issue Response

- **Bug Reports**: Acknowledged within 2-3 business days
- **Feature Requests**: Acknowledged within 1 week
- **Questions**: Answered within 3-5 business days

## Release Management

### Versioning

RGFX follows [Semantic Versioning](https://semver.org/):
- **MAJOR.MINOR.PATCH** (e.g., 1.2.3)
- MAJOR - Breaking changes
- MINOR - New features (backward compatible)
- PATCH - Bug fixes (backward compatible)

### Release Process

Releases are triggered by git tags and managed via GitLab CI/CD:

1. **Create tag** on `main` branch: `git tag v1.0.0`
2. **Push tag**: `git push origin v1.0.0`
3. **CI builds artifacts**: DMG installer, ESP32 firmware
4. **Manual approval**: Click "Play" on release job in GitLab
5. **Release published**: GitLab Release with artifacts attached

See [docs/release-workflow.md](docs/release-workflow.md) for detailed instructions.

## Decision Making

### Architecture Decisions

Major architectural decisions are made by the lead maintainer with community input:

1. **Proposal** - Create GitLab issue describing the change
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

- **GitLab Issues** - Bug reports, feature requests, discussions
- **GitLab Merge Requests** - Code contributions and reviews
- **Email** - Direct contact with maintainers (furniss@gmail.com)

### Response Expectations

Maintainers are volunteers. Please allow reasonable time for responses:

- **Issues**: 2-5 business days
- **Merge Requests**: 3-14 days depending on complexity
- **Email**: 3-7 business days

## Becoming a Maintainer

The RGFX project is currently maintained by its creator. As the community grows, additional maintainers may be added based on:

- **Consistent high-quality contributions** over 6+ months
- **Deep understanding** of the codebase and architecture
- **Positive community interaction** and helpful code reviews
- **Alignment with project values** and coding standards
- **Availability and commitment** to ongoing maintenance

Maintainer status is granted by the lead maintainer after discussion with existing maintainers (when applicable).

## Code of Conduct

### Expected Behavior

- **Be respectful** - Treat all contributors with respect
- **Be constructive** - Provide helpful, actionable feedback
- **Be patient** - Maintainers are volunteers with limited time
- **Be collaborative** - Work together to improve the project
- **Be professional** - Keep discussions technical and on-topic

### Unacceptable Behavior

- Personal attacks or harassment
- Discriminatory language or behavior
- Spam or off-topic discussions
- Demanding immediate responses
- Aggressive or hostile communication

Violations may result in warnings, temporary bans, or permanent bans at maintainer discretion.

## License

All contributions to RGFX must be compatible with the **Mozilla Public License 2.0 (MPL-2.0)**.

By submitting a contribution, you agree that:
- Your contribution is your original work or properly licensed
- You grant the project the right to use your contribution under MPL-2.0
- You have the authority to grant these rights

## Contact

For questions about contributing or project governance:

**Matt Furniss**
Email: furniss@gmail.com
GitLab: [@furniss](https://gitlab.com/furniss)

---

**Thank you for contributing to RGFX!**

*Last updated: 2025-10-27*
