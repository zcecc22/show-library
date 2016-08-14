const ShowLibrary = require('./lib/show_library')

const showLib = new ShowLibrary({
  host: 'nodex.local',
  user: 'show_library',
  password: 'show_library',
  database: 'show_library',
  tvdb: 'CCBDC1DA89F160AF',
  store: '/Users/zcecc22/Documents/shows'
})

// showLib.update_all_episodes_paths(function (err) {
//   console.log(err)
// })

showLib.update_all_episodes_info(function (err) {
  console.log(err)
})
