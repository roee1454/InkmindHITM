/**
 * Re-exports from unified staff.ts for backward compatibility.
 * All artist profile data (portfolio, bio, work hours) is now consolidated directly on staff records.
 */
export {
  type WorkingHoursWindow,
  type CurrentStaffInfo,
  type StaffMember,
  type BotArtistMatch,
  type ApiArtistProfile,
  normalizeUrlField,
  getCurrentStaffInfo,
  getStaffList,
  addStaffMember,
  updateStaffMember,
  setStaffPassword,
  getWorkingHoursForStaff,
  getWorkingHours,
  saveWorkingHours,
  suggestArtistsForBot,
  getArtistProfiles,
  saveArtistProfile,
  deleteArtistProfile,
  windowItemSchema,
  addStaffSchema,
  updateStaffSchema,
} from './staff'
