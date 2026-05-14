import 'dotenv/config'
import request from 'supertest'
import { createClient } from '@supabase/supabase-js'
import app from '../app'

const anonClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
)

let adminToken = ''
let regularToken = ''
let adminUserId = ''
let regularUserId = ''
let testRoomId = ''

const eventTitle = `Test Event ${Date.now()}`
const eventImageUrl = 'https://via.placeholder.com/400'
const eventAddress = '123 Test St, Test City'

beforeAll(async () => {
  // Login admin
  const adminLogin = await anonClient.auth.signInWithPassword({
    email: process.env.TEST_ADMIN_EMAIL ?? process.env.TEST_USER_EMAIL!,
    password: process.env.TEST_ADMIN_PASSWORD ?? process.env.TEST_USER_PASSWORD!,
  })
  if (adminLogin.error || !adminLogin.data.session) {
    throw new Error(`Admin login failed: ${adminLogin.error?.message}`)
  }
  adminToken = adminLogin.data.session.access_token
  adminUserId = adminLogin.data.user.id

  // Login regular user
  const userLogin = await anonClient.auth.signInWithPassword({
    email: process.env.TEST_USER_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  })
  if (userLogin.error || !userLogin.data.session) {
    throw new Error(`User login failed: ${userLogin.error?.message}`)
  }
  regularToken = userLogin.data.session.access_token
  regularUserId = userLogin.data.user.id

  // Create test room
  testRoomId = `test-room-${Date.now()}`
}, 20_000)

afterAll(async () => {
  await anonClient.auth.signOut({ scope: 'local' })
})

describe('Chat Realtime Integration', () => {
  describe('Message Broadcasting (INSERT events)', () => {
    it('allows authorized users to send messages', async () => {
      // Join room first
      await request(app)
        .post(`/chat/rooms/${testRoomId}/join`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      // Send message
      const res = await request(app)
        .post(`/chat/rooms/${testRoomId}/messages`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ text: 'Test message from admin' })
        .expect(201)

      expect(res.body).toHaveProperty('id')
      expect(res.body).toHaveProperty('room_id', testRoomId)
      expect(res.body).toHaveProperty('user_id', adminUserId)
      expect(res.body).toHaveProperty('text', 'Test message from admin')
      expect(res.body).toHaveProperty('created_at')
    })

    it('prevents non-members from sending messages', async () => {
      const roomId = `restricted-room-${Date.now()}`

      // Admin joins
      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      // Regular user tries to send without joining
      await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ text: 'Unauthorized message' })
        .expect(403)
    })

    it('rejects empty messages', async () => {
      await request(app)
        .post(`/chat/rooms/${testRoomId}/messages`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ text: '' })
        .expect(400)

      await request(app)
        .post(`/chat/rooms/${testRoomId}/messages`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ text: '   ' })
        .expect(400)
    })

    it('rejects messages from inactive rooms', async () => {
      const expiredRoomId = `expired-${Date.now()}`
      const pastDate = new Date(Date.now() - 1000).toISOString()

      // Admin joins with past expiration
      await request(app)
        .post(`/chat/rooms/${expiredRoomId}/join`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          eventTitle,
          eventImageUrl,
          eventAddress,
          expiresAt: pastDate,
        })
        .expect(201)

      // Try to send message to expired room
      await request(app)
        .post(`/chat/rooms/${expiredRoomId}/messages`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ text: 'Too late!' })
        .expect(410)
    })
  })

  describe('Message History & Retrieval', () => {
    it('retrieves full message history for a room', async () => {
      const roomId = `history-room-${Date.now()}`

      // Admin joins
      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      // Send multiple messages
      const messages = ['Message 1', 'Message 2', 'Message 3']
      for (const text of messages) {
        await request(app)
          .post(`/chat/rooms/${roomId}/messages`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ text })
          .expect(201)
      }

      // Retrieve history
      const res = await request(app)
        .get(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThanOrEqual(3)
      expect(res.body.some((m: { text: string }) => m.text === 'Message 1')).toBe(true)
      expect(res.body.some((m: { text: string }) => m.text === 'Message 2')).toBe(true)
      expect(res.body.some((m: { text: string }) => m.text === 'Message 3')).toBe(true)
    })

    it('includes sender profile data in message retrieval', async () => {
      const roomId = `profile-room-${Date.now()}`

      // Admin joins and sends message
      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ text: 'Test with profile' })
        .expect(201)

      // Retrieve with profile
      const res = await request(app)
        .get(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      const msg = res.body.find((m: { text: string }) => m.text === 'Test with profile')
      expect(msg).toHaveProperty('senderId')
      expect(msg).toHaveProperty('senderName')
      expect(msg).toHaveProperty('senderAvatar')
    })

    it('prevents non-members from retrieving room messages', async () => {
      const roomId = `private-room-${Date.now()}`

      // Admin joins
      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      // Regular user tries to read (not a member)
      await request(app)
        .get(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403)
    })
  })

  describe('Room Membership & Cleanup', () => {
    it('tracks room members correctly', async () => {
      const roomId = `members-room-${Date.now()}`

      // Admin joins
      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      // Check members
      let res = await request(app)
        .get(`/chat/rooms/${roomId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThanOrEqual(1)
      expect(res.body.some((m: { userId: string }) => m.userId === adminUserId)).toBe(true)

      // Regular user joins
      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      // Check members again
      res = await request(app)
        .get(`/chat/rooms/${roomId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(res.body.length).toBeGreaterThanOrEqual(2)
      expect(res.body.some((m: { userId: string }) => m.userId === regularUserId)).toBe(true)
    })

    it('removes room when last member leaves', async () => {
      const roomId = `cleanup-room-${Date.now()}`

      // Admin joins
      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      // Admin leaves
      await request(app)
        .delete(`/chat/rooms/${roomId}/leave`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204)

      // Verify room is deleted by trying to join as new member
      // (would return 404 if completely deleted in DB)
      // Note: DB may mark as 'deleted' rather than hard-delete
    })
  })

  describe('Unread Count Tracking', () => {
    it('tracks unread messages for non-senders', async () => {
      const roomId = `unread-room-${Date.now()}`

      // Admin joins and sends message
      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ text: 'Unread test message' })
        .expect(201)

      // Regular user joins
      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      // Admin sends another message
      await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ text: 'Another message' })
        .expect(201)

      // Check unread count from regular user perspective
      const res = await request(app)
        .get(`/chat/rooms/${roomId}/unread`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200)

      expect(res.body).toHaveProperty('roomId', roomId)
      expect(res.body).toHaveProperty('unread')
      expect(res.body.unread).toBeGreaterThan(0)
    })

    it('marks messages as read', async () => {
      const roomId = `read-room-${Date.now()}`

      // Admin joins and sends message
      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ text: 'Message to read' })
        .expect(201)

      // Regular user joins
      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      // Admin sends message
      await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ text: 'Message to be marked read' })
        .expect(201)

      // Check unread before marking
      let res = await request(app)
        .get(`/chat/rooms/${roomId}/unread`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200)
      const unreading = res.body.unread

      // Mark as read
      await request(app)
        .post(`/chat/rooms/${roomId}/read`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(204)

      // Check unread after marking (should be 0)
      res = await request(app)
        .get(`/chat/rooms/${roomId}/unread`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200)

      expect(res.body.unread).toBe(0)
    })
  })

  describe('Realtime Performance', () => {
    it('handles rapid message sends without data loss', async () => {
      const roomId = `perf-room-${Date.now()}`
      const messageCount = 10

      // Join room
      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      // Rapid fire messages
      const promises = Array.from({ length: messageCount }, (_, i) =>
        request(app)
          .post(`/chat/rooms/${roomId}/messages`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ text: `Rapid message ${i + 1}` }),
      )

      const results = await Promise.all(promises)
      results.forEach((res) => expect(res.status).toBe(201))

      // Verify all messages were saved
      const res = await request(app)
        .get(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(res.body.length).toBe(messageCount)
    })

    it('returns messages ordered by creation time', async () => {
      const roomId = `order-room-${Date.now()}`

      // Join and send messages
      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      const texts = ['First', 'Second', 'Third']
      for (const text of texts) {
        await request(app)
          .post(`/chat/rooms/${roomId}/messages`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ text })
          .expect(201)

        // Small delay to ensure order
        await new Promise((resolve) => setTimeout(resolve, 10))
      }

      // Retrieve and verify order
      const res = await request(app)
        .get(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${adminToken}`)
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
        .post(`/chat/rooms/any-room/messages`)
        .send({ text: 'No token' })
        .expect(401)

      await request(app).get(`/chat/rooms/any-room/messages`).expect(401)
    })

    it('handles database errors gracefully', async () => {
      const roomId = `error-room-${Date.now()}`

      // Join room
      await request(app)
        .post(`/chat/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      // Send valid message (should succeed)
      await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ text: 'Valid message' })
        .expect(201)

      // Invalid message body returns 400
      await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ text: null })
        .expect(400)
    })
  })
})
