import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DockerHub } from '../../lib/dockerhub.js'
import got from 'got'

vi.mock('got', () => ({
  default: Object.assign(vi.fn(), { post: vi.fn() })
}))

describe('DockerHub', () => {
  let dockerhub

  beforeEach(() => {
    dockerhub = new DockerHub({ endpoint: 'https://hub.docker.com/v2' })
    vi.clearAllMocks()
  })

  describe('login()', () => {
    it('レスポンスからトークンを取得して保存する', async () => {
      got.post.mockResolvedValue({ body: JSON.stringify({ token: 'my-token' }) })

      await dockerhub.login('user', 'password')

      expect(got.post).toHaveBeenCalledWith('v2/users/login', {
        prefixUrl: 'https://hub.docker.com/v2',
        json: { username: 'user', password: 'password' }
      })
      expect(dockerhub.token).toBe('my-token')
    })
  })

  describe('tag()', () => {
    it('指定イメージのタグ情報を返す', async () => {
      dockerhub.token = 'my-token'
      const tagData = { tag_last_pushed: '2024-01-01T00:00:00.000Z', name: '20-bookworm-slim' }
      got.mockResolvedValue({ body: JSON.stringify(tagData) })

      const result = await dockerhub.tag('library/node', '20-bookworm-slim')

      expect(got).toHaveBeenCalledWith('repositories/library/node/tags/20-bookworm-slim', {
        prefixUrl: 'https://hub.docker.com/v2',
        headers: { Authorization: 'Bearer my-token' }
      })
      expect(result).toEqual(tagData)
    })
  })
})
