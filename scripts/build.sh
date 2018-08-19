#!/bin/bash -

if [ -d node_modules ]
    then
        rm -rf node_modules
fi

if [ -d build ]
    then
        rm -rf build
fi

if [ -f grader.zip ]
    then
        rm grader.zip
fi

yarn install --production=true
tsc
cd build && zip -r --exclude=*terraform* ../grader.zip index.js graphics/ && cd ..
zip -ur grader.zip node_modules/
yarn install --production=false
