#!/bin/bash

for f in lakes/*.topo
do 
    ID="${f/\.topo/}"
    ID="${ID/lakes\//}"
    TEXT="$(cat $f)"
    psql wildri -c "UPDATE lakes SET topojson='$TEXT' WHERE gid=$ID"

done
