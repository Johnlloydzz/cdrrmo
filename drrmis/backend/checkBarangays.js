const { all } = require('./db/database')

all(`SELECT rd.id, rd.status, rd.distributed_by, u.name as distributed_by_name
     FROM relief_distributions rd
     LEFT JOIN users u ON rd.distributed_by = u.id`).then(rows => {
  console.log('Relief distributions found:', rows.length)
  console.log(rows)
  process.exit(0)
}).catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})