import got from "got"

export class DockerHub {
    constructor(options = {}) {
        this.endpoint = options.endpoint
    }

    async login(username, password) {
        const res = await got.post('v2/users/login', {
            prefixUrl: this.endpoint,
            json: {
                username,
                password,
            }
        })
        this.token = JSON.parse(res.body).token
    }

    async tag(image, tag) {
        const url = `repositories/${image}/tags/${tag}`
        const res = await got(url, {
            prefixUrl: this.endpoint,
            headers: {
                Authorization: `Bearer ${this.token}`
            }
        })
        // console.log(res.headers)
        return JSON.parse(res.body)
    }
};
