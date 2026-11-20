import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

const KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const LABELS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const ALIASES = {
  sun: ['sun', 'sunday', 'dim', 'dimanche', '0', '7'],
  mon: ['mon', 'monday', 'lun', 'lundi', '1'],
  tue: ['tue', 'tuesday', 'mar', 'mardi', '2'],
  wed: ['wed', 'wednesday', 'mer', 'mercredi', '3'],
  thu: ['thu', 'thursday', 'jeu', 'jeudi', '4'],
  fri: ['fri', 'friday', 'ven', 'vendredi', '5'],
  sat: ['sat', 'saturday', 'sam', 'samedi', '6'],
};

export const MENU_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  .map((key) => ({ key, label: LABELS[KEYS.indexOf(key)] }));

export function menuDayFromKey(key) {
  return MENU_DAYS.find((day) => day.key === key) || getMenuDay();
}

export function getMenuDay(date = new Date()) {
  // Les restaurants de l'application sont au Cameroun (UTC+1).
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Africa/Douala' })
    .format(date).toLowerCase();
  const index = KEYS.indexOf(weekday);
  return { key: KEYS[index], label: LABELS[index] };
}

function scheduleDays(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'string') {
    try { return scheduleDays(JSON.parse(value)); } catch { return value.toLowerCase().split(/[,;|\s]+/).filter(Boolean); }
  }
  if (Array.isArray(value)) return value.flatMap((day) => scheduleDays(day) || []);
  if (typeof value === 'number') return [String(value)];
  if (typeof value === 'object') return Object.entries(value).filter(([, enabled]) => enabled === true || enabled === 1).map(([day]) => day.toLowerCase());
  return null;
}

export function isDishServedToday(item, day = getMenuDay()) {
  const schedule = scheduleDays(item.available_days);
  if (schedule) return schedule.some((value) => ALIASES[day.key].includes(String(value).toLowerCase()));
  if (item.served_today != null) return item.served_today === true || item.served_today === 1 || item.served_today === '1';
  return true;
}

export function isDishScheduledForDay(item, day) {
  const schedule = scheduleDays(item.available_days);
  if (!schedule) return true;
  return schedule.some((value) => ALIASES[day.key].includes(String(value).toLowerCase()));
}

export function isDishFeaturedForDay(item, day, today = getMenuDay()) {
  if (!item.id || !isDishScheduledForDay(item, day)) return false;
  if (day.key === today.key) return isDishOrderableToday(item, today);
  const schedule = scheduleDays(item.available_days);
  // Hors du jour courant, l'API peut mettre is_available à false pour le seul motif du planning.
  return schedule ? true : item.is_available !== false && item.is_available !== 0;
}

export function isDishOrderableToday(item, day = getMenuDay()) {
  return item.is_available !== false && item.is_available !== 0 && isDishServedToday(item, day);
}

export function getDishUnavailableLabel(item, day = getMenuDay()) {
  if (isDishOrderableToday(item, day)) return null;
  const schedule = scheduleDays(item.available_days);
  if (schedule?.length && !isDishServedToday(item, day)) {
    const scheduledKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
      .filter((key) => schedule.some((value) => ALIASES[key].includes(String(value).toLowerCase())));
    const days = scheduledKeys.map((key) => LABELS[KEYS.indexOf(key)]);
    if (days.length === 1) return `Disponible ${days[0]}`;
    if (days.length > 1) return `Disponible ${days.slice(0, -1).join(', ')} et ${days[days.length - 1]}`;
    const backendLabel = String(item.available_days_label || '').trim();
    if (backendLabel) return `Disponible ${backendLabel}`;
  }
  return 'Indisponible';
}

export default function useMenuDay() {
  const [day, setDay] = useState(getMenuDay);
  useEffect(() => {
    const refreshDay = () => {
      const current = getMenuDay();
      setDay((previous) => previous.key === current.key ? previous : current);
    };
    const timer = setInterval(refreshDay, 60000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') refreshDay(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
  return day;
}
