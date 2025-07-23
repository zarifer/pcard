export interface IEvent {
  id: string;
  title: string;
  date: string;
  type: "warning" | "success" | "error";
}
