import { config } from '@dotenvx/dotenvx'
config({ ignore: ['MISSING_ENV_FILE'] })
import { rebuild } from './lib/rebuilder.js'
import * as core from '@actions/core'

try {
  await rebuild()
} catch (err) {
  core.setFailed(`Action failed with error ${err}`)
}
