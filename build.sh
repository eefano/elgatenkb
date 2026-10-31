#!/bin/sh

pngcrush -brute -rem alla elgato.png elgato_crushed.png
pngcrush -brute -rem alla bg.png bg_crushed.png

node embedder.js > data.js

cat data.js elgato.js > tominify.js

uglifyjs tominify.js -o minified.js --compress passes=3 -m --toplevel --mangle-props

cat prefix.html minified.js suffix.html > index.html

du -b index.html

