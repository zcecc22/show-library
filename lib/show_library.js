const TVDB = require('node-tvdb')
const mysql = require('mysql')
const async = require('async')
const recursive = require('recursive-readdir')
const path = require('path')
const parse_episode = require('./episode_info')

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
  relative_path,
  done) {
  this.pool.query('INSERT INTO episodes ' +
  '(show_id, season, episode, filename, relative_path) ' +
  'VALUE (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE ' +
  'id = id, filename = VALUES(`filename`),' +
  ' relative_path = VALUES(`relative_path`)',
    [show_id, season, episode, filename, relative_path], done)
}

ShowLibrary.prototype.tvdb_show_info = function (tvdb_id, cb) {
  this.tvdb.getSeriesById(tvdb_id, cb)
}

ShowLibrary.prototype.tvdb_episodes_info = function (tvdb_id, cb) {
  this.tvdb.getEpisodesById(tvdb_id, cb)
}

ShowLibrary.prototype.update_all_episodes_info = function (done) {
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

ShowLibrary.prototype.update_all_episodes_paths = function (done) {
  const self = this
  this.shows(function (err, rows) {
    if (err) {
      done(err)
      return
    }
    const show_path_id = {}
    rows.forEach(function (row) {
      show_path_id[row.relative_path] = row.id
    })
    recursive(self.store, function (err, file_paths) {
      if (err) {
        done(err)
        return
      }
      async.each(file_paths, function (file_path, cb) {
        const episode_path = path.relative(self.store,
          file_path)
        const episode_filename = path.basename(file_path)
        const show_path = episode_path.split(path.sep)[0]
        const show_id = show_path_id[show_path]
        const episode_info = parse_episode(episode_filename)
        if (!show_id) {
          cb('Show ID not found.')
          return
        }
        if (!episode_info) {
          cb('File pattern not recognized.')
          return
        }
        self.upsert_episode_path(show_id,
          episode_info.season,
          episode_info.episode,
          episode_filename,
          episode_path, cb)
      }, done)
    })
  })
}

module.exports = ShowLibrary
