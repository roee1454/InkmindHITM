import { useEffect, useState, useCallback } from 'react'
import {
  isWebPushSupported,
  isIosDevice,
  isStandalonePwa,
  getCurrentPushSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from '../utils/web-push'
import { sendTestPushNotification } from '../server/web-push'
import { useIMToast } from '@/components/ui/toast'
import type { NotificationPermissionState } from '../types'

export function useWebPushNotifications() {
  const { show: toast } = useIMToast()
  const [permission, setPermission] = useState<NotificationPermissionState>('unsupported')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  const isIos = isIosDevice()
  const isStandalone = isStandalonePwa()
  const isIosNotStandalone = isIos && !isStandalone

  const checkStatus = useCallback(async () => {
    if (!isWebPushSupported()) {
      setPermission('unsupported')
      setIsSubscribed(false)
      return
    }

    setPermission(Notification.permission)
    const sub = await getCurrentPushSubscription()
    setIsSubscribed(Boolean(sub))
  }, [])

  useEffect(() => {
    void checkStatus()
  }, [checkStatus])

  const enableNotifications = async () => {
    if (isIosNotStandalone) {
      toast({
        tone: 'warning',
        title: 'ב-iPhone נדרשת התקנה',
        description: 'לחץ על כפתור השיתוף בספארי (ריבוע עם חץ) ובחר "הוסף למסך הבית".',
        duration: 6000,
      })
      return
    }

    setIsLoading(true)
    try {
      const res = await subscribeToPush()
      await checkStatus()

      if (res.success) {
        toast({
          tone: 'success',
          title: 'התראות Push הופעלו בהצלחה!',
          description: 'מעכשיו תקבל התראות למכשיר גם כשהאפליקציה והמסך סגורים.',
          duration: 4000,
        })
      } else {
        toast({
          tone: 'destructive',
          title: 'הפעלת התראות נכשלה',
          description: res.error || 'נסה שוב בעוד מספר רגעים.',
          duration: 5000,
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const disableNotifications = async () => {
    setIsLoading(true)
    try {
      await unsubscribeFromPush()
      await checkStatus()
      toast({
        tone: 'default',
        title: 'התראות Push בוטלו',
        description: 'מכשיר זה לא יקבל יותר התראות כשהאפליקציה סגורה.',
        duration: 3000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const sendTest = async () => {
    setIsTesting(true)
    try {
      const res = await sendTestPushNotification()
      if (res.sent > 0) {
        toast({
          tone: 'success',
          title: 'התראת בדיקה נשלחה! 🚀',
          description: 'בדוק את מסך הנעילה או מרכז העדכונים של המכשיר שלך.',
          duration: 4000,
        })
      } else {
        toast({
          tone: 'warning',
          title: 'לא נמצאו מנויים רשומים',
          description: 'ודא שהפעלת את ההתראות במכשיר זה תחילה.',
          duration: 5000,
        })
      }
    } catch {
      toast({
        tone: 'destructive',
        title: 'שליחת התראת בדיקה נכשלה',
        description: 'ודא שחיבור הרשת תקין ונסה שוב.',
        duration: 4000,
      })
    } finally {
      setIsTesting(false)
    }
  }

  return {
    permission,
    isSubscribed,
    isLoading,
    isTesting,
    isIosNotStandalone,
    enableNotifications,
    disableNotifications,
    sendTestNotification: sendTest,
  }
}
