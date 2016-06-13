const mysql = require('mysql');
const TVDB = require('node-tvdb');
const async = require('async');

/**
 * ShowLibrary object.
 * @param {object} opts MySQL and TVDB connection parameters.
 */
function ShowLibrary(opts) {
  this.pool = mysql.createPool(opts);
  this.tvdb = new TVDB(opts.tvdb);
}

ShowLibrary.prototype.getShows = function(cb) {
  this.pool.query('SELECT id, tvdb_id, name, relative_path FROM shows', cb);
};

ShowLibrary.prototype.addEpisode = function(showId,
  season,
  episode,
  airDate,
  name, done) {
  this.pool.query('INSERT INTO episodes \
  (show_id, season, episode, air_date, name) \
  VALUE (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE \
  id = id, \
  air_date = VALUES(`air_date`), \
  name = VALUES(`name`)',
  [showId, season, episode, airDate, name], done);
};

ShowLibrary.prototype.getTVDBShowMetadata = function(tvdbId, cb) {
  this.tvdb.getSeriesById(tvdbId, cb);
};

ShowLibrary.prototype.getTVDBShowEpisodes = function(tvdbId, cb) {
  this.tvdb.getEpisodesById(tvdbId, cb);
};

ShowLibrary.prototype.updateSingleShow = function(showId, done) {
  const self = this;
  this.pool.query('SELECT id, tvdb_id FROM shows WHERE id = ?', showId,
  function(err, rows) {
    if (err) {
      done(err);
      return;
    } else if (rows.length !== 1) {
      done('Show ID not found.');
      return;
    }
    console.log(rows);
    self.__updateSingleShow(rows[0].id, rows[0].tvdb_id, done);
  });
};

ShowLibrary.prototype.__updateSingleShow = function(showId, tvdbId, done) {
  const self = this;
  this.getTVDBShowEpisodes(tvdbId, function(err, res) {
    if (err) {
      done(err);
      return;
    }
    async.each(res, function(episode, cb) {
      self.addEpisode(showId, episode.SeasonNumber,
        episode.EpisodeNumber,
        episode.FirstAired,
        episode.EpisodeName,
        cb);
    }, done);
  });
};

ShowLibrary.prototype.updateAllShows = function(done) {
  const self = this;
  self.getShows(function(err, rows) {
    if (err) {
      done(err);
      return;
    }
    async.each(rows, function(row, cb) {
      self.__updateSingleShow(row.id, row.tvdb_id, cb);
    }, done);
  });
};

module.exports = ShowLibrary;
