---
name: thread-list
description: "Inspect or change the sidebar thread list's layout preferences: organization mode, sort, section order, hidden groups, collapsed groups, and thread row actions."
---

# Thread list preferences

The Thread list plugin owns the sidebar's layout state. Read it with
`cc thread-list prefs list --json`; keys are `showProviderIcons`, `threadLifecycles`, `organizationMode`,
`environmentGrouping`, `chronologicalSort`, `sortDirection`, `sectionOrder`,
`manualSectionOrder`, `machineSectionOrder`, `hiddenGroups` (including the
built-in `threads` group), `rowActions`,
`collapsedSections`, `collapsedProjects`, `collapsedThreads`,
`collapsedEnvironments`, `collapsedThreadSections`, and `collapsedMachines`.

```sh
cc thread-list prefs list [--json]
cc thread-list prefs get <key> [--json]
cc thread-list prefs set <key> <value> [--json]
cc thread-list prefs reset <key> [--json]
```

`set` takes JSON; a bare word is read as a string, so
`cc thread-list prefs set organizationMode machine` and
`cc thread-list prefs set manualSectionOrder '["pinned","sections","threads"]'`
both work. A value the key's schema rejects fails with
`invalid_preference_value` and leaves the stored value alone. Every open
window applies a change immediately. Sections themselves and a thread's
section are cc core state: use `cc thread section` and `cc thread update`.

On first load the plugin copies any non-default `sidebar.*` values from
`cc settings ui` once; after that the two are independent.

The header's Filter menu selects Active, Archived, or both; at least one must
remain selected. `cc thread-list prefs set threadLifecycles '["archived"]'`
shows archived threads, and `'["active","archived"]'` shows both. The default
is `'["active"]'`. Archived results load in pages; use Show more at the end
of the list. The same preference is available through `setPreference` RPC.

`rowActions` picks up to three quick-action buttons a thread row shows on
hover, left to right before its actions menu. Choose from `split`, `copyLink`, `read`,
`pin`, `move` (opens a section menu), `rename`, and `archive`; the default is `'["archive"]'` and `'[]'`
leaves only the menu. For example,
`cc thread-list prefs set rowActions '["pin","archive"]'`. In the app, a thread
row's actions menu has Customize row actions, which previews the row's three
action slots; each slot picks an action or Hide, and filled slots drag to reorder.

Organize → Rows → Provider icons toggles the icon before each thread title.
`showProviderIcons` defaults to `false`; use
`cc thread-list prefs set showProviderIcons true` to show them. Unknown
provider ids have no icon.
