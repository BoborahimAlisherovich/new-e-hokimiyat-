/**
 * Chat API Module
 * 
 * To'g'ridan-to'g'ri xabar almashish funksiyalari:
 * - Suhbatlar ro'yxati
 * - Xabar yuborish va o'qish
 * - O'qilmagan xabarlar soni
 * 
 * @module api/chat
 * @author E-Hokimiyat Development Team
 */

import type { PaginatedResponse } from '@/types'
import type { ChatMessage, ChatConversation } from './types'
import { fetchApi, buildQueryString } from './client'

// ============================================================================
// Re-export Types
// ============================================================================

export type { ChatMessage, ChatConversation } from './types'

// ============================================================================
// Chat Conversations
// ============================================================================

/**
 * Suhbatlar ro'yxatini oladi
 * 
 * @param page - Sahifa raqami (default: 1)
 * @param pageSize - Sahifa o'lchami (default: 50)
 * @returns Suhbatlar ro'yxati
 * 
 * @example
 * const conversations = await getChatConversations()
 * conversations.forEach(conv => console.log(conv.participant.name))
 */
export async function getChatConversations(
  page = 1,
  pageSize = 50
): Promise<ChatConversation[]> {
  const queryString = buildQueryString({ page, page_size: pageSize })
  const response = await fetchApi<PaginatedResponse<ChatConversation>>(
    `/chat/conversations${queryString}`
  )
  
  return response.results ?? []
}

// ============================================================================
// Chat Messages
// ============================================================================

/**
 * Ma'lum foydalanuvchi bilan xabarlar tarixini oladi
 * 
 * @param userId - Suhbatdosh ID
 * @param page - Sahifa raqami (default: 1)
 * @param pageSize - Sahifa o'lchami (default: 100)
 * @returns Xabarlar ro'yxati
 * 
 * @example
 * const messages = await getChatMessages(5)
 */
export async function getChatMessages(
  userId: number | string,
  page = 1,
  pageSize = 100
): Promise<ChatMessage[]> {
  const queryString = buildQueryString({ page, page_size: pageSize })
  const response = await fetchApi<PaginatedResponse<ChatMessage>>(
    `/chat/messages/${userId}${queryString}`
  )
  
  return response.results ?? []
}

/**
 * Xabar yuboradi
 * 
 * @param receiverId - Qabul qiluvchi ID
 * @param data - Xabar matni (string) yoki obyekt (content va attachment)
 * @returns Yuborilgan xabar
 * 
 * @example
 * const message = await sendChatMessage(5, 'Salom!')
 * // yoki
 * const message = await sendChatMessage(5, { content: 'Salom!', attachment: file })
 */
export async function sendChatMessage(
  receiverId: number | string,
  data: string | { content: string; attachment?: File | null }
): Promise<ChatMessage> {
  // String kelsa oddiy content
  const content = typeof data === 'string' ? data : data.content
  const attachment = typeof data === 'string' ? undefined : data.attachment
  
  // Agar fayl bo'lsa FormData ishlatamiz
  if (attachment) {
    const formData = new FormData()
    formData.append('receiver', String(receiverId))
    formData.append('content', content)
    formData.append('attachment', attachment)
    
    return fetchApi<ChatMessage>('/chat/messages/', {
      method: 'POST',
      body: formData,
    })
  }
  
  return fetchApi<ChatMessage>('/chat/messages/', {
    method: 'POST',
    body: JSON.stringify({ 
      receiver: receiverId, 
      content 
    }),
  })
}

// ============================================================================
// Read Status
// ============================================================================

/**
 * Xabarlarni o'qilgan deb belgilaydi
 * 
 * @param userId - Suhbatdosh ID (uning barcha xabarlari o'qilgan bo'ladi)
 * 
 * @example
 * await markChatMessagesAsRead(5)
 */
export async function markChatMessagesAsRead(userId: number | string): Promise<void> {
  return fetchApi<void>(`/chat/messages/${userId}/mark_read/`, {
    method: 'POST',
  })
}

/**
 * O'qilmagan xabarlar sonini oladi
 * 
 * @returns O'qilmagan xabarlar soni
 * 
 * @example
 * const count = await getUnreadChatCount()
 * if (count > 0) showNotification(count)
 */
export async function getUnreadChatCount(): Promise<number> {
  const data = await fetchApi<{ unread: number }>('/chat/unread_count/')
  return data.unread ?? 0
}
