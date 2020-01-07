const {Wit, log} = require('node-wit');
const wit_token = "YOUR WIT-AI TOKEN"
const weather_token = 'YOUR openweathermap.org API KEY'
const ipstack_token = 'YOUR ipstack.com API KEY'
const tmdb_token = 'YOUR themoviedb.org API KEY'


const client = new Wit({accessToken: wit_token});

const express= require('express')
const app = express()
const timestamp = require('unix-timestamp')
const request = require('request')
const ip = require('public-ip')

function parse(url){
    return new Promise(function(resolve, reject){
        request(url, function (error, response, body) {
            // in addition to parsing the value, deal with possible errors
            try {
                // JSON.parse() can throw an exception if not valid JSON
                resolve(JSON.parse(body));
            } catch(e) {
                reject(e);
            }
        });
    });
}

function closest(numbers, myNumber){
    var distance = Math.abs(numbers[0] - myNumber);
    var idx = 0;
    for(c = 1; c < numbers.length; c++){
        var cdistance = Math.abs(numbers[c] - myNumber);
        if(cdistance < distance){
            idx = c;
            distance = cdistance;
        }
    }
    var theNumber = numbers[idx];
    return [theNumber, idx]
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
app.get('/message/:message', (req,res)=> {
    client.message(req.params.message, {})
        .then((data) => {
            // res.send(data)

            var city, date;
            var inten = data.entities.intent[0].value;
            if (inten=='temperature_get') {
                try {
                    date = data.entities.datetime[0].value
                    date = Math.floor(timestamp.fromDate(date))
                }catch{
                    date = Math.floor(timestamp.now())
                }

                try{
                    city = data.entities.location[0].resolved.values[0].name;
                    if (city.search("District")){
                        city = city.replace(" District", "")
                    }
                    parse('http://api.openweathermap.org/data/2.5/forecast?q='+city+'&units=metric&appid='+weather_token).then(data=>{
                        var dates = []
                        for (i=0;i<data.list.length; i++){
                            dates.push(data.list[i].dt)
                        }
                        var [datee, idx] = closest(dates, date)

                        var temp = data.list[idx].main.temp
                        var min_temp = data.list[idx].main.temp_min
                        var max_temp = data.list[idx].main.temp_max
                        var weather_descrip = data.list[idx].weather[0].description
                        weather_descrip = weather_descrip.charAt(0).toUpperCase()+weather_descrip.slice(1)
                        console.log(datee+" "+idx)
                        console.log(temp+" "+"Weather expected: "+weather_descrip)
                        // res.send(city + " " + inten + " "+date+" "+temp+" "+weather_descrip);

                        res.send("The temperature in "+city+" is "+temp+"°C. It might go up to "+max_temp+"°C during the daytime. But it will be around "+min_temp+"°C during the night. "+weather_descrip+" is expected");
                    })
                }
                catch{
                    city = "Islamabad"
                    parse('http://api.openweathermap.org/data/2.5/forecast?q='+city+'&units=metric&appid='+weather_token).then(data=>{
                        var dates = []
                        for (i=0;i<data.list.length; i++){
                            dates.push(data.list[i].dt)
                        }
                        var [datee, idx] = closest(dates, date)

                        var temp = data.list[idx].main.temp
                        var weather_descrip = data.list[idx].weather[0].description
                        console.log(datee+" "+idx)
                        console.log(temp+" "+"Weather expected: "+weather_descrip)
                        // res.send(city + " " + inten + " "+date+" "+temp+" "+weather_descrip);
                        res.send("The temperature in "+city+" is "+temp+". "+weather_descrip+" is expected");
                    })
                    // res.send(city + " " + inten + " "+date);

                }
                // res.send(city+ " "+inten);
            }
            // else if (inten=='greeting_get'){
            else if (inten=='greeting_get'){
                try{
                    if (data.entities.greeting_good){
                        var messages = ["That\'s great. How can i help?", "Cool. Need any help with something?", "Nice to know that. You want help with something?"]
                        res.send(messages[getRandomInt(0,2)])
                    }else if (data.entities.greeting_bad){
                        messages = ["I am terribly sorry. Can i help you with something?", "Oops that's bad. Need any help with something?", "That\'s just awful. You want help with something?"]
                        res.send(messages[getRandomInt(0,2)])
                    }
                }catch{
                    res.send("Sorry, i didn't understand that")
                }
            }
            else if (inten=='joke_get'){
                var category;
                try {
                    category = data.entities.joke_type[0].value;
                }catch{
                    category = "any"
                }
                parse('https://sv443.net/jokeapi/category/'+category).then(resp=>{
                    var j;
                    if (resp.type=='single'){
                        j= "\nJoke: "+resp.joke
                    }else{
                        j = "\nSetup: "+resp.setup+"\nDelivery: "+resp.delivery
                    }
                    var msg = ['Sure. That\'s one of my favorites: \n', 'Why not? Let me tell you one of my favorites\n', "I just love this one!\n"]
                    res.send(msg[getRandomInt(0,2)]+j+" 😂😂")
                })
            } else if (inten=='movie_get'){
                var movie_name, thing_to_find;

                // res.send(data)
                try{
                    movie_name = data.entities.movie_name[0].value
                    console.log(movie_name)
                    if (movie_name.search('the movie ')>=0){
                        movie_name = movie_name.replace('the movie ','')
                        console.log(movie_name)
                    }
                    if (movie_name.search('named ')>=0){
                        movie_name = movie_name.replace('named ','')
                        console.log(movie_name)
                    }

                    if (movie_name.search('movie')>=0){
                        movie_name = movie_name.replace('movie ','')
                        console.log(movie_name)
                    }

                    // res.send(movie_name)
                }catch{
                    res.send("Movie not found!")
                    res.destroy()
                }

                try{
                    if (data.entities.movie_story)
                        thing_to_find = "movie_story";
                    else if (data.entities.movie_release)
                        thing_to_find = "movie_release";
                    else if (data.entities.movie_rating)
                        thing_to_find = "movie_rating"
                    console.log(thing_to_find)
                    // res.send(movie_name+" "+thing_to_find)
                }catch (e) {
                    thing_to_find = "movie_story"
                    console.log(thing_to_find)
                    // res.send(thing_to_find)
                }

                parse('https://api.themoviedb.org/3/search/movie?sort_by=popularity.desc&api_key='+tmdb_token+'&query='+movie_name).then(data=>{
                    var movie, output, posterLink;
                    if (data.total_results==0){
                        res.send("MOVIE NOT FOUND!")
                        res.destroy()
                    }else{
                        var mov_index=0;
                        var titles = []
                        var popularities=[];
                        for (i=0; i<data.results.length; i++) {
                            var resul = data.results[i];
                            titles.push(resul.title)
                            popularities.push(resul.popularity)
                        }
                        console.log(titles.indexOf(movie_name))
                        if (titles.indexOf(movie_name)>-1) {
                            mov_index = titles.indexOf(movie_name)
                        }else{
                        mov_index = popularities.indexOf(Math.max(...popularities))
                            // console.log(popularities)
                        }

                        console.log(mov_index)
                        movie = data.results[mov_index]
                        try {
                            posterLink = "https://image.tmdb.org/t/p/w600_and_h900_bestv2"+movie.poster_path
                        }catch (e) {
                            posterLink = "PosterLink not available"
                        }
                        switch (thing_to_find) {
                            case "movie_story":
                                output = "\n\nTitle: "+movie.title+"\nStory: "+(movie.overview || "NOT AVAILABLE")+"\nRelease Date: "+(movie.release_date || "NOT AVAILABLE")+"\nMovie Rating: "+(movie.vote_average || "NOT AVAILABLE")
                                break;
                            case "movie_release":
                                output = "\n\nTitle: "+movie.title+"\nRelease Date: "+(movie.release_date || "NOT AVAILABLE")
                                break;
                            case "movie_rating":
                                output = "\n\nTitle: "+movie.title+"\nMovie Rating: "+(movie.vote_average || "NOT AVAILABLE")
                                break;
                        }
                        if (movie.overview=='No description' || !output){
                            output = "Sorry can't resolve request!"
                        }
                        console.log(posterLink+" "+output)
                        res.send(posterLink+" "+output);
                    }


                })



            }

        })
})

app.listen(process.env.PORT || 1234, ()=>console.log("Listening on 1234"))
