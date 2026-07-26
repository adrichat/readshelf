// Nom de l'event DOM utilisé pour prévenir AchievementsProvider qu'une action
// vient peut-être de débloquer un succès (ajout de livre, changement de statut…),
// sans attendre la prochaine navigation.
export const ACHIEVEMENTS_CHECK_EVENT = "readshelf:achievements-check"

export function triggerAchievementsCheck() {
  window.dispatchEvent(new Event(ACHIEVEMENTS_CHECK_EVENT))
}
