#/bin/bash

# first dump the lakes geoms to geojson files
mkdir -p /tmp/lakes
psql wildri < dump_lakes_geos.sql

#now iterate files
for f in /tmp/lakes/*.json
do
    TARG_FILE="${f/json/topo}"
    topojson -o $TARG_FILE $f
done
 



