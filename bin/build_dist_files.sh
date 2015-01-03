#!/bin/bash
# Build the static resources. We are assuming there is an ENV directory in the project dir
WPATH=$(cd "$(dirname "$0")"; pwd)/..
$WPATH/ENV/bin/python $WPATH/ENV/bin/jstar.py -t app -o dist
# hack. This is a jstar bug
rm $WPATH/dist/base.html
