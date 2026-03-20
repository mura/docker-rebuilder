import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockConfigGet = vi.fn((key) => {
  const data = {
    'base_image': {
      ariang: [{ image: 'library/golang', tag: 'trixie' }],
      seamine: [{ image: 'library/node', tag: '20-bookworm-slim' }]
    },
    'workflow': {
      ariang: { repo: 'dockerfiles', workflow_id: 'ariang-ci.yml', ref: 'main' },
      seamine: { repo: 'seamine', workflow_id: 'action.yml', ref: 'main' }
    },
    'endpoint.docker_hub': 'https://hub.docker.com/v2'
  }
  return data[key]
})

vi.mock('config', () => ({ default: { get: mockConfigGet } }))

const mockLogin = vi.fn()
const mockTag = vi.fn()
const mockContainers = vi.fn()
const mockLastUpdatedAt = vi.fn()
const mockDispatch = vi.fn()

vi.mock('../../lib/dockerhub.js', () => ({
  DockerHub: vi.fn().mockImplementation(function() {
    this.login = mockLogin
    this.tag = mockTag
  })
}))

vi.mock('../../lib/github.js', () => ({
  Github: vi.fn().mockImplementation(function() {
    this.containers = mockContainers
    this.lastUpdatedAt = mockLastUpdatedAt
    this.dispatch = mockDispatch
  })
}))

const { dispatchWorkflow, dispatchWorkflowIfNeeded, rebuild } = await import('../../lib/rebuilder.js')

describe('rebuild.js', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('dispatchWorkflow()', () => {
    it('ワークフローが設定されている場合はディスパッチする', async () => {
      mockDispatch.mockResolvedValue(undefined)

      await dispatchWorkflow('ariang')

      expect(mockDispatch).toHaveBeenCalledWith({
        repo: 'dockerfiles',
        workflow_id: 'ariang-ci.yml',
        ref: 'main'
      })
    })

    it('ワークフローが未設定のコンテナは何もしない', async () => {
      await dispatchWorkflow('unknown-container')

      expect(mockDispatch).not.toHaveBeenCalled()
    })
  })

  describe('dispatchWorkflowIfNeeded()', () => {
    it('ベースイメージがコンテナより新しい場合はディスパッチする', async () => {
      const containerUpdatedAt = new Date('2024-01-01T00:00:00Z')
      mockTag.mockResolvedValue({ tag_last_pushed: '2024-06-01T00:00:00Z' })
      mockDispatch.mockResolvedValue(undefined)

      await dispatchWorkflowIfNeeded('ariang', containerUpdatedAt)

      expect(mockTag).toHaveBeenCalledWith('library/golang', 'trixie')
      expect(mockDispatch).toHaveBeenCalledWith({
        repo: 'dockerfiles',
        workflow_id: 'ariang-ci.yml',
        ref: 'main'
      })
    })

    it('ベースイメージがコンテナより古い場合はディスパッチしない', async () => {
      const containerUpdatedAt = new Date('2024-06-01T00:00:00Z')
      mockTag.mockResolvedValue({ tag_last_pushed: '2024-01-01T00:00:00Z' })

      await dispatchWorkflowIfNeeded('ariang', containerUpdatedAt)

      expect(mockTag).toHaveBeenCalledWith('library/golang', 'trixie')
      expect(mockDispatch).not.toHaveBeenCalled()
    })

    it('ベースイメージとコンテナが同じ日時の場合はディスパッチしない', async () => {
      const same = '2024-03-01T00:00:00Z'
      mockTag.mockResolvedValue({ tag_last_pushed: same })

      await dispatchWorkflowIfNeeded('ariang', new Date(same))

      expect(mockDispatch).not.toHaveBeenCalled()
    })
  })

  describe('rebuild()', () => {
    it('ログイン後、設定済みコンテナのみ処理する', async () => {
      mockLogin.mockResolvedValue(undefined)
      // 'ariang' は base_image に存在、'unknown' は存在しないのでフィルタされる
      mockContainers.mockResolvedValue(['ariang', 'unknown'])
      mockLastUpdatedAt.mockResolvedValue(new Date('2024-01-01T00:00:00Z'))
      mockTag.mockResolvedValue({ tag_last_pushed: '2024-06-01T00:00:00Z' })
      mockDispatch.mockResolvedValue(undefined)

      await rebuild()

      expect(mockLogin).toHaveBeenCalled()
      expect(mockContainers).toHaveBeenCalled()
      // unknown は base_image に存在しないのでスキップ
      expect(mockLastUpdatedAt).toHaveBeenCalledWith('ariang')
      expect(mockLastUpdatedAt).not.toHaveBeenCalledWith('unknown')
    })
  })
})
