require('dotenv').config()
const { DockerHub } = require('./lib/dockerhub')
const { Github } = require('./lib/github')
const config = require('config')

const baseImages = config.get('base_image')
const workflows = config.get('workflow')

const dockerHub = new DockerHub({endpoint: config.get('endpoint.docker_hub')})
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
    baseImages[container].forEach(async (base) => {
        const tag = await dockerHub.tag(base.image, base.tag)
        const tagLastPushed = new Date(tag.tag_last_pushed)
        if (!tagLastPushed) return
        console.log({
            ...base,
            tag_last_pushed: tagLastPushed,
            image_updated: updatedAt < tagLastPushed
        })
        if (updatedAt < tagLastPushed) {
            await dispatchWorkflow(container)
            return
        }
    })
}

(async () => {
    await dockerHub.login(process.env.DOCKER_HUB_USERNAME, process.env.DOCKER_HUB_TOKEN);
    (await github.containers()).forEach(async (container) => {
        const updatedAt = await github.lastUpdatedAt(container)
        if (!updatedAt) return
        console.log({
            container: container,
            updated_at: updatedAt
        })
        await dispatcheWorkflowIfNeeded(container, updatedAt)
    })
})();