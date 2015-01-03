#!/bin/bash
WPATH=$(cd "$(dirname "$0")"; pwd)
/bin/bash $WPATH/load_data.sh
/bin/bash $WPATH/build_api.sh
/bin/bash $WPATH/build_dist_files.sh
