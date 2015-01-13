#/bin/bash

# first dump the rivers geoms to geojson files
mkdir -p /tmp/rivers
psql wildri < dump_rivers_geos.sql

#now iterate files
for f in /tmp/rivers/*.json
do
    TARG_FILE="${f/json/topo}"
    topojson -o $TARG_FILE $f
done
 



