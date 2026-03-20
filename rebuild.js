import * as dotenv from 'dotenv'
dotenv.config()
import { rebuild } from './lib/rebuilder.js'
import * as core from '@actions/core'

try {
  await rebuild()
} catch (err) {
  core.setFailed(`Action failed with error ${err}`)
}
