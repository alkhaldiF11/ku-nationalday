/**
 * Domain error carrying a translatable message key (see `errors.*` in the dictionaries).
 * Thrown by the data layer, caught by server actions and returned to the UI.
 */
export class AppError extends Error {
  constructor(
    public readonly key: ErrorKey,
    public readonly vars: Record<string, string | number> = {},
  ) {
    super(key);
    this.name = "AppError";
  }
}

export type ErrorKey =
  | "invalidInput"
  | "unauthorized"
  | "forbidden"
  | "invalidCredentials"
  | "accountInactive"
  | "tooManyAttempts"
  | "guestNotFound"
  | "guestInactive"
  | "phoneTaken"
  | "usernameTaken"
  | "emailTaken"
  | "studentIdTaken"
  | "invalidPhone"
  | "invalidStudentId"
  | "notUniversityEmail"
  | "tooManyChildren"
  | "registrationPending"
  | "registrationRejected"
  | "registrationNotPending"
  | "attendanceExists"
  | "invalidThresholds"
  | "winnerDuplicate"
  | "wrongPassword"
  | "wonExceedsPlayed"
  | "resultLocked"
  | "noResults"
  | "notEligible"
  | "teddyAlreadyCollected"
  | "drawPending"
  | "drawSettled"
  | "noEntries"
  | "lastAdmin"
  | "cannotChangeSelf"
  | "notFound"
  | "invalidImage"
  | "imageTooLarge"
  | "photoNotPending"
  | "albumExists"
  | "albumNotFound"
  | "albumNotEmpty"
  | "tooManyPending"
  | "unexpected";
