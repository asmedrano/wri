var app = angular.module('wri', []);

app.controller('MapCtrl', function ($scope, $http) {
    $scope.apiURL = window.API_URL;

    $scope.mdiv = document.getElementById("map");
    $scope.mdiv.style.height = window.innerHeight + "px";
    $scope.mdiv.style.width = window.innerWidth + "px";
    /*intialize map*/
    $scope.map = L.map('map').setView([41.83, -71.41], 13);

    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        maxZoom: 18
    }).addTo($scope.map);
    
    $scope.updateGeoms = function() {
        var gids = [];
        var gidsStr = "?g=";
        for(var l in $scope.lakes) {
            gids.push($scope.lakes[l].Gid);
        }
        gidsStr += gids.join("&g=");
        
        $http({method: 'GET', url: $scope.apiURL + "/geom" + gidsStr}).
        success(function(data, status, headers, config) {
            // TODO: this could potentially be a big request 
            // how can I fix it
            var feature = null;
            var layers =[];
            for(var i in data) {
                feature = JSON.parse(data[i].Geom);
                feature.properties = {
                    name: data[i].Name,
                    gid: data[i].Gid
                }
                layers.push(L.geoJson(feature,{
                    style: {
                        "color": "blue",
                        "weight": 1,
                        "opacity": .8
                    },
                    onEachFeature:$scope.featureClkHandler
                }));
            }
            var f = L.featureGroup(layers);
            f.addTo($scope.map);
            $scope.map.fitBounds(f.getBounds());
            
        }).
        error(function(data, status, headers, config) {
        });
    }
    
    $scope.featureClkHandler = function(feature, layer) {
        var props;
        layer.on('click', function(e){
            $scope.map.fitBounds(layer.getBounds());
            props = e.target.feature.geometry.properties;
            $scope.lake = $scope.lakes[props.gid.toString()];
            $scope.$apply();
        });
        layer.on('mouseover', function(e){
            props = e.target.feature.geometry.properties;
            $scope.lake = $scope.lakes[props.gid.toString()];
            $scope.$apply();
        });
    }

    $scope.getLakes = function() {
        $http({method: 'GET', url: $scope.apiURL + "/lakes"}).
        success(function(data, status, headers, config) {
            $scope.lakes = data;
            // always fetch geoms when lakes are updated;
            $scope.updateGeoms();
        }).
        error(function(data, status, headers, config) {
            console.log(data, status);
        });
    }

       
    $scope.getLakes();

    


});
