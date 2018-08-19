#!/bin/bash -

if [ -d node_modules ]
    then
        rm -rf node_modules
fi

if [ -d build ]
    then
        rm -rf build
fi

if [ ! -d dist ]
    then
        mkdir dist
fi

yarn install --production=true
tsc
cd build && zip -r --exclude=*terraform* ../dist/grader.zip index.js node_modules/ && cd ..
yarn install --production=false
