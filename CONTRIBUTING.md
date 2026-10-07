# Contributing

## Project layout

- `src/index.ts` is the package entry point. Everything public is re-exported from it.
- `src/Ktx2Factory.ts` and `src/Ktx2Texture.ts` implement `IKtx2Factory` and `IKtx2Texture` on top of libktx. `Ktx2Texture` and `Mapper` are marked `@internal`.
- `src/createKtxModuleAsync.ts` loads `libktx.wasm` and evaluates the `libktx.js` glue. It must keep working on the main thread and in a Web Worker, with no `document` or `window`.
- The other files in `src/` are the public interfaces, enumerations, and `TextureFormatInfo`.
- `tests/` holds the Vitest tests. They use a mocked libktx module and do not load the WebAssembly build.
- `libktx.js` and `libktx.wasm` are the Khronos build. Do not edit them.

The package is browser-only. Do not import `node:*` modules from `src/`. The library build fails if a published chunk imports `node:fs`.

## Local checks

Run these before opening a pull request:

```sh
npm ci
npx tsc --noEmit -p .
npm test
npm run build
npm run docs
```

`npm run docs` writes the TypeDoc site to `docs/api/`, which is gitignored. `typedoc.json` treats warnings as errors and leaves out `@internal` symbols, so a broken `{@link}` fails the build. CI does not run TypeDoc. The docs workflow on `main` does.

Public symbols are documented with TSDoc. That text is the API reference, so keep it in step with the implementation.

## Branches

- `development` is the integration branch. Pushes publish an npm prerelease.
- `main` is the release branch. Pushes publish the `package.json` version when it is not already on npm.
- Do feature work on a feature branch and open pull requests against `development`. Merge `development` into `main` to release.
- CI runs on pull requests against `development` or `main`, and on pushes to both branches.

## Version

`package.json` `version` is a release version, for example `0.1.0`. Do not put a prerelease suffix there. The publish workflow rejects versions that contain `-`.

When work toward the next release starts, change `version` on `development` in a normal commit (for example `0.1.0` to `0.1.1`) and add a `CHANGELOG.md` entry. Pushes then publish `0.1.1-dev.<run number>` with the npm dist-tag `next`. Merging that commit to `main` publishes `0.1.1` with the dist-tag `latest`, tags `v0.1.1`, and creates a GitHub release.

For `development` prereleases, the workflow changes `package.json` only on the runner (`npm version --no-git-tag-version`). That change is not committed.

## Workflows

`.github/workflows/ci.yml` runs `npm ci`, `npm run build`, and `npm test`.

`.github/workflows/publish.yml` runs the same three commands before publishing:

- `development` publishes `<version>-dev.<GitHub run number>` to the dist-tag `next`. A re-run appends `.<run attempt>` so the version stays unique.
- `main` publishes `<version>` to the dist-tag `latest` only when `npm view` does not already list that version. It then creates the tag `v<version>` and a GitHub release for the pushed commit. If the version is already on npm, the job skips the publish, the tag, and the release.

`npm publish` uses `--provenance`. `publishConfig.access` is `public`.

`.github/workflows/docs.yml` builds the TypeDoc site and deploys `docs/api/` to GitHub Pages on pushes to `main`, or when started by hand. The reference is published at https://luka712.github.io/ris-ktx2-ts/.

## Repository settings

The workflows do not create branches or change settings. The repository owner configures:

1. Actions secret `NPM_TOKEN`: an npm Automation token, or a granular access token with publish access to `ris-ktx2`. Add it under Settings, Secrets and variables, Actions. Do not commit the token. Classic tokens that prompt for 2FA cannot publish from Actions.
2. A public repository. npm provenance is only issued for public repositories.
3. Settings, Actions, General, Workflow permissions: read and write. The `main` publish job needs `contents: write` to create the git tag and GitHub release. Both publish jobs request `id-token: write` for provenance.
4. Default branch `main`, with `.github/workflows/publish.yml` on it before a provenance publish. npm checks that the publishing workflow exists on the default branch.
5. Branch `development`, created in the repository (not from a pull request workflow) after the publish workflow is on `main`.
6. Settings, Pages, Build and deployment, Source: GitHub Actions.

Trusted publishing (npm OIDC without a token) is not required. Authentication uses `NPM_TOKEN`. Provenance comes from the separate `--provenance` flag.

If `main` publishes the package and then fails before the GitHub release, a re-run skips the publish because the version is already on npm. Create the tag `v<version>` and the GitHub release for that commit by hand.
