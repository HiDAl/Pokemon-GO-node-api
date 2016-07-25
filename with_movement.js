'use strict';

var PokemonGO = require('./poke.io.js');

// using var so you can login with multiple users
var a = new PokemonGO.Pokeio();
var b = new PokemonGO.Pokeio();

//Set environment variables or replace placeholder text
var location = {
  type: 'name',
  name: process.env.PGO_LOCATION || 'Times Square'
};

var location1 = {
  type: 'name',
  name: process.env.PGO_LOCATION || 'Times Square'
};

var username = process.env.PGO_USERNAME || 'USER';
var password = process.env.PGO_PASSWORD || 'PASS';
var provider = process.env.PGO_PROVIDER || 'google';

var username1 = process.env.PGO_USERNAME || 'USER';
var password1 = process.env.PGO_PASSWORD || 'PASS';
var provider1 = process.env.PGO_PROVIDER || 'google';




var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  console.log('a user connected');
  socket.on('movement', move);
});

http.listen(3010, function(){
  console.log('listening on *:3000');
});




a.init(username, password, location, provider, function(err) {
  if (err) throw err;

  console.log('1[i] Current location: ' + a.playerInfo.locationName);
  console.log('1[i] lat/long/alt: : ' + a.playerInfo.latitude + ' ' + a.playerInfo.longitude + ' ' + a.playerInfo.altitude);

  a.GetProfile(function(err, profile) {
    if (err) throw err;

    console.log('1[i] Username: ' + profile.username);
    console.log('1[i] Poke Storage: ' + profile.poke_storage);
    console.log('1[i] Item Storage: ' + profile.item_storage);

    var poke = 0;
    if (profile.currency[0].amount) {
      poke = profile.currency[0].amount;
    }

    console.log('1[i] Pokecoin: ' + poke);
    console.log('1[i] Stardust: ' + profile.currency[1].amount);

    // setInterval(function(){
    doHearBeat();
    // }, 5000);

  });
});

function doHearBeat() {
  a.Heartbeat(function(err,hb) {
        if(err) {
          console.log(err);
        }

        for (var i = hb.cells.length - 1; i >= 0; i--) {
          // console.log(hb);
          if(hb.cells[i].NearbyPokemon[0]) {
            var pokemon = a.pokemonlist[parseInt(hb.cells[i].NearbyPokemon[0].PokedexNumber)-1];
            // console.log(hb.cells[i].NearbyPokemon);
            // console.log(i+' [+] There is a ' + pokemon.name + ' at ' + hb.cells[i].NearbyPokemon[0].DistanceMeters.toString() + ' meters');
          }
        }
        console.log("------------------------------");
        var poke_near = []
        // // Show WildPokemons (catchable) & catch
        for (i = hb.cells.length - 1; i >= 0; i--) {
          for (var j = hb.cells[i].WildPokemon.length - 1; j >= 0; j--)
          {   // use async lib with each or eachSeries should be better :)
            var currentPokemon = hb.cells[i].WildPokemon[j];
            var pokedexInfo = b.pokemonlist[parseInt(currentPokemon.pokemon.PokemonId)-1];
            console.log(currentPokemon);


            poke_near.push({
              name: pokedexInfo.name,
              coords: {
                lat: currentPokemon.Latitude,
                lng: currentPokemon.Longitude
              },
              time_till_hidden: Date.now() + currentPokemon.TimeTillHiddenMs/1000
            });


            // b.EncounterPokemon(currentPokemon, function(suc, dat) {
            //   console.log('Encountering pokemon ' + pokedexInfo.name + '...');
            //   b.CatchPokemon(currentPokemon, 1, 1.950, 1, 1, function(xsuc, xdat) {
            //     var status = ['Unexpected error', 'Successful catch', 'Catch Escape', 'Catch Flee', 'Missed Catch'];
            //     console.log(status[xdat.Status]);
            //   });
            // });
          }
        }

        io.emit('pokemon_near', poke_near);

      });
}

function getBoundingBox(pLatitude, pLongitude, pDistanceInMeters, direction) {
    var latRadian = pLatitude.toRad();

    var degLatKm = 110.574235;
    var degLongKm = 110.572833 * Math.cos(latRadian);
    var deltaLat = pDistanceInMeters / 1000.0 / degLatKm;
    var deltaLong = pDistanceInMeters / 1000.0 / degLongKm;


    var topLat = pLatitude + deltaLat;
    var bottomLat = pLatitude - deltaLat;
    var leftLng = pLongitude - deltaLong;
    var rightLng = pLongitude + deltaLong;
    var coords = [];

    switch(direction) {
      case 1: // UP
        coords = [topLat, pLongitude];
        break;

      case 2: // DOWN
        coords = [bottomLat, pLongitude];
        break;

      case 4: // LEFT
        coords = [pLatitude, leftLng];
        break;

      case 8: // RIGHT
        coords = [pLatitude, rightLng];
        break;
    }

    return coords;
}

if (typeof(Number.prototype.toRad) === "undefined") {
  Number.prototype.toRad = function() {
  return this * Math.PI / 180;
 }
}


process.stdin.setEncoding('utf8');

process.stdin.on('readable', function() {
  var chunk = process.stdin.read();
  move({direction: chunk, size: 10});
});



var move = function(movement){
  if (movement.direction !== null) {
    movement.direction = movement.direction.trim();
    if( 'asdw'.split('').indexOf(movement.direction) === -1) {
      return false;
    }
    var directions = {
      a: 4,
      s: 2,
      d: 8,
      w: 1
    };

    var box = getBoundingBox(a.playerInfo.latitude, a.playerInfo.longitude, movement.length, directions[movement.direction]);
    var location = {
      type: 'coords',
      coords: {
        latitude: box[0],
        longitude: box[1],
      }
    };

    console.log('moving from (%d, %d) to (%d, %d)',
                a.playerInfo.latitude, a.playerInfo.longitude,
                location.coords.latitude, location.coords.longitude);

    io.emit('new_position', {location: location});

    a.SetLocation(location, function(){
      doHearBeat();
    })
  }
}

