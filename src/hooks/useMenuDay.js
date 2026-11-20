import { useEffect, useState } from 'react';

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

export function isDishOrderableToday(item, day = getMenuDay()) {
  return item.is_available !== false && item.is_available !== 0 && isDishServedToday(item, day);
}

export default function useMenuDay() {
  const [day, setDay] = useState(getMenuDay);
  useEffect(() => {
    const timer = setInterval(() => {
      const current = getMenuDay();
      setDay((previous) => previous.key === current.key ? previous : current);
    }, 60000);
    return () => clearInterval(timer);
  }, []);
  return day;
}
