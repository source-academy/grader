#!/bin/bash -

yarn install --production=false

if [ -d build ]; then
    rm -rf build
    echo "Deleted ./build"
fi

if [ -f grader.zip ]; then
    rm grader.zip
    echo "Deleted ./grader.zip"
fi

tsc && echo "Compiled successfully"

if [ -d node_modules ]; then
    rm -rf node_modules
    echo "Removed ./node_modules"
fi

yarn install --production=true

cp -r node_modules/ build

yarn install --production=false

node_modules/.bin/cross-zip build grader.zip && echo "Successfully zipped build"
