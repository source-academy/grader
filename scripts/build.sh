#!/bin/bash -

npm install -g cross-zip-cli && echo "Installed cross-zip"

npm install -s --production=false

if [ -d build ]
    then
        rm -rf build
        echo "Deleted ./build"
fi

if [ -f grader.zip ]
    then
        rm grader.zip
        echo "Deleted ./grader.zip"
fi

tsc && echo "Compiled successfully"

if [ -d node_modules ]
    then
        rm -rf node_modules
        echo "Removed ./node_modules"
fi

npm install -s --production=true

cp -r node_modules/ build

cd build && rm *.map && rm -r __tests__/ && cd .. && echo "Removed unnecessary files"

cross-zip build grader.zip && echo "Successfully zipped build"

npm install -s --production=false