import { useMutation } from '@tanstack/react-query'
import { acceptStaffInvite } from '../server/invite'
import { saveArtistProfile, saveWorkingHours } from '@/features/settings/server/settings'
import { useInviteUiStore } from '../store/inviteUiStore'

export function useInviteMutations() {
  const token = useInviteUiStore((s) => s.token)
  const staffId = useInviteUiStore((s) => s.staffId)
  const password = useInviteUiStore((s) => s.password)
  const passwordConfirm = useInviteUiStore((s) => s.passwordConfirm)
  const phone = useInviteUiStore((s) => s.phone)
  const portfolioUrl = useInviteUiStore((s) => s.portfolioUrl)
  const bio = useInviteUiStore((s) => s.bio)
  const windows = useInviteUiStore((s) => s.windows)

  const setStaffId = useInviteUiStore((s) => s.setStaffId)
  const setCurrentStep = useInviteUiStore((s) => s.setCurrentStep)
  const setStep1RootError = useInviteUiStore((s) => s.setStep1RootError)
  const setProfileError = useInviteUiStore((s) => s.setProfileError)
  const setHoursError = useInviteUiStore((s) => s.setHoursError)

  const acceptInviteMutation = useMutation({
    mutationFn: () =>
      acceptStaffInvite({
        data: {
          token,
          password,
          passwordConfirm,
          phone,
        },
      }),
    onSuccess: (res) => {
      setStaffId(res.staffId)
      setCurrentStep(2)
    },
    onError: (err: Error) => setStep1RootError(err.message),
  })

  const saveProfileMutation = useMutation({
    mutationFn: () =>
      saveArtistProfile({
        data: {
          staffId,
          portfolioUrl: portfolioUrl.trim(),
          bio: bio.trim() || undefined,
        },
      }),
    onSuccess: () => {
      setProfileError(null)
      setCurrentStep(3)
    },
    onError: (err: Error) => setProfileError(err.message),
  })

  const saveHoursMutation = useMutation({
    mutationFn: () => {
      if (windows.length === 0) throw new Error('יש לבחור לפחות יום עבודה אחד פעיל')
      return saveWorkingHours({
        data: {
          staffId,
          windows,
        },
      })
    },
    onSuccess: () => setCurrentStep(4),
    onError: (err: Error) => setHoursError(err.message),
  })

  return {
    acceptInviteMutation,
    saveProfileMutation,
    saveHoursMutation,
  }
}

