#!/bin/bash
docker build -t postgis:2.1 github.com/helmi03/docker-postgis.git
#docker run -d postgis:2.1
CONTAINER=$(docker run -d -t postgis:2.1)
CONTAINER_IP=$(docker inspect -f '{{ .NetworkSettings.IPAddress }}' $CONTAINER)
export DB_IP=$CONTAINER_IP
