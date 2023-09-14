import * as dotenv from 'dotenv'
dotenv.config()
import { DockerHub } from './lib/dockerhub.js'
import { Github } from './lib/github.js'
import config from 'config'
import core from '@actions/core'

const baseImages = config.get('base_image')
const workflows = config.get('workflow')

const dockerHub = new DockerHub({ endpoint: config.get('endpoint.docker_hub') })
const github = new Github({
  owner: process.env.GITHUB_OWNER,
  auth: process.env.GITHUB_PAT
})

const dispatchWorkflow = async (container) => {
  const workflow = workflows[container]
  if (!workflow) return
  await github.dispatch(workflow)
  console.log(`dispatched ${workflow.repo}: ${workflow.workflow_id}`)
}

const dispatcheWorkflowIfNeeded = async (container, updatedAt) => {
  const found = baseImages[container]
    .map(async (base) => {
      const tag = await dockerHub.tag(base.image, base.tag)
      const tagLastPushed = new Date(tag.tag_last_pushed)
      return {
        base,
        tagLastPushed
      }
    })
    .find(res => res.tagLastPushed && updatedAt < res.tagLastPushed)

  if (found) {
    console.log({
      container,
      ...found.base,
      tag_last_pushed: found.tagLastPushed,
      image_updated: updatedAt < tagLastPushed
    })
    await dispatchWorkflow(container)
  }
}

const rebuild = async () => {
  await dockerHub.login(process.env.DOCKER_HUB_USERNAME, process.env.DOCKER_HUB_TOKEN);
  (await github.containers())
    .filter(container => baseImages[container])
    .forEach(async (container) => {
      const updatedAt = await github.lastUpdatedAt(container)
      if (!updatedAt) return
      console.log({
        container: container,
        updated_at: updatedAt
      })
      await dispatcheWorkflowIfNeeded(container, updatedAt)
    })
}

(async () => {
  try {
    await rebuild()
  } catch (err) {
    core.setFailed(`Action failed with error ${err}`)
  }
})();
