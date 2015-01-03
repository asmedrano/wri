#!/bin/bash
# build the api binary
export GOPATH=$(cd "$(dirname "$0")"; pwd)/../api
export PATH=$PATH:$GOPATH/bin
echo "Building API"
go install github.com/asmedrano/wri
