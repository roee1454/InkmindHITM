repo: roee1454/InkmindHITM
branch: main

## Last sync
date: 2026-08-10T16:22:10Z

### Updated in this project
- Full Settings section added: desktop tabs (General, Studio Policy, Team & profile w/ Google Calendar connection, AI Agent, FAQ, Backups) plus a mobile settings menu screen.
- Style-tag picker removed from onboarding step 3 and Settings team/profile — replaced with instagram, portfolio link, website, and bio fields.
- Onboarding flow redesigned: 6 blocking steps cut to 3, rest moved to a non-blocking setup checklist.
- 12 selectable theme palettes; desktop + mobile screens for all core flows.

## Screen map
| Project screen | Repo files |
| --- | --- |
| Login | src/routes/auth/route.tsx, src/routes/auth/login.tsx, src/features/auth/components/LoginForm.tsx, src/components/BrandMark.tsx |
| Dashboard home | src/routes/dashboard/route.tsx, src/routes/dashboard/index.tsx, src/features/dashboard/components/MetricsSummary.tsx, RecentLeadsCard.tsx, CloseAppointmentsCard.tsx, AlertBanners.tsx, src/components/MobileTopBar.tsx, MobileBottomNav.tsx, navigation.ts |
| Customers | src/features/customers/CustomersPage.tsx, components/CustomerCard.tsx, CustomersHeader.tsx, CustomersSummary.tsx |
| Onboarding (current) | src/routes/onboarding/route.tsx, profile.tsx, hours.tsx |
| Onboarding (proposed flow) | src/routes/onboarding/whatsapp.tsx, artist-profile.tsx, team.tsx, calendar.tsx, src/features/onboarding/components/StyleTagSelector.tsx, StaffManager.tsx, src/features/settings/components/ClosuresSection.tsx, src/components/ui/option-card-button.tsx |
| Settings — all tabs | src/features/settings/components/TeamAccessTab.tsx, ArtistProfileEditor.tsx, GoogleCalendarConnection.tsx, GeneralSettingsTab.tsx, StudioPolicyTab.tsx, ClosuresSection.tsx, AiAgentTab.tsx, FaqTab.tsx, BackupSettingsTab.tsx |
| Conversations list | src/features/conversations/components/ConversationList.tsx |
| Chat thread | src/features/conversations/components/MessageBubble.tsx, BookingActionCard.tsx |
| Calendar | src/features/calendar/CalendarPage.tsx, components/CalendarViewToggle.tsx, AppointmentTable.tsx |
| Leads board | src/features/leads/components/LeadsBoardPage.tsx, LeadColumn.tsx, LeadCard.tsx |
| Component specs | src/components/ui/input.tsx, select.tsx, button.tsx, card.tsx, badge.tsx, textarea.tsx, tabs.tsx, switch.tsx, label.tsx |
| Theme + utilities CSS | src/styles.css, src/routes/__root.tsx |
