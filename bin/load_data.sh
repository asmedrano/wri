#!/bin/bash
# load data sql files in db `wildri`. This can have errors, which usually just means that the data is already there. This will load *any* sql in the data directory
FILES=data/*.sql
for f in $FILES
do
    psql wildri < $f
done

