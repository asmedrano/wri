#!/bin/bash

for f in rivers/*.topo
do 
    ID="${f/\.topo/}"
    ID="${ID/rivers\//}"
    TEXT="$(cat $f)"
    psql wildri -c "UPDATE rivers_streams SET topojson='$TEXT' WHERE gid=$ID"

done
