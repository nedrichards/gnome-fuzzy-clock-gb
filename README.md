# Fuzzy Clock GB

A GNOME Shell extension that replaces the panel time with an opinionated British English fuzzy time while keeping the existing date menu behaviour. No matter what your locale is - this part of it will behave as if you're in en_GB.

## Scope

- Supports GNOME Shell `45` through `50`
- Changes only the panel label text

## Install

For a local checkout install, run:

```sh
./scripts/install-local.sh
gnome-extensions enable fuzzy-clock-gb@nedrichards
```

If GNOME Shell does not pick it up immediately, restart the shell on X11 or log out and back in on Wayland.

To build a distributable zip instead:

```sh
./scripts/package.sh
```

## Development

Run the formatter tests with:

```sh
npm test
```

Install the extension from this checkout into your local GNOME Shell extensions directory with:

```sh
./scripts/install-local.sh
```

Disable the installed extension with:

```sh
./scripts/disable-local.sh
```

Create a distributable zip with:

```sh
./scripts/package.sh
```

---
*Co authored with Codex, and although I don't think it would fall foul of the policy you're unlikely to find this on [extensions.gnome.org](https://gjs.guide/extensions/review-guidelines/review-guidelines.html#extensions-must-not-be-ai-generated) because being respectful is important.*
