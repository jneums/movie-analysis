const mongoose = require("mongoose");
const fs = require("fs");
const http = require("http");
const https = require("https");
const throttledQueue = require("throttled-queue");
require("dotenv").config();

const axios = require("axios").create({
  //keepAlive pools and reuses TCP connections, so it's faster
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true })
});

// using clustering
const cluster = require("cluster");
const os = require("os");

if (cluster.isMaster) {
  const cpuCount = os.cpus().length - 1;
  for (let i = 0; i < cpuCount; i++) {
    cluster.fork();
  }
} else {
  (function() {
    var data = "";

    var readStream = fs.createReadStream("imdb_ids.txt", "utf8");

    readStream
      .on("data", function(chunk) {
        data += chunk;
      })
      .on("end", function() {
        imdbIds = data.split("\\s");

        // connect to DB
        mongoURL = `mongodb://${process.env.DB_USER}:${process.env.DB_PW}@ds059471.mlab.com:59471/movies`;
        mongoose.connect(mongoURL);

        const db = mongoose.connection;
        db.on("error", console.error.bind(console, "Connection error"));
        db.on("open", function(callback) {
          console.log('connected')
          saveAll(imdbIds);
        });
      });
  })();
}

cluster.on("exit", worker => {
  console.log(`${worker.id} removed`);
  cluster.fork();
});

// create schema for keyword document
const Schema = mongoose.Schema;
const keywordSchema = new Schema({
  imdbId: String,
  keywordId: Number,
  keyword: String
});

// create schema for movie document
const movieSchema = new Schema({
  budget: Number,
  imdbId: String,
  originalTitle: String,
  releaseDate: String,
  revenue: Number
});

const Keyword = mongoose.model("Keyword", keywordSchema);
const Movie = mongoose.model("Movie", movieSchema);

// call api with imdb id and return associated tmdb id
async function fetchTmdbId(imdbId) {
  try {
    url = `https://api.themoviedb.org/3/find/${imdbId}`;
    const response = await axios.get(url, {
      params: {
        api_key: process.env.TMDB_KEY,
        external_source: "imdb_id"
      }
    });
    if (response.data["movie_results"].length == 0) return null;
    return response.data["movie_results"][0]["id"];
  } catch (error) {
    console.log("id fetch failed");
  }
}

// call api with tmdb id and return array of keywords
async function fetchMovie(tmdbId) {
  try {
    url = `https://api.themoviedb.org/3/movie/${tmdbId}`;
    const response = await axios.get(url, {
      params: {
        api_key: process.env.TMDB_KEY,
        language: "en-US",
        append_to_response: "keywords"
      }
    });
    return response.data;
  } catch (error) {
    console.log("fetchMovie err");
  }
}

// combine fetch id and fetch keywords, and save the result
async function saveIdAndKeywords(ImdbId) {
  if (alreadySaved(ImdbId)) return;
  TmdbId = await fetchTmdbId(ImdbId);
  if (TmdbId) {
    movie = await fetchMovie(ImdbId, TmdbId);
    if (!movie) return;
    const newMovie = new Movie({
      budget: movie.budget,
      imdbId: movie.imdb_id,
      originalTitle: movie.original_title,
      releaseDate: movie.release_date,
      revenue: movie.revenue
    });
    const movieRes = await newMovie.save();
    console.log(movieRes)
    if (!movie.keywords["keywords"]) return;
    movie.keywords["keywords"].forEach(async entry => {
      const newKeyword = new Keyword({
        imdbId: movie.imdb_id,
        keywordId: entry["id"],
        keyword: entry["name"]
      });
      const keywordRes = await newKeyword.save();
      console.log(keywordRes)
    });
  }
}

function alreadySaved(imdbId) {
  Movie.find(
    {
      imdbId
    },
    function(err, docs) {
      if (err) return console.log(err);
      console.log('Already saved: ', docs.length > 0)
      return docs.length > 0;
    }
  );
}

// function to throttle the calls to prevent hanging
function saveAll(imdbIds) {
  const chunkSize = 5;
  const ms = 200;
  const throttle = throttledQueue(chunkSize, ms);
  imdbIds.forEach(id => {
    throttle(() => {
      saveIdAndKeywords(id);
    });
  });
}
