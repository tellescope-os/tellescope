set -e
npx lerna bootstrap --hoist -- --legacy-peer-deps
tsc --build --watch
