import PocketBase, { ClientResponseError } from 'pocketbase'
import type { RecordModel } from 'pocketbase'
import { inject } from 'vitest'

/** Superuser SDK client for the throwaway integration PocketBase (see setup/pocketbase.global-setup.ts). */
export async function superuserClient(): Promise<PocketBase> {
  const { url, email, password } = inject('pocketbase')
  const pb = new PocketBase(url)
  pb.autoCancellation(false)
  await pb.collection('_superusers').authWithPassword(email, password)
  return pb
}

let sequence = 0
function nextSuffix(): string {
  sequence += 1
  return `${Date.now().toString(36)}${sequence}`
}

export function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
}

export async function createStaff(pb: PocketBase, overrides: Record<string, unknown> = {}): Promise<RecordModel> {
  const suffix = nextSuffix()
  return pb.collection('staff').create({
    email: `staff-${suffix}@inkmind.test`,
    password: 'staff-password-123',
    passwordConfirm: 'staff-password-123',
    role: 'staff',
    name: `Artist ${suffix}`,
    ...overrides,
  })
}

export async function createCustomer(pb: PocketBase, overrides: Record<string, unknown> = {}): Promise<RecordModel> {
  sequence += 1
  const phone = `+97250${String(Date.now() % 100_000).padStart(5, '0')}${String(sequence).padStart(3, '0')}`
  return pb.collection('customers').create({ phone, name: `Customer ${nextSuffix()}`, ...overrides })
}

export async function createConversation(
  pb: PocketBase,
  customerId: string,
  options: { messageBodies?: string[]; assignedStaff?: string; senderStaff?: string } = {},
): Promise<{ conversation: RecordModel; messages: RecordModel[] }> {
  const conversation = await pb.collection('conversations').create({
    customer: customerId,
    // First contact, the way the WhatsApp webhook creates it.
    state: 'NEW',
    status: 'bot_active',
    assigned_staff: options.assignedStaff ?? '',
  })
  const messages: RecordModel[] = []
  for (const body of options.messageBodies ?? []) {
    messages.push(
      await pb.collection('messages').create({
        conversation: conversation.id,
        whatsapp_message_id: `wamid.${nextSuffix()}`,
        direction: options.senderStaff ? 'outbound' : 'inbound',
        sender_type: options.senderStaff ? 'staff' : 'customer',
        sender_staff: options.senderStaff ?? '',
        type: 'text',
        body,
        timestamp: new Date().toISOString(),
      }),
    )
  }
  return { conversation, messages }
}

export async function createAppointment(
  pb: PocketBase,
  input: { customer: string; staff?: string; startsInHours: number; status: string; googleEventId?: string },
): Promise<RecordModel> {
  return pb.collection('appointments').create({
    customer: input.customer,
    staff: input.staff ?? '',
    start_time: hoursFromNow(input.startsInHours),
    duration_minutes: 120,
    status: input.status,
    google_event_id: input.googleEventId ?? '',
  })
}

export async function createPayment(
  pb: PocketBase,
  input: { project: string; status?: string; kind?: string; amount?: number },
): Promise<RecordModel> {
  return pb.collection('payments').create({
    project: input.project,
    kind: input.kind ?? 'deposit',
    method: 'bit',
    amount: input.amount ?? 300,
    status: input.status ?? 'verified',
  })
}

export async function createWaitlistEntry(
  pb: PocketBase,
  input: { customer: string; currentAppointment?: string; offeredAppointment?: string; status: string; preferredStaff?: string },
): Promise<RecordModel> {
  return pb.collection('waitlist_entries').create({
    customer: input.customer,
    current_appointment: input.currentAppointment ?? '',
    offered_appointment: input.offeredAppointment ?? '',
    preferred_staff: input.preferredStaff ?? '',
    status: input.status,
    source: 'staff_manual',
  })
}

export async function exists(pb: PocketBase, collection: string, id: string): Promise<boolean> {
  try {
    await pb.collection(collection).getOne(id)
    return true
  } catch (err) {
    if (err instanceof ClientResponseError && err.status === 404) return false
    throw err
  }
}

export async function outboxRowsForAppointment(pb: PocketBase, appointmentId: string): Promise<RecordModel[]> {
  return pb.collection('integration_outbox').getFullList({
    filter: pb.filter('payload.appointmentId = {:id}', { id: appointmentId }),
  })
}

/** Deletes and returns the rejection (or null when the delete went through). */
export async function tryDelete(pb: PocketBase, collection: string, id: string): Promise<ClientResponseError | null> {
  try {
    await pb.collection(collection).delete(id)
    return null
  } catch (err) {
    if (err instanceof ClientResponseError) return err
    throw err
  }
}
