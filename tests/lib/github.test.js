import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Github } from '../../lib/github.js'

const mockRequest = vi.fn()

vi.mock('@octokit/core', () => ({
  Octokit: vi.fn().mockImplementation(function() { this.request = mockRequest })
}))

describe('Github', () => {
  let github

  beforeEach(() => {
    github = new Github({ owner: 'testowner', auth: 'test-pat' })
    vi.clearAllMocks()
  })

  describe('containers()', () => {
    it('コンテナパッケージ名の配列を返す', async () => {
      mockRequest.mockResolvedValue({
        data: [{ name: 'ariang' }, { name: 'seamine' }, { name: 'linuxbrew' }]
      })

      const result = await github.containers()

      expect(mockRequest).toHaveBeenCalledWith('GET /user/packages', { package_type: 'container' })
      expect(result).toEqual(['ariang', 'seamine', 'linuxbrew'])
    })
  })

  describe('lastUpdatedAt()', () => {
    it('最新バージョンの更新日時を Date で返す', async () => {
      mockRequest.mockResolvedValue({
        data: [
          { updated_at: '2024-06-01T12:00:00Z' },
          { updated_at: '2024-01-01T00:00:00Z' }
        ]
      })

      const result = await github.lastUpdatedAt('ariang')

      expect(mockRequest).toHaveBeenCalledWith(
        'GET /user/packages/{package_type}/{package_name}/versions',
        { package_type: 'container', package_name: 'ariang' }
      )
      expect(result).toEqual(new Date('2024-06-01T12:00:00Z'))
    })
  })

  describe('dispatch()', () => {
    it('ワークフローディスパッチリクエストを送信する', async () => {
      mockRequest.mockResolvedValue({})

      await github.dispatch({ repo: 'dockerfiles', workflow_id: 'ariang-ci.yml', ref: 'main' })

      expect(mockRequest).toHaveBeenCalledWith(
        'POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches',
        { owner: 'testowner', repo: 'dockerfiles', workflow_id: 'ariang-ci.yml', ref: 'main' }
      )
    })
  })
})
