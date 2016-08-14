function name_episode (show_name, season, episode, episode_name) {
  let season_s = season.toString()
  let episode_s = episode.toString()
  if (season_s.length === 1) {
    season_s = '0' + season_s
  }
  if (episode_s.length === 1) {
    episode_s = '0' + episode_s
  }
  let name = (show_name + '.S' + season_s + 'E' + episode_s +
  '.' + episode_name).replace('/', ' ')
  return name
}

module.exports = name_episode
