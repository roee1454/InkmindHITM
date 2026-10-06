/**
 * The artist's estimate of how many sessions a tattoo takes, chosen with its quote. null = not known
 * yet (the customer is told it may take more than one); the bot only ever reads it.
 */
export const SESSION_ESTIMATE_OPTIONS: ReadonlyArray<{ label: string; value: number | null }> = [
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4', value: 4 },
  { label: '5', value: 5 },
  { label: '6', value: 6 },
  { label: '8', value: 8 },
  { label: '10', value: 10 },
  { label: '12+', value: 12 },
  { label: 'לא ידוע', value: null },
]

export const SESSION_ESTIMATE_HINT = 'נשלח ללקוח בהצעה ("העבודה צפויה להתפרס על כ-X מפגשים"), ונשמר בפרויקט. אפשר לעדכן בהמשך בחלון הפרויקט.'
