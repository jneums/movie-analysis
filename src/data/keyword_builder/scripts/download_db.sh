#!/bin/sh
mongoexport -h ds059471.mlab.com:59471 -d movies -c keywords -u admin -p admin0 -o ../../../data/raw/tmdb_keywords.csv --csv -f imdbId,keywordId,keyword
mongoexport -h ds059471.mlab.com:59471 -d movies -c movies -u admin -p admin0 -o ../../../data/raw/tmdb_movies.csv --csv -f imdbId,budget,revenue,originalTitle,releaseDate
