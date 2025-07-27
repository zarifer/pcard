export interface IEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  type: string;
  participants?: string[];
}
