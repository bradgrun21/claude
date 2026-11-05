# Art pack goes here

Drop the `.glb` / `.gltf` files from a CC0 pack in this folder (subfolders are fine):

- Kenney **City Kit (Suburban)** — https://kenney-assets.itch.io/city-kit-suburban → copy everything inside `Models/GLB format/`
- KayKit **City Builder Bits** — https://kaylousberg.itch.io/city-builder-bits → copy everything inside `Assets/gltf/` (keep each `.gltf` next to its `.bin` and texture)

`npm run dev` and `npm run build` scan this folder and write `manifest.json`.
Houses, trees, street lamps and cars are picked up by file name. Anything missing keeps the code-made model.
To choose files by hand, add `roles.json`, for example:

```json
{ "house": ["building-type-a.glb", "building-type-d.glb"], "tree": ["tree-large.glb", "tree-small.glb"] }
```
