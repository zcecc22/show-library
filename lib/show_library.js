const mysql = require('mysql');
const TVDB = require('node-tvdb');
const async = require('async');
const rreaddir = require('./rreaddir');
const path = require('path');
const getShowInfo = require('./show_info');

/**
 * ShowLibrary object.
 * @param {object} opts MySQL and TVDB connection parameters.
 */
function ShowLibrary(opts) {
  this.pool = mysql.createPool(opts);
  this.tvdb = new TVDB(opts.tvdb);
  this.store = opts.store;
}

ShowLibrary.prototype.getShows = function (cb) {
  this.pool.query('SELECT id, tvdb_id, name, relative_path FROM shows', cb);
};

ShowLibrary.prototype.upsertEpisodeMetadata = function (showId,
  season,
  episode,
  airDate,
  name,
  done) {
  this.pool.query('INSERT INTO episodes \
  (show_id, season, episode, air_date, name) \
  VALUE (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE \
  id = id, \
  air_date = VALUES(`air_date`), \
  name = VALUES(`name`)',
  [showId, season, episode, airDate, name], done);
};

ShowLibrary.prototype.upsertEpisodePath = function (showId,
  season,
  episode,
  filename,
  done) {
  this.pool.query('INSERT INTO episodes \
  (show_id, season, episode, filename) \
  VALUE (?, ?, ?, ?) ON DUPLICATE KEY UPDATE \
  id = id, \
  filename = VALUES(`filename`)',
  [showId, season, episode, filename], done);
};

ShowLibrary.prototype.getTVDBShowMetadata = function (tvdbId, cb) {
  this.tvdb.getSeriesById(tvdbId, cb);
};

ShowLibrary.prototype.getTVDBEpisodesMetadata = function (tvdbId, cb) {
  this.tvdb.getEpisodesById(tvdbId, cb);
};

ShowLibrary.prototype.updateSingleShowMetadata = function (showId, done) {
  const self = this;
  this.pool.query('SELECT id, tvdb_id FROM shows WHERE id = ?', showId, function (err, rows) {
    if (err) {
      done(err);
      return;
    } else if (rows.length !== 1) {
      done('Show ID not found.');
      return;
    }
    self.__updateSingleShowMetadata(rows[0].id, rows[0].tvdb_id, done);
  });
};

ShowLibrary.prototype.__updateSingleShowMetadata = function (showId,
  tvdbId,
  done) {
  const self = this;
  this.getTVDBEpisodesMetadata(tvdbId, function (err, res) {
    if (err) {
      done(err);
      return;
    }
    async.each(res, function (episode, cb) {
      self.upsertEpisodeMetadata(showId, episode.SeasonNumber,
              episode.EpisodeNumber,
              episode.FirstAired,
              episode.EpisodeName,
              cb);
    }, done);
  });
};

ShowLibrary.prototype.updateAllShowsMetadata = function (done) {
  const self = this;
  self.getShows(function (err, rows) {
    if (err) {
      done(err);
      return;
    }
    async.each(rows, function (row, cb) {
      self.__updateSingleShowMetadata(row.id, row.tvdb_id, cb);
    }, done);
  });
};

ShowLibrary.prototype.updatePaths = function (cb) {
  const self = this;

  this.getShows(function (err, rows) {
    if (err) {
      cb(err, null);
      return;
    }

    const showPathToId = {};

    rows.forEach(function (row) {
      showPathToId[row.relative_path] = row.id;
    });

    rreaddir(self.store, function (err, filePath) {
      if (err) {
        cb(err, filePath);
        return;
      }

      const parsedPath = path.parse(filePath);
      const showPath = path.relative(self.store, parsedPath.dir);
      const showId = showPathToId[showPath];
      const showInfo = getShowInfo(parsedPath.base);
      const filename = parsedPath.base;

      if (!showId) {
        cb('Show ID not found.', filePath);
        return;
      }

      if (!showInfo) {
        cb('File pattern not recognized.', filePath);
        return;
      }

      self.upsertEpisodePath(showId,
        showInfo.season,
        showInfo.episode,
        filename, function (err) {
          if (err) {
            cb(err, filePath);
            return;
          }
          cb(null, filePath);
        });
    });
  });
};

module.exports = ShowLibrary;
