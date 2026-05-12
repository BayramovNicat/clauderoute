# ClaudeRoute PRD

## Summary

ClaudeRoute is a local desktop/web utility for configuring Claude Code routing through OmniRoute. It lets users review active OmniRoute providers, inspect available models, choose Claude-related environment values, and enable local desktop notifications for Claude Code lifecycle events.

## Problem

Claude Code users who route requests through OmniRoute need a simple way to see which providers are active, choose model defaults, and update local Claude settings without manually editing `~/.claude/settings.json`. Manual configuration is error-prone, especially for API keys, model IDs, and notification hooks.

## Goals

- Provide a local UI for editing Claude Code environment settings.
- Show active OmniRoute providers and the models available for each provider.
- Populate model setting controls from OmniRoute provider/model data when available.
- Support enabling or disabling desktop notifications for Claude Code stop and permission events.
- Preserve the user's existing Claude settings file content outside the fields managed by the app.
- Package as a Bun-powered local app and optional macOS app wrapper.

## Non-goals

- Manage OmniRoute accounts, billing, or provider authentication directly.
- Replace the full Claude Code configuration surface.
- Store settings in a remote service.
- Support multi-user or team administration.
- Provide full cross-platform native desktop notification management beyond the current local hook behavior.

## Target users

- Claude Code users who use OmniRoute as a provider/model router.
- Developers who frequently switch Claude model defaults.
- Users who prefer a local visual settings editor over manually editing JSON.

## Core user flows

### Edit local Claude settings

1. User opens ClaudeRoute locally.
2. App loads `~/.claude/settings.json`.
3. User edits environment values:
   - `ANTHROPIC_BASE_URL`
   - `ANTHROPIC_API_KEY`
   - `ANTHROPIC_MODEL`
   - `ANTHROPIC_DEFAULT_SONNET_MODEL`
   - `ANTHROPIC_DEFAULT_OPUS_MODEL`
   - `ANTHROPIC_DEFAULT_HAIKU_MODEL`
4. App marks the form as having unsaved changes.
5. User clicks Save.
6. App writes updated values back to `~/.claude/settings.json`.
7. App confirms changes are saved.

### Choose model defaults

1. App loads provider and model data from OmniRoute.
2. App merges custom and built-in model lists.
3. Model-related setting fields show selectable provider/model IDs.
4. User chooses desired defaults.
5. User saves the settings.

### Review active providers

1. User opens ClaudeRoute.
2. App fetches active providers from OmniRoute.
3. App displays each provider, account identifier, health/status, and available models.
4. User can refresh the provider list.

### Handle OmniRoute authentication

1. App requests provider/model data from OmniRoute.
2. If OmniRoute requires authentication, app opens or links to the OmniRoute login page.
3. If authentication still fails after returning, app shows a clear authentication-required message and cookie debug info.

### Enable desktop notifications

1. User toggles Desktop notifications in the settings list.
2. User clicks Save.
3. App adds or removes owned Claude Code hooks for:
   - `Stop`
   - `PermissionRequest`
4. Existing unrelated hooks remain preserved.

## Functional requirements

### Settings editor

- Must read settings from `~/.claude/settings.json`.
- Must create the settings file directory if it does not exist when saving.
- Must preserve existing JSON fields not managed by ClaudeRoute.
- Must validate that `env` is an object.
- Must validate environment variable names and string values before saving.
- Must prevent saving when the existing settings file contains invalid JSON.
- Must mask secret values such as `ANTHROPIC_API_KEY` by default.
- Must allow users to reveal or hide secret input values locally.
- Must show dirty/saved state.
- Must disable Save when there are no changes.

### Provider/model display

- Must fetch active providers from OmniRoute.
- Must fetch custom provider models from OmniRoute.
- Must fetch built-in provider models when possible.
- Must merge custom models ahead of built-in models for the same provider.
- Must show active providers with account identifier and status.
- Must show a useful empty state when no providers or models are returned.
- Must show provider errors when OmniRoute reports them.

### Authentication handling

- Must detect OmniRoute redirects, 401/403 responses, and login HTML pages.
- Must redirect the user to OmniRoute login on first authentication failure.
- Must avoid infinite login loops by tracking attempted login in session storage.
- Must show a retry/login action if authentication still fails.

### Desktop notifications

- Must expose desktop notifications as a simple toggle in the settings list.
- Must add owned notification hooks only when enabled.
- Must remove only hooks owned by ClaudeRoute when disabled.
- Must not remove unrelated user hooks.

### Local app runtime

- Must run a local Bun HTTP server.
- Must serve bundled frontend assets.
- Must open the app in a browser by default outside development mode.
- Must support live reload during development.
- Must support building a single-file Bun binary.
- Should support building a macOS `.app` wrapper.

## UX requirements

- Settings should be simple and direct: Save at the top, followed by a flat list of fields and toggles.
- The settings area should avoid unnecessary nested wrappers, section headers, and divider lines.
- Provider details can remain visually grouped because each provider is a distinct entity.
- Errors must be visible near the related content.
- The UI should remain usable in a narrow viewport.

## Security and privacy requirements

- The app must run locally and avoid sending Claude settings to any service other than the intended local save endpoint.
- API keys must not be logged or displayed in plaintext unless the user explicitly reveals them in the input.
- Settings file writes should use restrictive file permissions where supported.
- The app must validate user-provided settings JSON shape before writing.
- The app must preserve unrelated settings and hooks to avoid destructive configuration changes.

## Success metrics

- User can configure Claude Code routing without manually editing JSON.
- User can identify active OmniRoute providers and their available models in one screen.
- User can save model defaults and notification preferences successfully.
- Invalid settings files produce clear errors instead of silent data loss.
- No unrelated `~/.claude/settings.json` fields are removed during save.

## Open questions

- Should ClaudeRoute eventually manage additional Claude Code settings beyond `env` and notification hooks?
- Should provider login happen in an embedded macOS WebKit view for the app bundle?
- Should the app support non-macOS desktop notifications?
- Should users be able to add custom environment variables beyond the current fixed list?
- Should provider/model data be cached when OmniRoute is unavailable?
