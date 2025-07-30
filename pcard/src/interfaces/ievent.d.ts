export interface IEvent {
  id: string;
  title: string;
  description?: string;
  date: string | string[];
  endDate?: string;
  type: string;
  participants?: string | string[];
  multi?: boolean;
}
