const { Octokit } = require('@octokit/core');

class Github {
    constructor(options = {}) {
        this.owner = options.owner
        this.octokit = new Octokit({auth: options.auth})
    }

    async containers() {
        const pkgs = await this.octokit.request('GET /user/packages', {
            package_type: 'container'
        })
        return pkgs.data.map(d => d.name)
    }


    async lastUpdatedAt(package_name) {
        const ver = await this.octokit.request('GET /user/packages/{package_type}/{package_name}/versions', {
            package_type: 'container',
            package_name
        })
        return new Date(ver.data[0].updated_at)
    }

    async dispatch(workflow) {
        await this.octokit.request('POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches', {
            owner: this.owner,
            ...workflow
        })
    }
};

module.exports = { Github }