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

const ADMIN = 'rt-admin'
const REGULAR = 'rt-regular'

const eventTitle = 'Test Event'
const eventImageUrl = 'https://via.placeholder.com/400'
const eventAddress = '123 Test St'

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  resetDb()
  seedProfile(ADMIN, 'Admin User')
  seedProfile(REGULAR, 'Regular User')
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Chat Realtime Integration', () => {
  describe('Message Broadcasting (INSERT events)', () => {
    it('allows authorized users to send messages', async () => {
      const roomId = 'rt-send-room'
      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${ADMIN}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      const res = await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${ADMIN}`)
        .send({ text: 'Test message from admin' })
        .expect(201)

      expect(res.body).toHaveProperty('id')
      expect(res.body).toHaveProperty('room_id', roomId)
      expect(res.body).toHaveProperty('user_id', ADMIN)
      expect(res.body).toHaveProperty('text', 'Test message from admin')
      expect(res.body).toHaveProperty('created_at')
    })

    it('prevents non-members from sending messages', async () => {
      const roomId = 'rt-restricted-room'
      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${ADMIN}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${REGULAR}`)
        .send({ text: 'Unauthorized message' })
        .expect(403)
    })

    it('rejects empty messages', async () => {
      const roomId = 'rt-empty-msg-room'
      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${ADMIN}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${ADMIN}`)
        .send({ text: '' })
        .expect(400)

      await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${ADMIN}`)
        .send({ text: '   ' })
        .expect(400)
    })

    it('rejects messages from inactive rooms', async () => {
      const expiredRoomId = 'rt-expired-room'
      const pastDate = new Date(Date.now() - 1000).toISOString()

      await request(app)
        .post(`/chat/rooms/${expiredRoomId}/join`)
        .set('Authorization', `Bearer ${ADMIN}`)
        .send({ eventTitle, eventImageUrl, eventAddress, expiresAt: pastDate })
        .expect(201)

      await request(app)
        .post(`/chat/rooms/${expiredRoomId}/messages`)
        .set('Authorization', `Bearer ${ADMIN}`)
        .send({ text: 'Too late!' })
        .expect(410)
    })
  })

  describe('Message History & Retrieval', () => {
    it('retrieves full message history for a room', async () => {
      const roomId = 'rt-history-room'
      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${ADMIN}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      const messages = ['Message 1', 'Message 2', 'Message 3']
      for (const text of messages) {
        await request(app)
          .post(`/chat/rooms/${roomId}/messages`)
          .set('Authorization', `Bearer ${ADMIN}`)
          .send({ text })
          .expect(201)
      }

      const res = await request(app)
        .get(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${ADMIN}`)
        .expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThanOrEqual(3)
      expect(res.body.some((m: { text: string }) => m.text === 'Message 1')).toBe(true)
      expect(res.body.some((m: { text: string }) => m.text === 'Message 2')).toBe(true)
      expect(res.body.some((m: { text: string }) => m.text === 'Message 3')).toBe(true)
    })

    it('includes sender profile data in message retrieval', async () => {
      const roomId = 'rt-profile-room'
      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${ADMIN}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${ADMIN}`)
        .send({ text: 'Test with profile' })
        .expect(201)

      const res = await request(app)
        .get(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${ADMIN}`)
        .expect(200)

      const msg = res.body.find((m: { text: string }) => m.text === 'Test with profile')
      expect(msg).toHaveProperty('senderId')
      expect(msg).toHaveProperty('senderName')
      expect(msg).toHaveProperty('senderAvatar')
    })

    it('prevents non-members from retrieving room messages', async () => {
      const roomId = 'rt-private-room'
      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${ADMIN}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      await request(app)
        .get(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${REGULAR}`)
        .expect(403)
    })
  })

  describe('Room Membership & Cleanup', () => {
    it('tracks room members correctly', async () => {
      const roomId = 'rt-members-room'
      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${ADMIN}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      let res = await request(app)
        .get(`/chat/rooms/${roomId}/members`)
        .set('Authorization', `Bearer ${ADMIN}`)
        .expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThanOrEqual(1)
      expect(res.body.some((m: { userId: string }) => m.userId === ADMIN)).toBe(true)

      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${REGULAR}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      res = await request(app)
        .get(`/chat/rooms/${roomId}/members`)
        .set('Authorization', `Bearer ${ADMIN}`)
        .expect(200)

      expect(res.body.length).toBeGreaterThanOrEqual(2)
      expect(res.body.some((m: { userId: string }) => m.userId === REGULAR)).toBe(true)
    })

    it('marks room as deleted when last member leaves', async () => {
      const roomId = 'rt-cleanup-room'
      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${ADMIN}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      await request(app)
        .delete(`/chat/rooms/${roomId}/leave`)
        .set('Authorization', `Bearer ${ADMIN}`)
        .expect(204)

      const { db } = require('./helpers/mock-db')
      const room = db.chat_rooms.get(roomId)
      expect(room?.status).toBe('deleted')
    })
  })

  describe('Unread Count Tracking', () => {
    it('tracks unread messages for non-senders', async () => {
      const roomId = 'rt-unread-room'

      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${ADMIN}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${ADMIN}`)
        .send({ text: 'Unread test message' })
        .expect(201)

      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${REGULAR}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${ADMIN}`)
        .send({ text: 'Another message' })
        .expect(201)

      const res = await request(app)
        .get(`/chat/rooms/${roomId}/unread`)
        .set('Authorization', `Bearer ${REGULAR}`)
        .expect(200)

      expect(res.body).toHaveProperty('roomId', roomId)
      expect(res.body).toHaveProperty('unread')
      expect(res.body.unread).toBeGreaterThan(0)
    })

    it('marks messages as read', async () => {
      const roomId = 'rt-read-room'

      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${ADMIN}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${REGULAR}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${ADMIN}`)
        .send({ text: 'Message to be marked read' })
        .expect(201)

      await request(app)
        .post(`/chat/rooms/${roomId}/read`)
        .set('Authorization', `Bearer ${REGULAR}`)
        .expect(204)

      const res = await request(app)
        .get(`/chat/rooms/${roomId}/unread`)
        .set('Authorization', `Bearer ${REGULAR}`)
        .expect(200)

      expect(res.body.unread).toBe(0)
    })
  })

  describe('Realtime Performance', () => {
    it('handles rapid message sends without data loss', async () => {
      const roomId = 'rt-perf-room'
      const messageCount = 10

      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${ADMIN}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      const promises = Array.from({ length: messageCount }, (_, i) =>
        request(app)
          .post(`/chat/rooms/${roomId}/messages`)
          .set('Authorization', `Bearer ${ADMIN}`)
          .send({ text: `Rapid message ${i + 1}` }),
      )

      const results = await Promise.all(promises)
      results.forEach(res => expect(res.status).toBe(201))

      const res = await request(app)
        .get(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${ADMIN}`)
        .expect(200)

      expect(res.body.length).toBe(messageCount)
    })

    it('returns messages ordered by creation time', async () => {
      const roomId = 'rt-order-room'

      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${ADMIN}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      const texts = ['First', 'Second', 'Third']
      for (const text of texts) {
        await request(app)
          .post(`/chat/rooms/${roomId}/messages`)
          .set('Authorization', `Bearer ${ADMIN}`)
          .send({ text })
          .expect(201)
        await new Promise(r => setTimeout(r, 5))
      }

      const res = await request(app)
        .get(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${ADMIN}`)
        .expect(200)

      const ourMessages = res.body.filter((m: { text: string }) => texts.includes(m.text))
      expect(ourMessages[0].text).toBe('First')
      expect(ourMessages[1].text).toBe('Second')
      expect(ourMessages[2].text).toBe('Third')
    })
  })

  describe('Error Handling', () => {
    it('rejects requests without auth token', async () => {
      await request(app)
        .post('/chat/rooms/any-room/messages')
        .send({ text: 'No token' })
        .expect(401)

      await request(app).get('/chat/rooms/any-room/messages').expect(401)
    })

    it('handles invalid message body gracefully', async () => {
      const roomId = 'rt-error-room'
      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${ADMIN}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${ADMIN}`)
        .send({ text: 'Valid message' })
        .expect(201)

      await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${ADMIN}`)
        .send({ text: null })
        .expect(400)
    })
  })
})
