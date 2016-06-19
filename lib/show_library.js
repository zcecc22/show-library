const TVDB = require('node-tvdb')
const mysql = require('mysql')
const async = require('async')
const rreaddir = require('./rreaddir')
const path = require('path')
const show_info = require('./show_info')

/**
 * ShowLibrary object.
 * @param {object} opts MySQL and TVDB connection parameters.
 */
function ShowLibrary (opts) {
  this.pool = mysql.createPool(opts)
  this.tvdb = new TVDB(opts.tvdb)
  this.store = opts.store
}

ShowLibrary.prototype.shows = function (cb) {
  this.pool.query('SELECT id, tvdb_id, name, relative_path FROM shows', cb)
}

ShowLibrary.prototype.upsert_episode_info = function (show_id,
  season,
  episode,
  air_date,
  name,
  done) {
  this.pool.query('INSERT INTO episodes ' +
  '(show_id, season, episode, air_date, name) ' +
  'VALUE (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE ' +
  'id = id, air_date = VALUES(`air_date`), name = VALUES(`name`)',
    [show_id, season, episode, air_date, name], done)
}

ShowLibrary.prototype.upsert_episode_path = function (show_id,
  season,
  episode,
  filename,
  done) {
  this.pool.query('INSERT INTO episodes (show_id, season, episode, filename) ' +
  'VALUE (?, ?, ?, ?) ON DUPLICATE KEY UPDATE ' +
  'id = id, filename = VALUES(`filename`)',
    [show_id, season, episode, filename], done)
}

ShowLibrary.prototype.tvdb_show_info = function (tvdb_id, cb) {
  this.tvdb.getSeriesById(tvdb_id, cb)
}

ShowLibrary.prototype.tvdb_episodes_info = function (tvdb_id, cb) {
  this.tvdb.getEpisodesById(tvdb_id, cb)
}

ShowLibrary.prototype.update_all_shows_info = function (done) {
  const self = this
  self.shows(function (err, rows) {
    if (err) {
      done(err)
      return
    }
    async.each(rows, function (row, cb) {
      const tvdb_id = row.tvdb_id
      const show_id = row.id
      self.tvdb_episodes_info(tvdb_id, function (err, res) {
        if (err) {
          cb(err)
          return
        }
        async.each(res, function (episode, cb) {
          self.upsert_episode_info(show_id, episode.SeasonNumber,
            episode.EpisodeNumber,
            episode.FirstAired,
            episode.EpisodeName,
            cb)
        }, cb)
      })
    }, done)
  })
}

ShowLibrary.prototype.update_all_shows_paths = function (cb) {
  const self = this
  this.shows(function (err, rows) {
    if (err) {
      cb(err, null)
      return
    }
    const show_path_id = {}
    rows.forEach(function (row) {
      show_path_id[row.relative_path] = row.id
    })
    rreaddir(self.store, function (err, file_path) {
      if (err) {
        cb(err, file_path)
        return
      }
      const parsed_path = path.parse(file_path)
      const show_path = path.relative(self.store, parsed_path.dir)
      const show_id = show_path_id[show_path]
      const info = show_info(parsed_path.base)
      const filename = parsed_path.base
      if (!show_id) {
        cb('Show ID not found.', file_path)
        return
      }
      if (!show_info) {
        cb('File pattern not recognized.', file_path)
        return
      }
      self.upsert_episode_path(show_id,
        info.season,
        info.episode,
        filename, function (err) {
          if (err) {
            cb(err, file_path)
            return
          }
          cb(null, file_path)
        })
    })
  })
}

module.exports = ShowLibrary
