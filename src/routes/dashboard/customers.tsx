import { createFileRoute } from '@tanstack/react-router'
import { CustomersPage } from '@/features/customers/CustomersPage'

export const Route = createFileRoute('/dashboard/customers')({
  component: CustomersPage,
})
