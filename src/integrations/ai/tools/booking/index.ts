import type { ToolFactoryContext } from '../types'
import { buildAvailabilityTools } from './availability.server'
import { buildBookingCreationTools } from './creation.server'
import { buildCancellationTools } from './cancellation.server'
import { buildWaitlistTools } from './waitlist.server'

export function buildBookingTools(ctx: ToolFactoryContext) {
  return {
    ...buildAvailabilityTools(ctx),
    ...buildBookingCreationTools(ctx),
    ...buildCancellationTools(ctx),
    ...buildWaitlistTools(ctx),
  }
}
