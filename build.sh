rm -rf build
rm -rf .cache

BROWSER_OPT=true \
parcel build \
  src/web/plugin.js \
  src/web/index.html \
  --no-source-maps --out-dir build

cp src/web/CNAME docs/
cp src/web/.nojekyll docs/
