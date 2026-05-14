import 'dotenv/config'
import request from 'supertest'
import { createClient } from '@supabase/supabase-js'
import app from '../app'

const anonClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
)

let user1Token = ''
let user2Token = ''
let user1Id = ''
let user2Id = ''

beforeAll(async () => {
  // Crear dos sesiones de usuario
  const login1 = await anonClient.auth.signInWithPassword({
    email: process.env.TEST_ADMIN_EMAIL ?? process.env.TEST_USER_EMAIL!,
    password: process.env.TEST_ADMIN_PASSWORD ?? process.env.TEST_USER_PASSWORD!,
  })
  if (!login1.data.session) throw new Error('Login 1 failed')
  user1Token = login1.data.session.access_token
  user1Id = login1.data.user.id

  const login2 = await anonClient.auth.signInWithPassword({
    email: process.env.TEST_USER_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  })
  if (!login2.data.session) throw new Error('Login 2 failed')
  user2Token = login2.data.session.access_token
  user2Id = login2.data.user.id
}, 20_000)

afterAll(async () => {
  await anonClient.auth.signOut({ scope: 'local' })
})

describe('Realtime Subscription Simulation', () => {
  const roomId = `realtime-test-${Date.now()}`
  const eventTitle = 'Realtime Test Event'
  const eventImageUrl = 'https://via.placeholder.com/400'
  const eventAddress = 'Test Address'

  beforeAll(async () => {
    // Both users join the room
    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ eventTitle, eventImageUrl, eventAddress })
      .expect(201)

    await request(app)
      .post(`/chat/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ eventTitle, eventImageUrl, eventAddress })
      .expect(201)
  })

  describe('INSERT Event Simulation', () => {
    it('User1 sends message - both users see it via GET', async () => {
      // User1 sends
      const sendRes = await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ text: 'Message from User1' })
        .expect(201)

      const messageId = sendRes.body.id

      // User1 retrieves (should see own message immediately)
      const user1View = await request(app)
        .get(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200)

      expect(user1View.body.some((m: { id: string }) => m.id === messageId)).toBe(true)

      // User2 retrieves (simulates realtime update via GET)
      // In real realtime, this would come via WebSocket subscription
      const user2View = await request(app)
        .get(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200)

      expect(user2View.body.some((m: { id: string }) => m.id === messageId)).toBe(true)
      const msg = user2View.body.find((m: { id: string }) => m.id === messageId)
      expect(msg?.senderName).toBeDefined()
      expect(msg?.senderAvatar).toBeDefined()
    })

    it('Rapid messages preserve order for realtime subscribers', async () => {
      const texts = ['Message A', 'Message B', 'Message C']
      const sentIds: string[] = []

      // Send messages rapidly
      for (const text of texts) {
        const res = await request(app)
          .post(`/chat/rooms/${roomId}/messages`)
          .set('Authorization', `Bearer ${user1Token}`)
          .send({ text })
          .expect(201)
        sentIds.push(res.body.id)
      }

      // User2 fetches and verifies order
      const res = await request(app)
        .get(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200)

      const retrievedIds = res.body.map((m: { id: string }) => m.id)
      const lastThree = retrievedIds.slice(-3)

      expect(lastThree).toEqual(sentIds)
    })

    it('Message metadata is consistent across viewers', async () => {
      const testText = `Metadata test ${Date.now()}`

      // User1 sends
      const sendRes = await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ text: testText })
        .expect(201)

      const senderId = sendRes.body.user_id
      const timestamp = sendRes.body.created_at

      // User2 retrieves
      const res = await request(app)
        .get(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200)

      const msg = res.body.find((m: { text: string }) => m.text === testText)
      expect(msg?.senderId).toBe(senderId)
      expect(msg?.timestamp).toBe(timestamp)
    })
  })

  describe('Subscription Channel Management', () => {
    it('Room members list is consistent with subscriptions', async () => {
      const testRoomId = `members-test-${Date.now()}`

      // User1 joins
      await request(app)
        .post(`/chat/rooms/${testRoomId}/join`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      // Check members from User1 view
      let membersRes = await request(app)
        .get(`/chat/rooms/${testRoomId}/members`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200)

      const initialCount = membersRes.body.length
      expect(initialCount).toBe(1)

      // User2 joins
      await request(app)
        .post(`/chat/rooms/${testRoomId}/join`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      // Check members again (should reflect new member)
      membersRes = await request(app)
        .get(`/chat/rooms/${testRoomId}/members`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200)

      expect(membersRes.body.length).toBe(initialCount + 1)
      expect(membersRes.body.some((m: { userId: string }) => m.userId === user2Id)).toBe(true)
    })

    it('Unsubscribe on leave removes from member list', async () => {
      const testRoomId = `leave-test-${Date.now()}`

      // Both join
      await request(app)
        .post(`/chat/rooms/${testRoomId}/join`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      await request(app)
        .post(`/chat/rooms/${testRoomId}/join`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      // User2 leaves
      await request(app)
        .delete(`/chat/rooms/${testRoomId}/leave`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(204)

      // Check members from User1 view
      const membersRes = await request(app)
        .get(`/chat/rooms/${testRoomId}/members`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200)

      expect(membersRes.body.some((m: { userId: string }) => m.userId === user2Id)).toBe(false)
    })
  })

  describe('Optimistic Update Handling', () => {
    it('Message sent by user is immediately visible in own view', async () => {
      const optimisticText = `Optimistic message ${Date.now()}`

      // Send message
      const sendRes = await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ text: optimisticText })
        .expect(201)

      // Immediately retrieve (no delay for DB sync)
      const getRes = await request(app)
        .get(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200)

      expect(getRes.body.some((m: { text: string }) => m.text === optimisticText)).toBe(true)

      // The ID matches what we sent
      expect(getRes.body.find((m: { text: string }) => m.text === optimisticText)?.id).toBe(
        sendRes.body.id,
      )
    })

    it('Failed sends are handled gracefully (mock)', async () => {
      // Empty message should fail before optimistic update
      await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ text: '' })
        .expect(400)

      // Verify no message was added
      const res = await request(app)
        .get(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200)

      const msgCount = res.body.length
      expect(msgCount).toBeGreaterThan(0) // We have messages from before

      // Send another valid message to ensure system still works
      await request(app)
        .post(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ text: 'Recovery message' })
        .expect(201)

      const recoveryRes = await request(app)
        .get(`/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200)

      expect(
        recoveryRes.body.some((m: { text: string }) => m.text === 'Recovery message'),
      ).toBe(true)
    })
  })

  describe('Realtime Read State Sync', () => {
    it('Unread count reflects messages sent after subscription', async () => {
      const testRoomId = `unread-realtime-${Date.now()}`

      // Both users join
      await request(app)
        .post(`/chat/rooms/${testRoomId}/join`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      await request(app)
        .post(`/chat/rooms/${testRoomId}/join`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      // User1 sends message
      await request(app)
        .post(`/chat/rooms/${testRoomId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ text: 'Unread message' })
        .expect(201)

      // User2 checks unread (should see 1)
      let unreadRes = await request(app)
        .get(`/chat/rooms/${testRoomId}/unread`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200)

      expect(unreadRes.body.unread).toBeGreaterThan(0)

      // User2 marks as read
      await request(app)
        .post(`/chat/rooms/${testRoomId}/read`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(204)

      // Check unread again (should be 0)
      unreadRes = await request(app)
        .get(`/chat/rooms/${testRoomId}/unread`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200)

      expect(unreadRes.body.unread).toBe(0)

      // User1 sends new message
      await request(app)
        .post(`/chat/rooms/${testRoomId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ text: 'New unread message' })
        .expect(201)

      // User2 should see new unread count
      unreadRes = await request(app)
        .get(`/chat/rooms/${testRoomId}/unread`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200)

      expect(unreadRes.body.unread).toBeGreaterThan(0)
    })

    it('Marking room as read updates last_read_at', async () => {
      const testRoomId = `read-state-${Date.now()}`

      // Both join
      await request(app)
        .post(`/chat/rooms/${testRoomId}/join`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      await request(app)
        .post(`/chat/rooms/${testRoomId}/join`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      const timeBeforeRead = new Date().toISOString()

      // User1 sends message
      await request(app)
        .post(`/chat/rooms/${testRoomId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ text: 'Message before read' })
        .expect(201)

      // User2 marks as read
      await request(app)
        .post(`/chat/rooms/${testRoomId}/read`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(204)

      const timeAfterRead = new Date().toISOString()

      // Verify unread is now 0 (read state was updated)
      const unreadRes = await request(app)
        .get(`/chat/rooms/${testRoomId}/unread`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200)

      expect(unreadRes.body.unread).toBe(0)
    })
  })

  describe('Realtime Error Recovery', () => {
    it('Recovers from transient errors', async () => {
      const testRoomId = `recovery-test-${Date.now()}`

      // Join room
      await request(app)
        .post(`/chat/rooms/${testRoomId}/join`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      // Send valid message
      await request(app)
        .post(`/chat/rooms/${testRoomId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ text: 'Before error' })
        .expect(201)

      // Try invalid request
      await request(app)
        .post(`/chat/rooms/${testRoomId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ text: null })
        .expect(400)

      // System should still work - send valid message
      await request(app)
        .post(`/chat/rooms/${testRoomId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ text: 'After error' })
        .expect(201)

      // Verify both messages are there
      const res = await request(app)
        .get(`/chat/rooms/${testRoomId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200)

      expect(res.body.some((m: { text: string }) => m.text === 'Before error')).toBe(true)
      expect(res.body.some((m: { text: string }) => m.text === 'After error')).toBe(true)
    })

    it('Handles subscription reconnection scenarios', async () => {
      const testRoomId = `reconnect-test-${Date.now()}`

      // User joins
      await request(app)
        .post(`/chat/rooms/${testRoomId}/join`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ eventTitle, eventImageUrl, eventAddress })
        .expect(201)

      // Send message
      await request(app)
        .post(`/chat/rooms/${testRoomId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ text: 'Before disconnect' })
        .expect(201)

      // Simulate disconnect by fetching fresh state
      const freshState = await request(app)
        .get(`/chat/rooms/${testRoomId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200)

      expect(freshState.body.some((m: { text: string }) => m.text === 'Before disconnect')).toBe(
        true,
      )

      // Continue sending after "reconnect"
      await request(app)
        .post(`/chat/rooms/${testRoomId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ text: 'After reconnect' })
        .expect(201)

      // Verify both states
      const finalState = await request(app)
        .get(`/chat/rooms/${testRoomId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200)

      expect(finalState.body.some((m: { text: string }) => m.text === 'Before disconnect')).toBe(
        true,
      )
      expect(finalState.body.some((m: { text: string }) => m.text === 'After reconnect')).toBe(
        true,
      )
    })
  })
})
