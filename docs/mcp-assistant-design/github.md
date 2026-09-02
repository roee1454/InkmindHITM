repo: roee1454/InkmindHITM
branch: main

## Last sync
date: 2026-08-11T21:04:18Z

### Updated in this project
- Full native-mobile redesign: 48/56px controls, 16px input floor, softer radii, OS-style elevation, tactile tap states.
- Four theme palettes (Indigo, Nordic, Obsidian, Terracotta) with light + dark variables, switchable via `data-theme`.
- Onboarding restructured from 6 blocking steps to 3 + a non-blocking setup checklist; style-tag picker removed in favour of artist links + bio.
- Conversation HITL gained duration + price-range quoting, slot confirm, receipt approve, and final confirm blocks.
- Handoff package written to `design_handoff_native_mobile_redesign/` (README, styles.css, file change map, UI primitive classNames, screen specs).

## Screen map
| Project screen | Repo files |
| --- | --- |
| Login | src/routes/auth/route.tsx, login.tsx, src/features/auth/components/LoginForm.tsx, SetupForm.tsx, src/components/BrandMark.tsx |
| Onboarding (proposed 3-step flow) | src/routes/onboarding/route.tsx, profile.tsx, hours.tsx, artist-profile.tsx, whatsapp.tsx, team.tsx, calendar.tsx, src/features/onboarding/components/* , src/features/onboarding/server/onboarding.ts |
| Dashboard home + setup checklist | src/routes/dashboard/route.tsx, index.tsx, src/features/dashboard/components/MetricsSummary.tsx, RecentLeadsCard.tsx, CloseAppointmentsCard.tsx, AlertBanners.tsx, ContinuationListSheet.tsx, src/components/MobileTopBar.tsx, MobileBottomNav.tsx, Sidebar.tsx, AppDrawer.tsx, navigation.ts |
| Customers | src/features/customers/CustomersPage.tsx, components/CustomerCard.tsx, CustomersHeader.tsx, CustomersSummary.tsx, CustomerDialog.tsx |
| Calendar | src/features/calendar/CalendarPage.tsx, components/CalendarViewToggle.tsx, AppointmentTable.tsx, DailyAppointmentCards.tsx, CalendarFilters.tsx, AppointmentFormFields.tsx, ImageGalleryDialog.tsx |
| Leads board | src/features/leads/components/LeadsBoardPage.tsx, LeadColumn.tsx, LeadCard.tsx, LeadsHeader.tsx, LeadsBoardSkeleton.tsx |
| Conversations list + chat thread | src/features/conversations/components/ConversationList.tsx, ConversationThread.tsx, MessageBubble.tsx, BookingActionCard.tsx, ConnectionStatusBanner.tsx, lib/format.ts, lib/media.ts, types.ts |
| Conversation HITL blocks | src/features/conversations/components/sheets/PriceQuoteSheet.tsx, CalendarSlotSheet.tsx, ReceiptVerificationSheet.tsx, FinalBookingLockSheet.tsx, InFeedActionCard.tsx, index.ts, server/state-machine.ts, server/messages.ts, src/integrations/ai/tools/booking.server.ts |
| Notifications | src/routes/dashboard/notifications.tsx, src/features/notifications/server/notifications.ts |
| Settings (mobile menu + 6 sections, desktop 3-pane) | src/routes/dashboard/settings.tsx, src/features/settings/components/TeamAccessTab.tsx, ArtistProfileEditor.tsx, GoogleCalendarConnection.tsx, GeneralSettingsTab.tsx, StudioPolicyTab.tsx, ClosuresSection.tsx, AiAgentTab.tsx, ModelSearchSelect.tsx, FaqTab.tsx, BackupSettingsTab.tsx, store/settingsUiStore.ts, server/profiles.ts, staff.ts |
| UI primitives | src/components/ui/input.tsx, select.tsx, button.tsx, card.tsx, badge.tsx, textarea.tsx, label.tsx, switch.tsx, tabs.tsx, checkbox.tsx, dialog.tsx, sheet.tsx, table.tsx, avatar.tsx, dropdown-menu.tsx, option-card-button.tsx, hour-picker.tsx, date-picker.tsx, calendar.tsx, skeleton.tsx, separator.tsx, popover.tsx, form.tsx, ToastProvider.tsx |
| Theme + tokens | src/styles.css, src/routes/__root.tsx |
| AI prompt / agent surface | src/integrations/ai/prompts.ts, prompts.test.ts, tools/artist.server.ts, tools/booking.server.ts |
