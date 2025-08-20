export type TimezoneOption = { value: string; label: string };
export const AV_TIMEZONES: TimezoneOption[] = [
  // America
  { value: "America/Chicago", label: "America - Chicago" },
  { value: "America/Denver", label: "America - Denver" },
  { value: "America/Los_Angeles", label: "America - Los Angeles" },
  { value: "America/New_York", label: "America - New York" },
  { value: "America/Vancouver", label: "America - Vancouver" },

  // Asia
  { value: "Asia/Ho_Chi_Minh", label: "Asia - Ho Chi Minh" },
  { value: "Asia/Jerusalem", label: "Asia - Jerusalem" },
  { value: "Asia/Kolkata", label: "Asia - Kolkata" },
  { value: "Asia/Seoul", label: "Asia - Seoul" },
  { value: "Asia/Shanghai", label: "Asia - Shanghai" },
  { value: "Asia/Singapore", label: "Asia - Singapore" },
  { value: "Asia/Tehran", label: "Asia - Tehran" },

  // Europe
  { value: "Europe/Amsterdam", label: "Europe - Amsterdam" },
  { value: "Europe/Berlin", label: "Europe - Berlin" },
  { value: "Europe/Bratislava", label: "Europe - Bratislava" },
  { value: "Europe/Bucharest", label: "Europe - Bucharest" },
  { value: "Europe/Copenhagen", label: "Europe - Copenhagen" },
  { value: "Europe/Istanbul", label: "Europe - Istanbul" },
  { value: "Europe/London", label: "Europe - London" },
  { value: "Europe/Madrid", label: "Europe - Madrid" },
  { value: "Europe/Prague", label: "Europe - Prague" },
  { value: "Europe/Rome", label: "Europe - Rome" },
  { value: "Europe/Sarajevo", label: "Europe - Sarajevo" },
  { value: "Europe/Vienna", label: "Europe - Vienna" },
  { value: "Europe/Vilnius", label: "Europe - Vilnius" },
  { value: "Europe/Warsaw", label: "Europe - Warsaw" },
  { value: "Europe/Zurich", label: "Europe - Zurich" },

  // Pacific
  { value: "Pacific/Auckland", label: "Pacific - Auckland" },
];
export default AV_TIMEZONES;
