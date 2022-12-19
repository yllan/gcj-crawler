const cj2022 = {
  "Q":  "0000000000876ff1",
  "1A": "0000000000877ba5",
  "1B": "000000000087711b",
  "1C": "0000000000877b42",
  "2":  "00000000008778ec",
  "3":  "00000000008779b4",
  "WF": "000000000087762e"
}

import fetch from 'node-fetch'
import Database from 'better-sqlite3'
import cliProgress from 'cli-progress'
import colors from 'ansi-colors'

const db = new Database('gcj.db', {})
const multibar = new cliProgress.MultiBar({
  clearOnComplete: false,
  hideCursor: true

}, cliProgress.Presets.shades_grey)

const fetchAttempt = async (score_id, contest_id, competitor_id, fileBar) => {
  const p = Buffer.from(JSON.stringify({ competitor_id, include_non_final_results: true }), "utf-8").toString("base64")
  const resp = await fetch(`https://codejam.googleapis.com/attempts/${contest_id}/poll?p=${p}`)
  const body = await resp.text()
  const json = JSON.parse(Buffer.from(body, 'base64').toString('utf-8'))
  fileBar.setTotal(json.attempts.length)
  fileBar.update(0)

  const files = json.attempts.map(attempt => {
    const { id, source_file: { url }, src_language__str, task_id, timestamp_ms } = attempt
    return fetch(url).then(f => f.text()).then(fc => {
      db.prepare(`INSERT OR IGNORE INTO attempts (id, score_id, task_id, lang, timestamp_ms, url, content, raw)
      VALUES (@id, @score_id, @task_id, @lang, @timestamp_ms, @url, @content, @raw)`).run({
        id,
        score_id,
        task_id,
        lang: src_language__str,
        timestamp_ms,
        url,
        content: fc,
        raw: JSON.stringify(attempt)
      })
      fileBar.increment({ lang: src_language__str })
    })
  })
  await Promise.all(files)
}

const fetchContest = async (contest_id) => {
  let contestBar
  let fileBar

  let min_rank = 1
  let num_consecutive_users = 100
  let got = 0
  let all = 9999999
  let first = true
  while (got < all) {
    const payload = Buffer.from(JSON.stringify({min_rank, num_consecutive_users}), "utf-8").toString("base64")
    const resp = await fetch(`https://codejam.googleapis.com/scoreboard/${contest_id}/poll?p=${payload}`)
    const body = await resp.text()
    const json = JSON.parse(Buffer.from(body, 'base64').toString('utf-8'))

    if (first) {

      db.prepare('INSERT OR IGNORE INTO contests (id, title, raw) VALUES (@id, @title, @raw)').run({
        id: contest_id,
        title: json.challenge.title,
        raw: JSON.stringify(json.challenge)
      })

      for (let task of json.challenge.tasks) {
        db.prepare('INSERT OR IGNORE INTO tasks (id, contest_id, title, num_attempted, raw) VALUES (@id, @contest_id, @title, @num_attempted, @raw)').run({
          id: task.id,
          contest_id,
          title: task.title,
          num_attempted: task.num_attempted,
          raw: JSON.stringify(task)
        })
      }
      // console.log(`Fetching ${json.challenge.title} (${json.full_scoreboard_size})...`)
      first = false
      const name = json.challenge.title.padEnd(18)
      const src = "  fetch source".padEnd(18)
      contestBar = multibar.create(json.full_scoreboard_size, 0, {}, { format: `${colors.cyan(name)} ${colors.magenta("{bar}")} | {percentage}% | {value}/{total} | {user}` })
      fileBar = multibar.create(1, 0, {}, { format: `${src} {bar} | {percentage}% | {value}/{total} | {lang}` })
    }

    all = json.full_scoreboard_size
    got += json.user_scores.length
    min_rank += json.user_scores.length
    for (let u of json.user_scores) {
      const { rank, country, displayname, score_1, competitor: { id } } = u
      contestBar.increment({ title: json.challenge.title, user: displayname })
      db.prepare('INSERT OR IGNORE INTO competitors (id, displayname, country, raw) VALUES (@id, @displayname, @country, @raw)').run({
        id,
        displayname,
        country,
        raw: JSON.stringify(u.competitor)
      })
      // console.log(rank, country, displayname, score_1, id)
      const score_id = db.prepare(`INSERT OR IGNORE INTO scores (rank, contest_id, competitor_id, score, raw)
      VALUES (@rank, @contest_id, @competitor_id, @score, @raw) RETURNING id`).pluck().get({
        rank,
        contest_id,
        competitor_id: id,
        score: score_1,
        raw: JSON.stringify(u.competitor)
      })

      // fetching attempts
      await fetchAttempt(score_id, contest_id, id, fileBar)
    }
  }
}

fetchContest(cj2022["WF"])
fetchContest(cj2022["3"])
fetchContest(cj2022["2"])
fetchContest(cj2022["1A"])
fetchContest(cj2022["1B"])
fetchContest(cj2022["1C"])
fetchContest(cj2022["Q"])
