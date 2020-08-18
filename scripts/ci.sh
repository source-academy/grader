#!/bin/bash

set -euxo pipefail

cross-env TIMEOUT=2000 jest --env=node --coverage --coverageReporters=text-lcov --forceExit | coveralls
