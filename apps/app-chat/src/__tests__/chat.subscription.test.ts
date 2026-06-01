import request from 'supertest'
import app from '../app'
import { resetDb, seedProfile } from './helpers/mock-db'

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../../../packages/shared/src/middleware/auth', () => ({
  withAuth: (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.slice(7)
    if (!token) return res.status(401).json({ error: 'No autorizado.' })
    const { createMockClient } = require('./helpers/mock-db')
    req.authUser = { id: token }
    req.supabase = createMockClient()
    next()
  },
}))

jest.mock('../../../../packages/shared/src/lib/supabase', () => ({
  createServiceRoleClient: () => require('./helpers/mock-db').createMockClient(),
  createAnonClient: () => require('./helpers/mock-db').createMockClient(),
}))

// ─── Test users ───────────────────────────────────────────────────────────────

const USER1 = 'sub-user-1'
const USER2 = 'sub-user-2'

const eventTitle = 'Realtime Test Event'
const eventImageUrl = 'https://via.placeholder.com/400'
const eventAddress = 'Test Address'

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  resetDb()
  seedProfile(USER1, 'Sub User One')
  seedProfile(USER2, 'Sub User Two')
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Realtime Subscription Simulation', () => {
  describe('INSERT Event Simulation', () => {
    it('User1 sends message — both users see it via GET', async () => {
      const roomId = 'sub-shared-room'
      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${USER1}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${USER2}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      const sendRes = await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${USER1}`)
        .send({ text: 'Message from User1' })
        .expect(201)

      const messageId = sendRes.body.id

      const user1View = await request(app)
        .get(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${USER1}`)
        .expect(200)
      expect(user1View.body.some((m: { id: string }) => m.id === messageId)).toBe(true)

      const user2View = await request(app)
        .get(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${USER2}`)
        .expect(200)
      expect(user2View.body.some((m: { id: string }) => m.id === messageId)).toBe(true)

      const msg = user2View.body.find((m: { id: string }) => m.id === messageId)
      expect(msg?.senderName).toBeDefined()
      expect(msg?.senderAvatar).toBeDefined()
    })

    it('Rapid messages preserve order for realtime subscribers', async () => {
      const roomId = 'sub-order-room'
      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${USER1}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${USER2}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      const texts = ['Message A', 'Message B', 'Message C']
      const sentIds: string[] = []

      for (const text of texts) {
        const res = await request(app)
          .post(`/chat/rooms/${roomId}/messages`)
          .set('Authorization', `Bearer ${USER1}`)
          .send({ text })
          .expect(201)
        sentIds.push(res.body.id)
        await new Promise(r => setTimeout(r, 5))
      }

      const res = await request(app)
        .get(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${USER2}`)
        .expect(200)

      const retrievedIds = res.body.map((m: { id: string }) => m.id)
      const lastThree = retrievedIds.slice(-3)
      expect(lastThree).toEqual(sentIds)
    })

    it('Message metadata is consistent across viewers', async () => {
      const roomId = 'sub-metadata-room'
      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${USER1}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${USER2}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      const testText = `Metadata test ${Date.now()}`
      const sendRes = await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${USER1}`)
        .send({ text: testText })
        .expect(201)

      const senderId = sendRes.body.user_id
      const timestamp = sendRes.body.created_at

      const res = await request(app)
        .get(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${USER2}`)
        .expect(200)

      const msg = res.body.find((m: { text: string }) => m.text === testText)
      expect(msg?.senderId).toBe(senderId)
      expect(msg?.timestamp).toBe(timestamp)
    })
  })

  describe('Subscription Channel Management', () => {
    it('Room members list is consistent with subscriptions', async () => {
      const roomId = 'sub-members-room'

      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${USER1}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      let membersRes = await request(app)
        .get(`/chat/rooms/${roomId}/members`)
        .set('Authorization', `Bearer ${USER1}`)
        .expect(200)

      const initialCount = membersRes.body.length
      expect(initialCount).toBe(1)

      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${USER2}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      membersRes = await request(app)
        .get(`/chat/rooms/${roomId}/members`)
        .set('Authorization', `Bearer ${USER1}`)
        .expect(200)

      expect(membersRes.body.length).toBe(initialCount + 1)
      expect(membersRes.body.some((m: { userId: string }) => m.userId === USER2)).toBe(true)
    })

    it('Unsubscribe on leave removes from member list', async () => {
      const roomId = 'sub-leave-room'

      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${USER1}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${USER2}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      await request(app)
        .delete(`/chat/rooms/${roomId}/leave`)
        .set('Authorization', `Bearer ${USER2}`)
        .expect(204)

      const membersRes = await request(app)
        .get(`/chat/rooms/${roomId}/members`)
        .set('Authorization', `Bearer ${USER1}`)
        .expect(200)

      expect(membersRes.body.some((m: { userId: string }) => m.userId === USER2)).toBe(false)
    })
  })

  describe('Optimistic Update Handling', () => {
    it('Message sent by user is immediately visible in own view', async () => {
      const roomId = 'sub-optimistic-room'
      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${USER1}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      const optimisticText = `Optimistic message ${Date.now()}`
      const sendRes = await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${USER1}`)
        .send({ text: optimisticText })
        .expect(201)

      const getRes = await request(app)
        .get(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${USER1}`)
        .expect(200)

      expect(getRes.body.some((m: { text: string }) => m.text === optimisticText)).toBe(true)
      expect(
        getRes.body.find((m: { text: string }) => m.text === optimisticText)?.id,
      ).toBe(sendRes.body.id)
    })

    it('Failed sends do not add messages', async () => {
      const roomId = 'sub-fail-room'
      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${USER1}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${USER1}`)
        .send({ text: '' })
        .expect(400)

      const beforeCount = (
        await request(app)
          .get(`/chat/rooms/${roomId}/messages`)
          .set('Authorization', `Bearer ${USER1}`)
          .expect(200)
      ).body.length

      await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${USER1}`)
        .send({ text: 'Recovery message' })
        .expect(201)

      const afterCount = (
        await request(app)
          .get(`/chat/rooms/${roomId}/messages`)
          .set('Authorization', `Bearer ${USER1}`)
          .expect(200)
      ).body.length

      expect(afterCount).toBe(beforeCount + 1)
    })
  })

  describe('Realtime Read State Sync', () => {
    it('Unread count reflects messages sent after join', async () => {
      const roomId = 'sub-unread-realtime-room'

      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${USER1}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${USER2}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${USER1}`)
        .send({ text: 'Unread message' })
        .expect(201)

      let unreadRes = await request(app)
        .get(`/chat/rooms/${roomId}/unread`)
        .set('Authorization', `Bearer ${USER2}`)
        .expect(200)
      expect(unreadRes.body.unread).toBeGreaterThan(0)

      await request(app)
        .post(`/chat/rooms/${roomId}/read`)
        .set('Authorization', `Bearer ${USER2}`)
        .expect(204)

      unreadRes = await request(app)
        .get(`/chat/rooms/${roomId}/unread`)
        .set('Authorization', `Bearer ${USER2}`)
        .expect(200)
      expect(unreadRes.body.unread).toBe(0)

      await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${USER1}`)
        .send({ text: 'New unread message' })
        .expect(201)

      unreadRes = await request(app)
        .get(`/chat/rooms/${roomId}/unread`)
        .set('Authorization', `Bearer ${USER2}`)
        .expect(200)
      expect(unreadRes.body.unread).toBeGreaterThan(0)
    })

    it('Marking room as read resets unread count to zero', async () => {
      const roomId = 'sub-read-state-room'

      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${USER1}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${USER2}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${USER1}`)
        .send({ text: 'Message before read' })
        .expect(201)

      await request(app)
        .post(`/chat/rooms/${roomId}/read`)
        .set('Authorization', `Bearer ${USER2}`)
        .expect(204)

      const unreadRes = await request(app)
        .get(`/chat/rooms/${roomId}/unread`)
        .set('Authorization', `Bearer ${USER2}`)
        .expect(200)

      expect(unreadRes.body.unread).toBe(0)
    })
  })

  describe('Realtime Error Recovery', () => {
    it('Recovers from transient errors', async () => {
      const roomId = 'sub-recovery-room'

      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${USER1}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${USER1}`)
        .send({ text: 'Before error' })
        .expect(201)

      await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${USER1}`)
        .send({ text: null })
        .expect(400)

      await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${USER1}`)
        .send({ text: 'After error' })
        .expect(201)

      const res = await request(app)
        .get(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${USER1}`)
        .expect(200)

      expect(res.body.some((m: { text: string }) => m.text === 'Before error')).toBe(true)
      expect(res.body.some((m: { text: string }) => m.text === 'After error')).toBe(true)
    })

    it('Handles reconnection by fetching fresh state', async () => {
      const roomId = 'sub-reconnect-room'

      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${USER1}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${USER1}`)
        .send({ text: 'Before disconnect' })
        .expect(201)

      const freshState = await request(app)
        .get(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${USER1}`)
        .expect(200)
      expect(freshState.body.some((m: { text: string }) => m.text === 'Before disconnect')).toBe(true)

      await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${USER1}`)
        .send({ text: 'After reconnect' })
        .expect(201)

      const finalState = await request(app)
        .get(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${USER1}`)
        .expect(200)

      expect(finalState.body.some((m: { text: string }) => m.text === 'Before disconnect')).toBe(true)
      expect(finalState.body.some((m: { text: string }) => m.text === 'After reconnect')).toBe(true)
    })
  })
})
