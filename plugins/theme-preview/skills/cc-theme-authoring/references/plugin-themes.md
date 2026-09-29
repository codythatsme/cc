## Shipping a theme in a plugin

A plugin can contribute themes via its manifest instead of the theme dir:

```json
"cc": { "themes": [{ "id": "mine", "name": "Mine", "css": "./themes/mine.css" }] }
```

cc lists it as `plugin:<pluginId>:mine`. Theme Preview resolves the CSS through
the manifest, so chips and live reload work the same way. Install with
`cc plugin install path:<dir> --yes`, reload with `cc plugin reload <pluginId>`
after CSS edits.
